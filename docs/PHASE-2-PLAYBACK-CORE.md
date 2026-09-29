# Phase 2 — Playback Core Boundary

## Objective
Extract the media-engine boundary from the monolithic `src/App.tsx` without changing the existing UI, archive, IPTV, export, or audio-deck behavior.

## Audit findings
- `src/App.tsx` currently owns playback state (`currentUrl`, `currentTitle`, `playerStatus`), the video element ref, HLS instance ref, source classification, HLS construction, HLS events, native-media loading, playback controls, resume-position persistence, and proxy fallback.
- Current player paths are Rumble embed bypass, HLS.js, native HTML5 playback, archive episodes through `playStream()`, and stream-proxy fallback through `playStream()`.
- Phase 1 added a reusable HLS teardown helper, but `App.tsx` still owns HLS construction and event handling.
- Existing HLS callbacks capture the selected source/application state, so the controller uses an explicit generation token to prevent retired engines from mutating active playback state.
- The Sirius/audio deck is outside this phase and remains independently owned by the existing native `<audio>` path.

## Phase 2 boundary
`src/playback/playback-controller.ts` is the new media-engine boundary.

The controller owns:
- active media generation;
- source classification (`hls`, `native`, `rumble`);
- HLS instance creation and teardown;
- native media source mounting;
- play/pause/stop/destroy operations;
- playback state snapshots;
- stale callback suppression;
- HLS fatal/non-fatal error reporting.

`src/App.tsx` remains responsible for UI rendering and React state, archive/IPTV selection and ordering, playback history, resume-position persistence, proxy fallback policy, Rumble iframe rendering, Sirius/audio deck, layout/controls, and export functionality.

## Explicit non-goals
- No visual redesign.
- No deletion of existing media features.
- No replacement of archive/IPTV ingestion.
- No change to proxy behavior.
- No package-lock generation.
- No production deployment.

## Gates
Phase 2 is green only when the controller typechecks; contract tests pass; replacement tears down the prior HLS engine before the next; stale callbacks cannot change active state; active fatal HLS errors surface; native playback is exercised; destroy is idempotent; and the existing application build and regression suite remain green.

## Follow-up
The controller is a contract extraction first. Full `App.tsx` integration must preserve the existing HLS tuning, custom headers, resume handling, and proxy fallback rather than replacing them with a reduced configuration.
