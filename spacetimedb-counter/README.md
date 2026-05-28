# spacetimedb-counter

Standalone SpacetimeDB module for the Lynx counter app.

## Local publish

```bash
spacetime publish lynx-counter \
  --server http://127.0.0.1:3000 \
  --module-path /Users/safvanhusain/code/mine/lynx-demo/spacetimedb-counter \
  --yes
```

## What it exposes

- table `counter`
- reducer `increment_counter`
- reducer `decrement_counter`
