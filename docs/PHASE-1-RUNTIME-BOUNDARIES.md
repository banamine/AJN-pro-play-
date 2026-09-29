# Phase 1 — Runtime Boundary Audit

## Objective

Establish explicit boundaries between the HTTP runtime, media proxying, frontend state, and playback engine before the greenfield UI/player rebuild.

## Verified current boundaries

- `server.ts` owns Express startup, RSS proxying, stream proxying, and production static serving.
- `src/App.tsx` currently owns substantial UI state, playback state, HLS lifecycle, archive state, IPTV state, export state, and audio-deck behavior.
- `vite.config.ts` is build/development configuration only.
- Production server startup dynamically imports Vite only outside production mode.

## Phase 1 scope

1. Define a small typed server API surface for health/readiness and media proxy validation.
2. Isolate stream-proxy URL validation from upstream fetching.
3. Preserve existing route behavior while adding deterministic contract tests.
4. Establish a playback lifecycle boundary in the frontend without changing visual behavior.
5. Record explicit ownership and teardown rules.
6. Keep legacy media features operational until each is independently verified.

## Non-goals

- No wholesale UI rewrite.
- No deletion of IPTV/archive/audio features.
- No production deployment.
- No database or authentication implementation.

## Gate

Phase 1 is green only when:

- Typecheck passes.
- Build passes.
- Existing regression tests pass.
- New API contract tests pass.
- Stream URL validation is deterministic and fail-closed.
- Playback teardown rules are documented and tested at the module boundary.
