# PR 11 — Rumble Sync & Circuit Breaker Engine

## Scope

PR 11 adds a domain-level synchronization engine for the Rumble channel contract. It keeps public channel presentation state separate from the internal circuit breaker state.

### Public channel sync status

The existing `ChannelSyncStatus` remains:

- `idle`
- `syncing`
- `degraded`
- `circuit_open`

### Internal circuit state

The breaker uses only:

- `closed`
- `open`
- `half_open`

These state machines are deliberately decoupled. UI/telemetry consumers can use `syncStatus` without depending on breaker internals.

## Deterministic backoff and jitter

`CircuitBreaker` accepts injected:

- `now()`
- `random()`

Backoff is exponential, bounded by a configurable maximum, and jitter is applied as a symmetric percentage around the calculated delay.

No test waits on wall-clock timers. Half-open transitions are exercised by advancing an injected clock.

## Per-channel isolation

Each channel receives its own `CircuitBreaker` instance. A failure on one channel changes only that channel's breaker, counters, sync status, and fallback state.

`syncAll()` runs channels independently with `Promise.all`; a channel-local RSS failure becomes that channel's `degraded` or `circuit_open` result instead of rejecting the entire batch.

## Half-open probe contract

When an open circuit reaches `nextProbeAt`:

1. The first request transitions the breaker to `half_open` and is marked as the single probe.
2. A second request while that probe is in flight is rejected.
3. Probe success returns the breaker to `closed`, clears failure/backoff state, and restores dynamic metadata.
4. Probe failure immediately returns the breaker to `open` and increases the backoff exponent.

## Fallback promotion

When a breaker opens, the sync engine:

1. Sets `syncStatus = "circuit_open"`.
2. Clears `currentVideo`.
3. Promotes `fallbackEmbedUrl` to the derived `activeEmbedUrl`.
4. Emits structured `fallback_promoted` telemetry.

The canonical channel URL and RSS feed URL are not rewritten. Fallback promotion is runtime state, not identity mutation.

On successful recovery, `activeEmbedUrl` is replaced with the latest RSS-derived embed URL and dynamic metadata is restored.

## Error handling

A gateway failure is channel-local. It increments that channel's breaker and produces:

- `degraded` while failures remain below threshold;
- `circuit_open` once the threshold is reached.

No global breaker is used.

## Verification

Focused tests cover:

- thresholding;
- open suppression;
- half-open transition;
- single-probe enforcement;
- successful recovery;
- failed probe and increased backoff;
- deterministic jitter;
- channel isolation;
- fallback promotion and recovery;
- structured telemetry;
- unknown-channel isolation.

PR 11 does not modify Carousel, Guide/EPG, or player UI components.
