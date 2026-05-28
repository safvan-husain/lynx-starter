use spacetimedb::{reducer, table, ReducerContext, Table};

use crate::identity::{require_role, UserRole};

#[table(public, accessor = counter)]
struct Counter {
    #[primary_key]
    id: u32,
    count: i32,
}

pub(crate) fn ensure_counter_initialized(ctx: &ReducerContext) {
    if ctx.db.counter().id().find(0).is_none() {
        set_counter(ctx, 0);
    }
}

pub(crate) fn set_counter(ctx: &ReducerContext, next_count: i32) {
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
