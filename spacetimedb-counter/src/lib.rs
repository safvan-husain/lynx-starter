mod counter;
mod identity;

pub use counter::{decrement_counter, increment_counter, reset_counter};
pub use identity::{login, logout, register, UserRole};

use spacetimedb::{reducer, ReducerContext};

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    counter::ensure_counter_initialized(ctx);
    identity::seed_dev_users(ctx);
}

#[reducer(client_connected)]
fn client_connected(_ctx: &ReducerContext) {}
