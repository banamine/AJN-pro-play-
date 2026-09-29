# Rumble Integration — AJN Professional Player

## Purpose

Rumble is a distinct playback path in the AJN Professional Player. The application does not treat a Rumble page URL as an MP4, WebM, or HLS media URL. It recognizes the Rumble source and renders a Rumble-hosted player inside an HTML iframe.

The architectural boundary is:

AJN application → Rumble iframe → Rumble-hosted player/media

rather than:

AJN application → fetch Rumble media → HTML5 video

## What the function does

When a selected source is a Rumble URL:

1. AJN stores the URL as the current source.
2. Rumble detection identifies the URL.
3. The source is classified as rumble.
4. The normal HLS/native video engine is not used for that source.
5. AJN converts a recognizable Rumble video URL to an embed URL.
6. AJN renders the embed in the main player surface.
7. Rumble's own player retrieves and plays the media.
8. Selecting another source returns the application to the HLS/native playback path.

## Why Rumble is separate

The application supports:

- HLS .m3u8 through HLS.js.
- Native browser media such as MP4/WebM.
- Rumble through an external embed.
- Server stream-proxy fallback for direct streams requiring proxying.

A Rumble page URL is not assumed to be a direct media resource. Keeping Rumble separate prevents the playback controller from attempting to load a webpage as if it were a media file.

## Where it is implemented

### src/App.tsx

The App owns:

- isRumbleUrl()
- getRumbleEmbedUrl()
- Rumble iframe rendering
- surrounding player UI
- source selection and React state

Rumble detection currently checks whether the lower-cased URL contains rumble.com/.

The standard viewer renders an iframe with id rumble-embed-node and supplies:

- src = getRumbleEmbedUrl(currentUrl)
- allowFullScreen
- allow = autoplay; encrypted-media; picture-in-picture

### src/playback/playback-controller.ts

The controller source model includes:

hls | native | rumble

Rumble is recognized by the controller's source classification. When the controller receives a Rumble source it does not mount HLS and does not assign the Rumble URL to the normal HTML5 video element.

The controller marks the Rumble path active; the App remains responsible for actually rendering the Rumble iframe.

### docs/PHASE-2-PLAYBACK-CORE.md

Phase 2 explicitly keeps Rumble iframe rendering in App responsibility while the PlaybackController owns the HLS/native media-engine boundary.

## URL conversion

getRumbleEmbedUrl() currently works as follows.

### Existing embed

If the URL already contains /embed/, it is returned unchanged after trimming.

Example:

https://rumble.com/embed/v77ec70/?pub=15son

### Standard video URL

The current implementation recognizes:

rumble.com/v<identifier>

using the pattern:

/rumble\.com\/(v[a-zA-Z0-9]+)/i

For:

https://rumble.com/v77ec70-some-story.html

the identifier v77ec70 becomes:

https://rumble.com/embed/v77ec70/

### Non-matching Rumble URL

If a URL belongs to the Rumble family but does not match the current video-ID pattern, the application returns the cleaned original URL. Detection and conversion are therefore separate operations.

## What happens during playback

### Rumble selected from a playlist

The selected URL/title become the current application playback state.

The application identifies the source as Rumble and activates the Rumble rendering branch.

### Rumble displayed

The iframe occupies the existing player surface. The browser creates a separate browsing context for the Rumble player.

Rumble controls the embedded media session.

### Another source selected

The Rumble iframe is replaced by the appropriate normal playback path.

For HLS:

source → HLS.js → HTML5 video

For native media:

source → HTML5 video

For Rumble:

source → Rumble embed iframe

## Why the normal video engine excludes Rumble

The standard controller initialization is intentionally conditioned so that it is not attached while a Rumble source is active:

mainViewerMode === standard && !isRumbleUrl(currentUrl)

This prevents the normal HTML5/HLS engine from binding to a video node when the active media is actually being displayed by Rumble.

This is particularly important because the standard video element is conditionally mounted depending on viewer mode and source type.

## What AJN controls

AJN controls:

- source selection;
- current URL/title;
- Rumble detection;
- embed URL normalization;
- iframe creation/removal;
- surrounding player layout;
- application navigation;
- application history/favorites where applicable;
- transitions to and from other playback engines;
- application-level logging/state.

## What Rumble controls

Rumble controls the embedded player and its media session, including platform-specific:

- media retrieval;
- decoding;
- player controls;
- playback behavior;
- availability;
- content restrictions;
- advertisements/monetization where applicable;
- Rumble-side errors and loading behavior.

The application does not claim direct ownership of those internals.

## What AJN does NOT currently do

The current implementation does not:

- download Rumble media;
- extract a Rumble MP4;
- resolve Rumble to an HLS manifest;
- send Rumble through /api/stream-proxy;
- run Rumble through HLS.js;
- put a Rumble page URL into the normal video src;
- inspect the Rumble iframe's internal DOM;
- directly control Rumble's internal play/pause/seek/volume state;
- report Rumble's internal bitrate/buffer/error telemetry.

These are architectural boundaries, not hidden features.

## Playback state caveat

The PlaybackController can classify a source as Rumble and mark its own source path active.

That does not prove that Rumble has successfully loaded or started media.

There are two distinct states:

1. AJN state: Rumble source selected and Rumble playback path active.
2. Rumble state: the embedded Rumble player has actually loaded and is playing.

The current implementation cannot independently observe the second state at the same level that it observes HLS/native playback.

Therefore diagnostics must not describe controller state as proof of successful Rumble media playback.

## Error handling

HLS/native playback has application-level engine diagnostics and recovery.

