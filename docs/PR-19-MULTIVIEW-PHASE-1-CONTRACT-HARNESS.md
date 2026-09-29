# PR 19 — MultiView Phase 1 Contract Harness

## Scope

AJN-pro-play- only. This phase is contract/state work for the unbuilt MultiView subsystem. It does not modify the built AJN Precision Engineering application.

## Admission contract

Source type is resolved upstream and supplied to MultiView as one of:

- `hls`
- `mp4`
- `audio`
- `iframe`

MultiView does not sniff URLs at render time.

Admission is a pure function:

`evaluateAdmission(panels, sources, focusedTileId, limits) -> TileResourcePolicy[]`

Rules:

1. Empty tiles consume nothing.
2. The focused tile is considered first and counts against every applicable budget.
3. Remaining enabled tiles are admitted in stable pattern order until decoder, media-pipeline, or iframe limits are reached.
4. Audio-only sources consume a media pipeline but no video decoder.
5. `hasVideoTrack: "unknown"` is conservative and consumes a decoder.
6. Iframes may be rejected when marked `unmanagedBandwidth` and are capped independently.
7. Non-admitted tiles are poster standby; the media element/source is not created by the eventual runtime until admission.
8. Stagger delays are assigned only to admitted, non-focused tiles.

The default policy is conservative: two active video decoders, two active media pipelines, and one concurrent iframe.

## Resource dimensions

Decoder capacity and media-pipeline capacity are separate. Audio-only playback is not treated as zero-resource; it is zero decoder cost only.

Iframe concurrency is separately capped because iframe embeds may carry substantial JS/memory cost beyond decoder usage.

## Source identity

`sourceUrl` is the canonical source field for the MultiView contract, including iframe embed URLs. There is no separate `streamUrl`/ `embedUrl` ambiguity inside the contract.

## Focus and modal interaction

The mock harness uses stable `TileId` identity.

- GRID: D-pad changes the focused tile.
- Enter: opens Quick-Change context.
- QUICK_CHANGE_MENU / PATTERN_MENU: vertical D-pad navigation is consumed by the menu and stopped from reaching the grid.
- Escape / Back: returns to GRID.

## Deliberately deferred

The following require real browser/media-runtime integration and remain outside the zero-decoder Phase 1 harness:

- actual HLS.js startup queue and cancellation
- exact teardown ordering for real media elements
- tile circuit breakers and retry execution
- native PiP ownership
- `navigator.mediaSession` runtime binding
- provider-specific iframe audio control
- HTTP/2/origin connection behavior
- hardware/browser capability probing
- Primary Player tune transaction and live/VOD position semantics

These are Phase 2 runtime gates, not assumed capabilities of the mock contract.

## Gate

Phase 1 is complete only when lint, build, existing regressions, and MultiView admission/navigation tests are green. Browser testing remains required before live media is attached.
