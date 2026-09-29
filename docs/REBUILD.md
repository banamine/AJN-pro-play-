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

## Current phase

Phase 2 establishes the playback-engine boundary before the greenfield UI/player rebuild. The controller contract and preservation hooks are in place; application integration remains controlled and must preserve existing HLS tuning, resume behavior, custom request headers, recovery, and proxy fallback.

See `docs/PHASE-2-PLAYBACK-CORE.md` for scope, findings, and gates.
