import type { ChannelSyncStatus, RumbleChannelContract, RumbleVideoMetadata } from "../../types/rumble";
import { fetchRumbleRss, type RumbleRssResult } from "../../server/rumble-rss";

export type CircuitState = "closed" | "open" | "half_open";

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  baseBackoffMs?: number;
  maxBackoffMs?: number;
  jitterRatio?: number;
  now?: () => number;
  random?: () => number;
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  consecutiveFailures: number;
  backoffExponent: number;
  nextProbeAt: number | null;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  probeInFlight: boolean;
}

export type CircuitRequestDecision =
  | { allowed: true; state: "closed" | "half_open"; isProbe: boolean }
  | { allowed: false; state: "open" | "half_open"; nextProbeAt: number | null };

function clampRandom(value: number): number {
  if (!Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

export class CircuitBreaker {
  private readonly failureThreshold: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly jitterRatio: number;
  private readonly now: () => number;
  private readonly random: () => number;

  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private backoffExponent = 0;
  private nextProbeAt: number | null = null;
  private lastFailureAt: number | null = null;
  private lastSuccessAt: number | null = null;
  private probeInFlight = false;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = Math.max(1, Math.floor(options.failureThreshold ?? 3));
    this.baseBackoffMs = Math.max(1, options.baseBackoffMs ?? 30_000);
    this.maxBackoffMs = Math.max(this.baseBackoffMs, options.maxBackoffMs ?? 15 * 60_000);
    this.jitterRatio = Math.min(1, Math.max(0, options.jitterRatio ?? 0.2));
    this.now = options.now ?? (() => Date.now());
    this.random = options.random ?? Math.random;
  }

  getSnapshot(): CircuitBreakerSnapshot {
    return {
      state: this.state,
      consecutiveFailures: this.consecutiveFailures,
      backoffExponent: this.backoffExponent,
      nextProbeAt: this.nextProbeAt,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      probeInFlight: this.probeInFlight,
    };
  }

  get failureLimit(): number {
    return this.failureThreshold;
  }

  canRequest(): CircuitRequestDecision {
    const now = this.now();

    if (this.state === "closed") {
      return { allowed: true, state: "closed", isProbe: false };
    }

    if (this.state === "half_open") {
      if (this.probeInFlight) {
        return { allowed: false, state: "half_open", nextProbeAt: this.nextProbeAt };
      }
      this.probeInFlight = true;
      return { allowed: true, state: "half_open", isProbe: true };
    }

    if (this.nextProbeAt !== null && now >= this.nextProbeAt) {
      this.state = "half_open";
      this.probeInFlight = true;
      return { allowed: true, state: "half_open", isProbe: true };
    }

    return { allowed: false, state: "open", nextProbeAt: this.nextProbeAt };
  }

  recordSuccess(): CircuitBreakerSnapshot {
    const now = this.now();
    this.state = "closed";
    this.consecutiveFailures = 0;
    this.backoffExponent = 0;
    this.nextProbeAt = null;
    this.probeInFlight = false;
    this.lastSuccessAt = now;
    return this.getSnapshot();
  }

  recordFailure(): CircuitBreakerSnapshot {
    const now = this.now();
    this.lastFailureAt = now;
    this.probeInFlight = false;
    this.consecutiveFailures += 1;

    if (this.state === "half_open" || this.consecutiveFailures >= this.failureThreshold) {
      this.openCircuit(now);
    }

    return this.getSnapshot();
  }

  private openCircuit(now: number): void {
    const exponent = this.state === "half_open" ? Math.max(1, this.backoffExponent + 1) : this.backoffExponent;
    const exponentialDelay = Math.min(
      this.maxBackoffMs,
      this.baseBackoffMs * 2 ** exponent,
    );
    const jitter = 1 + ((clampRandom(this.random()) * 2) - 1) * this.jitterRatio;
    const delay = Math.min(this.maxBackoffMs, Math.max(1, Math.round(exponentialDelay * jitter)));

    this.backoffExponent = Math.min(
      30,
      Math.max(this.backoffExponent + (this.state === "half_open" ? 1 : 0), exponent),
    );
    this.state = "open";
    this.nextProbeAt = now + delay;
  }
}

export interface RumbleSyncEngineOptions extends CircuitBreakerOptions {
  fetchRss?: (feedUrl: string) => Promise<RumbleRssResult>;
  onTelemetry?: (event: RumbleSyncTelemetryEvent) => void;
}

export type RumbleSyncTelemetryEvent =
  | {
      type: "sync_started";
      channelId: string;
      generation: number;
      isProbe: boolean;
    }
  | {
      type: "sync_succeeded";
      channelId: string;
      generation: number;
      videoCount: number;
    }
  | {
      type: "sync_failed";
      channelId: string;
      generation: number;
      error: string;
      circuitState: CircuitState;
    }
  | {
      type: "fallback_promoted";
      channelId: string;
      generation: number;
      fallbackEmbedUrl: string;
      circuitState: "open";
    };

export interface RumbleSyncChannelState extends RumbleChannelContract {
  activeEmbedUrl: string;
  circuit: CircuitBreakerSnapshot;
  generation: number;
  lastSyncError: string | null;
}

export interface RumbleSyncResult {
  ok: boolean;
  state: RumbleSyncChannelState;
}

interface ChannelRuntime {
  state: RumbleSyncChannelState;
  breaker: CircuitBreaker;
  generation: number;
}

export class RumbleSyncEngine {
  private readonly channels = new Map<string, ChannelRuntime>();
  private readonly options: RumbleSyncEngineOptions;

  constructor(channels: RumbleChannelContract[], options: RumbleSyncEngineOptions = {}) {
    this.options = options;
    for (const channel of channels) {
      const breaker = new CircuitBreaker(options);
      this.channels.set(channel.id, {
        breaker,
        generation: 0,
        state: {
          ...channel,
          activeEmbedUrl: channel.fallbackEmbedUrl,
          circuit: breaker.getSnapshot(),
          generation: 0,
          lastSyncError: null,
        },
      });
    }
  }

  getChannel(channelId: string): RumbleSyncChannelState | null {
    return this.channels.get(channelId)?.state ?? null;
  }

  getAllChannels(): RumbleSyncChannelState[] {
    return [...this.channels.values()].map(({ state }) => state);
  }

  async syncChannel(channelId: string): Promise<RumbleSyncResult> {
    const runtime = this.channels.get(channelId);
    if (!runtime) throw new Error(`Unknown Rumble channel: ${channelId}`);

    const decision = runtime.breaker.canRequest();
    runtime.state.circuit = runtime.breaker.getSnapshot();

    if (!decision.allowed) {
      runtime.state.syncStatus = "circuit_open";
      runtime.state.activeEmbedUrl = runtime.state.fallbackEmbedUrl;
      return { ok: false, state: this.cloneState(runtime.state) };
    }

    const generation = ++runtime.generation;
    runtime.state.generation = generation;
    runtime.state.syncStatus = "syncing";
    this.options.onTelemetry?.({
      type: "sync_started",
      channelId,
      generation,
      isProbe: decision.isProbe,
    });

    const feedUrl = runtime.state.feedUrl;
    if (!feedUrl) {
      return this.failChannel(runtime, generation, "Rumble channel has no RSS feed URL.");
    }

    try {
      const result = await (this.options.fetchRss ?? fetchRumbleRss)(feedUrl);

      if (runtime.generation !== generation) {
        return { ok: false, state: this.cloneState(runtime.state) };
      }

      if (result.ok) {
        runtime.breaker.recordSuccess();
        this.applySuccess(runtime, generation, result.videos);
        this.options.onTelemetry?.({
          type: "sync_succeeded",
          channelId,
          generation,
          videoCount: result.videos.length,
        });
        return { ok: true, state: this.cloneState(runtime.state) };
      }

      return this.failChannel(runtime, generation, result.error);
    } catch (error) {
      return this.failChannel(
        runtime,
        generation,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  async syncAll(): Promise<RumbleSyncResult[]> {
    return Promise.all(
      [...this.channels.keys()].map((channelId) =>
        this.syncChannel(channelId).catch((error) => {
          const runtime = this.channels.get(channelId);
          if (!runtime) throw error;
          return this.failChannel(
            runtime,
            runtime.generation + 1,
            error instanceof Error ? error.message : String(error),
          );
        }),
      ),
    );
  }

  private applySuccess(
    runtime: ChannelRuntime,
    generation: number,
    videos: RumbleVideoMetadata[],
  ): void {
    const latest = videos[0] ?? null;
    runtime.state.currentVideo = latest;
    runtime.state.activeEmbedUrl = latest?.embedUrl ?? runtime.state.fallbackEmbedUrl;
    runtime.state.lastSyncedAt = new Date(this.options.now?.() ?? Date.now()).toISOString();
    runtime.state.syncStatus = "idle";
    runtime.state.consecutiveFailures = 0;
    runtime.state.lastSyncError = null;
    runtime.state.generation = generation;
    runtime.state.circuit = runtime.breaker.getSnapshot();
  }

  private failChannel(
    runtime: ChannelRuntime,
    generation: number,
    error: string,
  ): RumbleSyncResult {
    if (runtime.generation !== generation) {
      return { ok: false, state: this.cloneState(runtime.state) };
    }

    const snapshot = runtime.breaker.recordFailure();
    runtime.state.circuit = snapshot;
    runtime.state.consecutiveFailures = snapshot.consecutiveFailures;
    runtime.state.lastSyncError = error;
    runtime.state.syncStatus = snapshot.state === "open" ? "circuit_open" : "degraded";

    if (snapshot.state === "open") {
      runtime.state.currentVideo = null;
      runtime.state.activeEmbedUrl = runtime.state.fallbackEmbedUrl;
      this.options.onTelemetry?.({
        type: "fallback_promoted",
        channelId: runtime.state.id,
        generation,
        fallbackEmbedUrl: runtime.state.fallbackEmbedUrl,
        circuitState: "open",
      });
    }

    this.options.onTelemetry?.({
      type: "sync_failed",
      channelId: runtime.state.id,
      generation,
      error,
      circuitState: snapshot.state,
    });

    return { ok: false, state: this.cloneState(runtime.state) };
  }

  private cloneState(state: RumbleSyncChannelState): RumbleSyncChannelState {
    return {
      ...state,
      keyShows: [...state.keyShows],
      currentVideo: state.currentVideo ? { ...state.currentVideo } : null,
      circuit: { ...state.circuit },
    };
  }
}
