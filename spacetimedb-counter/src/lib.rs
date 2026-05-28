use spacetimedb::{reducer, table, ReducerContext, Table};

#[table(public, accessor = counter)]
struct Counter {
    #[primary_key]
    id: u32,
    count: i32,
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

#[reducer(init)]
fn init(ctx: &ReducerContext) {
    if ctx.db.counter().id().find(0).is_none() {
        set_counter(ctx, 0);
    }
}

#[reducer]
fn increment_counter(ctx: &ReducerContext) {
    let next_count = ctx.db.counter().id().find(0).map_or(1, |counter| counter.count + 1);
    set_counter(ctx, next_count);
}

#[reducer]
fn decrement_counter(ctx: &ReducerContext) {
    let next_count = ctx
        .db
        .counter()
        .id()
        .find(0)
        .map_or(-1, |counter| counter.count - 1);
    set_counter(ctx, next_count);
}
