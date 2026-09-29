# PR 8 — Rumble RSS Feed Gateway

## Scope

This phase adds a server-side RSS acquisition boundary for Rumble channel feeds.

It does not change the player UI, iframe lifecycle, carousel, Guide/EPG, or circuit-breaker state machine.

## Endpoint

`GET /api/rumble/rss?url=<feedUrl>`

The gateway accepts only:

- HTTPS
- hostname `rumble.com`
- channel feed paths matching `/c/{channel}/feed`
- no username or password component

Redirects are handled manually and each redirect is revalidated against the same Rumble-only policy.

## Response limits

- 10 second upstream timeout
- maximum 3 redirects
- maximum 1 MB response body
- maximum 50 parsed RSS items

These limits prevent an RSS feed from becoming an unbounded server workload.

## XML handling

The gateway rejects:

- oversized input
- missing RSS root structure
- DOCTYPE declarations
- ENTITY declarations
- XML stylesheet processing instructions

Only a bounded RSS item subset is projected into the typed `RumbleVideoMetadata` contract.

Media links and thumbnails are accepted only when they resolve to HTTPS `rumble.com` URLs.

## Failure model

The gateway returns a typed HTTP status and error message. It does not fabricate a video item when parsing fails.

This phase intentionally does not implement:

- per-channel circuit breakers
- half-open probes
- sync scheduling
- iframe lifecycle management
- React integration
- carousel/Guide integration

Those responsibilities remain in PRs 9–11.

## Security boundary

This is deliberately separate from `/api/stream-proxy`.

The general byte-stream proxy accepts public HTTP/HTTPS destinations after DNS-aware validation. The Rumble RSS gateway has a narrower application-specific policy: it only acquires the expected Rumble channel-feed origin and rejects redirects outside that origin.

## Tests

The regression suite covers:

- valid metadata extraction
- dangerous XML declaration rejection
- non-Rumble media rejection
- malformed/oversized input
- item-count bounding
- pre-fetch feed URL rejection
- redirect-origin rejection
- bounded response rejection
- successful gateway projection
