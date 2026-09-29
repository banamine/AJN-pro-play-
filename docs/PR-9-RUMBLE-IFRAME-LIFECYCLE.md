# PR 9 — Rumble Iframe Lifecycle Controller

## Objective

Establish an explicit lifecycle owner for Rumble iframe browsing contexts so rapid channel transitions cannot leave stale iframe callbacks or browsing contexts attached to the active player.

## Scope

In scope:
- generation-based lifecycle ownership
- serialized teardown and replacement
- \`about:blank\` browsing-context neutralization
- listener unbinding
- DOM detachment
- responsive 16:9 presentation wrapper
- deterministic unit coverage

Out of scope:
- circuit-breaker state and fallback promotion
- carousel or Guide/EPG integration
- Rumble RSS acquisition
- Rumble playback confirmation or internal player control

## Lifecycle Contract

Each replacement receives a monotonically advancing generation token.

The active frame owns its generation. Load/error callbacks are accepted only when their generation matches both the controller's global generation and active frame generation.

### Teardown order

1. Mark the frame inactive so late callbacks are ignored.
2. Set \`iframe.src = "about:blank"\` to neutralize its browsing context.
3. Remove attached \`load\` and \`error\` listeners.
4. Remove the iframe from the lifecycle-owned host.
5. Advance the global generation.
6. Instantiate and append the replacement frame.

The controller does not claim that DOM detachment or \`about:blank\` alone guarantees garbage collection.

## Presentation

\`RumbleIframe\` renders a relative \`aspect-video\` wrapper. The lifecycle-owned iframe is positioned with \`inset-0\`, \`width: 100%\`, and \`height: 100%\`.

## Integration Boundary

\`src/App.tsx\` remains responsible for deciding when a Rumble URL is selected. \`RumbleIframe\` owns the Rumble iframe DOM lifecycle. PR 9 does not add synchronization, fallback promotion, circuit-breaker logic, or Guide/EPG rendering.

## Verification

Tests cover:
- rapid transition teardown ordering
- stale callback suppression
- idempotent destruction
- replacement generation advancement

The component is intentionally separate from RSS and stream-proxy boundaries.