Rumble is different because the player lives in an iframe.

The application currently cannot receive the same low-level Rumble media errors, buffering information, bitrate information, or internal player state that it receives from its own HLS engine.

If a Rumble resource is unavailable, restricted, deleted, private, subscription-only, geo-restricted, or otherwise rejected by Rumble, the URL can still be syntactically valid while playback fails.

A browser-level test or manual browser verification is required to prove actual Rumble playback.

## Relationship to the Phase 3 stream proxy

Phase 3 hardens /api/stream-proxy for direct server-side stream requests.

Rumble embeds are deliberately not routed through that proxy.

The security models are different:

- stream proxy: server makes an outbound HTTP request;
- Rumble iframe: browser loads an external embedded page/player.

The intended architecture remains:

Rumble URL → Rumble iframe

not:

Rumble URL → AJN proxy → media extraction

The Phase 3 SSRF boundary therefore does not turn the AJN server into a Rumble extractor.

## Browser behavior

The iframe currently requests:

allowFullScreen

and:

allow = autoplay; encrypted-media; picture-in-picture

Actual playback can still depend on:

- browser autoplay policy;
- browser iframe policy;
- Rumble's current embed implementation;
- network availability;
- content availability;
- account/subscription requirements;
- Rumble-side restrictions.

An iframe being mounted is not equivalent to confirmed media playback.

## Rumble live-source behavior

The default playlist currently contains a test entry labeled:

🥊 Rumble Embed Live (Direct Bypass)

using:

https://rumble.com/embed/v77ec70/?pub=15son

The application supports the source as an embed. The application itself does not independently determine whether a particular Rumble identifier is currently live; it embeds the supplied resource.

The word Live in the default label is therefore a playlist label, not an independently verified runtime status.

## Performance model

Rumble media is not decoded by the AJN HLS/native engine.

The browser hosts the Rumble iframe, and Rumble's player handles its own media pipeline.

Potential Rumble-path costs include:

- iframe creation;
- Rumble player initialization;
- Rumble network requests;
- Rumble-side advertising/resources;
- browser iframe overhead.

These costs should not be confused with the AJN application's existing JavaScript bundle-size warning or HLS buffering behavior.

## Security model

The Rumble iframe is an external-origin browsing context.

The application should not attempt to bypass iframe isolation by reaching into the Rumble DOM.

Any future programmatic control should use a documented/supported Rumble communication or player API if one is available, rather than DOM manipulation.

The current direct-embed architecture also avoids creating a server-side Rumble media extraction service.

## Current automated coverage

The Phase 2 automated suite verifies the general playback boundary, including:

- source replacement;
- stale HLS generation suppression;
- fatal HLS error handling;
- native fallback;
- autoplay rejection behavior;
- idempotent destruction;
- saved-position hooks;
- terminal HLS cleanup;
- application fallback callbacks.

The repository has Rumble classification logic, but the current Node test suite does not prove that a live Rumble iframe successfully plays a particular Rumble resource.

Do not report a Rumble playback test as passed without actual browser/integration evidence.

## Known limitations

### 1. Detection is substring based

isRumbleUrl() checks for rumble.com/. It is not a strict origin parser.

### 2. Rumble playback state is not observable

The application can know that it selected the Rumble path but cannot currently confirm internal Rumble player state.

### 3. No Rumble remote-control adapter

AJN's ordinary video controls cannot automatically control the embedded Rumble player.

### 4. No Rumble media resolver

There is no direct-media extraction layer.

### 5. No iframe-level telemetry

There is currently no application-level Rumble buffering, bitrate, internal error, or playback-position telemetry.

### 6. Browser policy remains authoritative

Autoplay and embedded playback behavior can vary by browser and platform.

### 7. External availability

Rumble controls whether a particular resource is accessible and playable.

## Recommended future work

If Rumble becomes a larger part of the platform, future work can be isolated behind a dedicated RumblePlaybackAdapter.

Potential additions:

1. Strict URL/origin parsing.
2. Stable browser smoke test against an approved test embed.
3. Iframe load/error diagnostics.
4. Separate Rumble-selected and Rumble-confirmed-playing telemetry.
5. Official player messaging/API integration if supported.
6. Tests for standard Rumble URLs, embed URLs, malformed URLs, and lookalike URLs.
7. Explicit lifecycle tests for Rumble → HLS, Rumble → native, HLS → Rumble, and native → Rumble.

These are future options, not claims about the current implementation.

## Operational flow

Playlist / Archive / User Selection
→ currentUrl
→ isRumbleUrl(currentUrl)?

If YES:

getRumbleEmbedUrl()
→ Rumble iframe
→ Rumble-hosted player/media

If NO:

PlaybackController
→ HLS.js or HTML5 video

## Source-of-truth files

- src/App.tsx
- src/playback/playback-controller.ts
- src/playback/hls-lifecycle.ts
- docs/PHASE-2-PLAYBACK-CORE.md
- docs/RUMBLE-INTEGRATION.md

## External Rumble reference

Rumble publishes material describing how Rumble video players can be embedded on external websites:

https://rumble.com/v1a59rb-rumble-basics-how-to-embed-your-video.html

## Bottom line

Rumble is currently an external embedded playback source inside AJN.

It is not an HLS stream handled by HLS.js.

It is not a native MP4/WebM source handled by the HTML5 video element.

It is not fetched through the Phase 3 stream proxy.

AJN owns source selection, classification, embed URL normalization, iframe placement, surrounding UI, and transitions between playback modes.

Rumble owns the embedded media player and the actual Rumble media session.

That boundary is intentional and should remain explicit in future playback work.
