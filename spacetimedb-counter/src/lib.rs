use spacetimedb::{reducer, table, Identity, ReducerContext, SpacetimeType, Table, Timestamp};

const MAX_LOGIN_ATTEMPTS: u32 = 8;
const LOGIN_WINDOW_MICROS: i64 = 60 * 1_000_000; // 60 seconds

#[derive(Clone, Copy, PartialEq, Eq, SpacetimeType)]
pub enum UserRole {
    Student,
    Parent,
    Teacher,
    Admin,
}

#[table(public, accessor = counter)]
struct Counter {
    #[primary_key]
    id: u32,
    count: i32,
}

#[table(public, accessor = app_user)]
struct AppUser {
    #[primary_key]
    #[auto_inc]
    user_id: u32,
    #[unique]
    username: String,
    password_hash: String,
    role: UserRole,
    created_at: Timestamp,
}

#[table(public, accessor = auth_session)]
struct AuthSession {
    #[primary_key]
    identity: Identity,
    user_id: u32,
    logged_in_at: Timestamp,
}

#[table(public, accessor = login_attempt)]
struct LoginAttempt {
    #[primary_key]
    identity: Identity,
    attempt_count: u32,
    window_started_at: Timestamp,
}

fn hash_password(password: &str) -> String {
    let hash = blake3::hash(password.as_bytes());
    format!("blake3:{}", hash.to_hex())
}

fn verify_password(password: &str, password_hash: &str) -> bool {
    let expected = hash_password(password);
    constant_time_eq(expected.as_bytes(), password_hash.as_bytes())
}

fn constant_time_eq(left: &[u8], right: &[u8]) -> bool {
    if left.len() != right.len() {
        return false;
    }
    let mut diff = 0u8;
    for (a, b) in left.iter().zip(right.iter()) {
        diff |= a ^ b;
    }
    diff == 0
}

fn find_user_by_username(ctx: &ReducerContext, username: &str) -> Option<AppUser> {
    let normalized = username.trim().to_lowercase();
    ctx.db
        .app_user()
        .iter()
        .find(|user| user.username.eq_ignore_ascii_case(&normalized))
}

fn require_auth(ctx: &ReducerContext) -> Result<AppUser, String> {
    let session = ctx
        .db
        .auth_session()
        .identity()
        .find(ctx.sender())
        .ok_or("Not signed in.")?;

    ctx.db
        .app_user()
        .user_id()
        .find(session.user_id)
        .ok_or_else(|| "Signed-in user record not found.".to_string())
}

fn require_role(ctx: &ReducerContext, allowed: &[UserRole]) -> Result<AppUser, String> {
    let user = require_auth(ctx)?;
    if allowed.contains(&user.role) {
        Ok(user)
    } else {
        Err("You do not have permission to perform this action.".to_string())
    }
}

fn check_login_rate_limit(ctx: &ReducerContext) -> Result<(), String> {
    let now = ctx.timestamp;
    if let Some(mut attempt) = ctx.db.login_attempt().identity().find(ctx.sender()) {
        let elapsed = now.to_micros_since_unix_epoch()
            - attempt.window_started_at.to_micros_since_unix_epoch();
        if elapsed > LOGIN_WINDOW_MICROS {
            attempt.attempt_count = 0;
            attempt.window_started_at = now;
        }
        if attempt.attempt_count >= MAX_LOGIN_ATTEMPTS {
            return Err("Too many login attempts. Try again in a minute.".to_string());
        }
        attempt.attempt_count += 1;
        ctx.db.login_attempt().identity().update(attempt);
        return Ok(());
    }

    ctx.db.login_attempt().insert(LoginAttempt {
        identity: ctx.sender(),
        attempt_count: 1,
        window_started_at: now,
    });
    Ok(())
}

fn clear_login_rate_limit(ctx: &ReducerContext) {
    if let Some(attempt) = ctx.db.login_attempt().identity().find(ctx.sender()) {
        ctx.db.login_attempt().identity().delete(attempt.identity);
    }
}

