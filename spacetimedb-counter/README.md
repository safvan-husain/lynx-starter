# lynx-counter SpacetimeDB module

## Dev users (seeded on first init)

| Username | Password   | Role    |
|----------|------------|---------|
| admin    | admin123   | Admin   |
| teacher  | teacher123 | Teacher |
| student  | student123 | Student |
| parent   | parent123  | Parent  |

Passwords are hashed with BLAKE3 in-module (dev-oriented; use OIDC for production).

## RBAC

- **student / parent**: view counter (read via SQL/subscription)
- **teacher / admin**: increment and decrement
- **admin**: reset counter, register new users
