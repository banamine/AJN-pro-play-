# AJN Professional Player — Greenfield Rebuild

## Baseline

The rebuild starts from the existing application on `main`, but runtime infrastructure is repaired first.

## Phase 0 gates

1. Node 22 contract is explicit.
2. Server honors `PORT`.
3. Production startup does not require Vite at runtime.
4. Express trusts the Cloud Run reverse proxy.
5. A real startup/API smoke test exists.
6. CI executes lint -> pure-regressions -> integration.
7. Legacy Jekyll Pages deployment is removed from the application path.

## Next phase

Phase 1 establishes explicit runtime boundaries before the greenfield UI/player rebuild.

See `docs/PHASE-1-RUNTIME-BOUNDARIES.md` for scope and gates.
