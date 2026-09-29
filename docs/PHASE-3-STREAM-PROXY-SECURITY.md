# Phase 3 — Stream Proxy Security Boundary

## Objective

Harden `/api/stream-proxy` against server-side request forgery caused by public hostnames resolving to private, loopback, link-local, metadata, multicast, or otherwise non-public addresses, while preserving legitimate public HTTP/HTTPS media proxying.

## Scope

- Validate URL syntax and HTTP/HTTPS protocol.
- Resolve destination hostnames before opening the upstream connection.
- Reject any hostname resolution result containing a non-public IPv4 or IPv6 address.
- Pin the upstream socket lookup to the validated address set so the connection does not perform an independent DNS lookup.
- Re-validate every HTTP redirect before following it.
- Bound redirects to five hops.
- Bound upstream connection establishment/read inactivity with a 15-second request timeout.
- Preserve client-abort propagation.
- Preserve CORS and media content-type behavior.
- Preserve the existing stream proxy endpoint and player fallback contract.

## Explicitly rejected destinations

The proxy rejects:

- localhost and metadata hostnames.
- IPv4 loopback, private, link-local, carrier-grade NAT, unspecified, multicast, and broadcast/reserved ranges.
- IPv6 unspecified, loopback, ULA, link-local, and multicast ranges.
- Hostnames that resolve to any non-public address.
- Redirect targets that fail the same URL/DNS checks.
- More than five redirects.

## Connection model

The proxy does not use a separate DNS validation followed by an ordinary `fetch()` that would perform another unconstrained hostname lookup. It resolves the hostname first and supplies the validated address through the Node HTTP(S) client's `lookup` hook. For HTTPS, the requested hostname remains the TLS/SNI hostname while the socket connects to the validated public address.

This closes the primary DNS-rebinding gap identified in Phase 1.

## Preservation boundary

Phase 3 does not change:

- `PlaybackController`
- HLS.js configuration
- native media playback
- Archive/IPTV selection
- playlist ordering
- UI behavior
- Rumble iframe behavior
- Sirius/audio behavior

## Verification gates

1. `npm run lint`
2. `npm run build`
3. `npm test`
4. Literal private-address rejection remains green.
5. Hostname-to-private-address rejection is covered by deterministic tests.
6. Mixed public/private DNS results fail closed.
7. Public DNS results are accepted.
8. IPv6 private/link-local/multicast results fail closed.
9. Redirects are revalidated.
10. Client abort remains propagated.
11. Phase 2 playback-controller regression tests remain green.
12. GitHub CI is green on the final Phase 3 commit.

No package-lock file is introduced by this phase.
