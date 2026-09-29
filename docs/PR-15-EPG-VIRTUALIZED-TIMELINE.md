# PR #15 — EPG Virtualized Timeline

## Scope

This phase adds a presentational EPG timeline over the normalized `EpgChannelSchedule` contract from PR #13. It does not create a second scheduler, mutate schedules, or reinterpret Rumble adapter output.

## Execution guards

1. **Window clamping:** `endTime: null` is clamped to `windowEndEpoch` before CSS geometry is calculated. Program width and position are finite and non-negative.
2. **Isolated Now indicator:** the scrubber owns its animation loop and updates its DOM transform directly. The coarse timeline window is passed to rows; no parent `now` state drives the grid.
3. **Dual-axis rendering:** channel rows use fixed-height clipping/overscan; program tiles are filtered to the requested time window before rendering.
4. **Selection contract:** tile selection emits `channelId`, the normalized `EpgProgram`, `isCurrentlyLive`, and a pre-resolved `sourceMetadata.embedUrl` when present.

## Rumble integration seam

`EpgContainer` is transport-agnostic. It emits `EpgProgramSelectEvent`; the owning station/controller is responsible for immediate tuning of a live selection and preview-only handling of standby selections. No browser component imports the server-side Rumble RSS gateway or circuit-breaker engine.

The existing `RumbleTVStationView` remains the player/station owner. This phase does not fabricate a client-side sync provider or silently replace its existing channel-selection path.

## Validation

Pure timeline geometry tests cover unbounded live clamping, window clipping, intersection filtering, and non-negative width. TypeScript compilation is the integration gate for the React components.