fn set_counter(ctx: &ReducerContext, next_count: i32) {
    if let Some(mut counter) = ctx.db.counter().id().find(0) {
        counter.count = next_count;
        ctx.db.counter().id().update(counter);
    } else {
        ctx.db.counter().insert(Counter {
            id: 0,
            count: next_count,
        });
    }
}

fn seed_dev_users(ctx: &ReducerContext) {
    if ctx.db.app_user().iter().next().is_some() {
        return;
    }

    let now = ctx.timestamp;
    let seeds = [
        ("admin", "admin123", UserRole::Admin),
        ("teacher", "teacher123", UserRole::Teacher),
        ("student", "student123", UserRole::Student),
        ("parent", "parent123", UserRole::Parent),
    ];

    for (username, password, role) in seeds {
        ctx.db.app_user().insert(AppUser {
            user_id: 0,
            username: username.to_string(),
            password_hash: hash_password(password),
            role,
            created_at: now,
        });
    }
}

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    if ctx.db.counter().id().find(0).is_none() {
        set_counter(ctx, 0);
    }
    let _ = seed_dev_users(ctx);
}

#[reducer(client_connected)]
fn client_connected(_ctx: &ReducerContext) {}

#[reducer]
pub fn register(
    ctx: &ReducerContext,
    username: String,
    password: String,
    role: UserRole,
) -> Result<(), String> {
    let username = username.trim();
    if username.len() < 3 {
        return Err("Username must be at least 3 characters.".to_string());
    }
    if password.len() < 6 {
        return Err("Password must be at least 6 characters.".to_string());
    }

    if find_user_by_username(ctx, username).is_some() {
        return Err("Username is already taken.".to_string());
    }

    // Self-service registration is allowed for non-admin roles.
    if role == UserRole::Admin {
        require_role(ctx, &[UserRole::Admin])?;
    }

    ctx.db.app_user().insert(AppUser {
        user_id: 0,
        username: username.to_lowercase(),
        password_hash: hash_password(&password),
        role,
        created_at: ctx.timestamp,
    });

    Ok(())
}

#[reducer]
pub fn login(ctx: &ReducerContext, username: String, password: String) -> Result<(), String> {
    check_login_rate_limit(ctx)?;

    let username = username.trim();
    let user = find_user_by_username(ctx, username)
        .ok_or_else(|| "Invalid username or password.".to_string())?;

    if !verify_password(&password, &user.password_hash) {
        return Err("Invalid username or password.".to_string());
    }

    clear_login_rate_limit(ctx);

    let session = AuthSession {
        identity: ctx.sender(),
        user_id: user.user_id,
        logged_in_at: ctx.timestamp,
    };

    if ctx.db.auth_session().identity().find(ctx.sender()).is_some() {
        ctx.db.auth_session().identity().update(session);
    } else {
        ctx.db.auth_session().insert(session);
    }

    Ok(())
}

#[reducer]
pub fn logout(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(session) = ctx.db.auth_session().identity().find(ctx.sender()) {
        ctx.db.auth_session().identity().delete(session.identity);
    }
    Ok(())
}

#[reducer]
pub fn increment_counter(ctx: &ReducerContext) -> Result<(), String> {
    require_role(ctx, &[UserRole::Teacher, UserRole::Admin])?;
    let next_count = ctx
        .db
        .counter()
        .id()
        .find(0)
        .map_or(1, |counter| counter.count + 1);
    set_counter(ctx, next_count);
    Ok(())
}

#[reducer]
pub fn decrement_counter(ctx: &ReducerContext) -> Result<(), String> {
    require_role(ctx, &[UserRole::Teacher, UserRole::Admin])?;
    let next_count = ctx
        .db
        .counter()
        .id()
        .find(0)
        .map_or(-1, |counter| counter.count - 1);
    set_counter(ctx, next_count);
    Ok(())
}

#[reducer]
pub fn reset_counter(ctx: &ReducerContext) -> Result<(), String> {
    require_role(ctx, &[UserRole::Admin])?;
    set_counter(ctx, 0);
    Ok(())
}
