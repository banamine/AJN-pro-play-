# PR 19 — MultiView Phase 1 Contract Harness

## Scope

Phase 1 implements the MultiView state, resource-policy, audio-arbitration, and spatial-navigation contracts without attaching live HLS or video decoders.

## Hard boundaries

- No Hls.js instances are created by the Phase 1 harness.
- No live video elements are created by the mock grid.
- Resource admission is declarative; tile lifecycle code will consume the resulting policy in a later phase.
- Focus is stable by TileId rather than DOM position.
- Quick-Change menu owns directional navigation while open and stops propagation.
- Audio arbitration exposes one active audio tile and an optional explicit lock.

## Contracts delivered

1. `useMultiViewManager` — four bounded tile configurations, pattern loading, and channel assignment.
2. `useResourceGovernor` — priority tier and admission policy calculation.
3. `useAudioArbitrator` — single active audio ownership with optional lock.
4. `useSpatialNavigation` — 2x2 D-pad navigation and modal focus zones.
5. `MultiViewMockGrid` — keyboard/remote contract harness with ARIA labels and live announcements.

## Resource policy

The governor does not claim to detect physical decoder counts. `maxActiveDecoders` is an effective policy supplied by configuration/device policy. Focused content receives Tier 1; admitted background content receives Tier 2; remaining panels receive Tier 3 standby/poster policy.

## Deferred to Phase 2

- HLS.js lifecycle integration.
- Actual startup queue and cancellation tokens.
- HLS teardown ordering.
- Per-tile circuit breakers and retry execution.
- Native PiP ownership.
- `navigator.mediaSession` ownership.
- Audio/Web Audio visualizer integration.
- Primary Player handoff transaction.
- Runtime hardware/browser capability probing.

## Gate

Phase 1 is complete only when lint, build, the existing regression suite, and the new MultiView contract tests are green. Browser interaction testing remains required for remote/keyboard behavior before attaching live media.