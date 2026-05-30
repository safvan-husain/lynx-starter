mod counter;
mod identity;

pub use counter::{decrement_counter, increment_counter, reset_counter};
pub use identity::{UserRole, login, logout, register};

use spacetimedb::{ReducerContext, reducer};

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    counter::ensure_counter_initialized(ctx);
    identity::seed_dev_users(ctx);
}

#[reducer(client_connected)]
fn client_connected(_ctx: &ReducerContext) {}
