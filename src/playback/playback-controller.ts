import Hls from "hls.js";
import { teardownHlsInstance } from "./hls-lifecycle.ts";

export type PlaybackSourceKind = "hls" | "native" | "rumble";

export type PlaybackStatus = "idle" | "loading" | "playing" | "paused" | "error";

export interface PlaybackSource {
  url: string;
  title: string;
  kind?: PlaybackSourceKind | "auto";
}

export interface PlaybackState {
  generation: number;
  status: PlaybackStatus;
  source: PlaybackSource | null;
  error: string | null;
}

export interface PlaybackControllerOptions {
  video: HTMLVideoElement;
  hlsFactory?: (options?: ConstructorParameters<typeof Hls>[0]) => Hls;
  isHlsSupported?: () => boolean;
  hlsEvents?: typeof Hls.Events;
  onStateChange?: (state: PlaybackState) => void;
  onLog?: (message: string, type?: "info" | "warning" | "error") => void;
  getSavedPosition?: (url: string) => number;
  hlsConfigFactory?: (source: PlaybackSource) => ConstructorParameters<typeof Hls>[0];
  onFatalError?: (source: PlaybackSource, message: string) => void;
}

const isRumbleUrl = (url: string): boolean => url.toLowerCase().includes("rumble.com/");

const inferSourceKind = (url: string): PlaybackSourceKind =>
  isRumbleUrl(url) ? "rumble" : url.toLowerCase().includes("m3u8") ? "hls" : "native";

export class PlaybackController {
  private readonly video: HTMLVideoElement;
  private readonly hlsFactory: NonNullable<PlaybackControllerOptions["hlsFactory"]>;
  private readonly isHlsSupported: () => boolean;
  private readonly hlsEvents: typeof Hls.Events;
  private readonly onStateChange?: PlaybackControllerOptions["onStateChange"];
  private readonly onLog?: PlaybackControllerOptions["onLog"];
  private readonly getSavedPosition?: PlaybackControllerOptions["getSavedPosition"];
  private readonly hlsConfigFactory?: PlaybackControllerOptions["hlsConfigFactory"];
  private readonly onFatalError?: PlaybackControllerOptions["onFatalError"];
  private hls: Hls | null = null;
  private readonly mediaErrorCounts = new WeakMap<object, number>();
  private generation = 0;
  private destroyed = false;
  private state: PlaybackState = { generation: 0, status: "idle", source: null, error: null };

  constructor(options: PlaybackControllerOptions) {
    this.video = options.video;
    this.hlsFactory = options.hlsFactory ?? ((config) => new Hls(config));
    this.isHlsSupported = options.isHlsSupported ?? (() => Hls.isSupported());
    this.hlsEvents = options.hlsEvents ?? Hls.Events;
    this.onStateChange = options.onStateChange;
    this.onLog = options.onLog;
    this.getSavedPosition = options.getSavedPosition;
    this.hlsConfigFactory = options.hlsConfigFactory;
    this.onFatalError = options.onFatalError;
  }

  getState(): PlaybackState {
    return {
      ...this.state,
      source: this.state.source ? { ...this.state.source } : null,
    };
  }

  load(source: PlaybackSource): void {
    if (this.destroyed) return;
    const generation = ++this.generation;
    this.destroyEngine();

    const kind = source.kind === "auto" || !source.kind ? inferSourceKind(source.url) : source.kind;
    const normalizedSource: PlaybackSource = { ...source, kind };

    this.state = { generation, status: "loading", source: normalizedSource, error: null };
    this.emit();

    if (kind === "rumble") {
      this.updateStatus("playing", generation);
      return;
    }

    if (kind === "hls" && this.isHlsSupported()) {
      this.mountHls(normalizedSource, generation);
    } else {
      this.mountNative(normalizedSource, generation);
    }
  }

  async play(): Promise<void> {
    if (this.destroyed) return;
    await this.video.play();
    this.updateStatus("playing");
  }

  pause(): void {
    if (this.destroyed) return;
    this.video.pause();
    this.updateStatus("paused");
  }

  stop(): void {
    if (this.destroyed) return;
    ++this.generation;
    this.destroyEngine();
    this.state = { generation: this.generation, status: "idle", source: null, error: null };
    this.emit();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    ++this.generation;
    this.destroyEngine();
    this.state = { generation: this.generation, status: "idle", source: null, error: null };
    this.emit();
  }

  private mountHls(source: PlaybackSource, generation: number): void {
    const hlsConfig = this.hlsConfigFactory?.(source) ?? { enableWorker: true };
    const hls = this.hlsFactory(hlsConfig);
    this.hls = hls;

    hls.on(this.hlsEvents.MANIFEST_PARSED, () => {
      if (!this.isCurrentGeneration(generation)) return;
      const savedPos = this.getSavedPosition?.(source.url) ?? 0;
      if (savedPos > 0) {
        this.video.currentTime = savedPos;
      }
      if (savedPos > 0) {
      this.video.addEventListener("loadedmetadata", () => {
        if (this.isCurrentGeneration(generation)) this.video.currentTime = savedPos;
      }, { once: true });
    }
    this.video.play().then(
        () => this.updateStatus("playing", generation),
        () => this.onLog?.("Awaiting user interaction to start playback", "warning"),
      );
    });

    hls.on(this.hlsEvents.ERROR, (_event, data) => {
      if (!this.isCurrentGeneration(generation)) return;
      if (!data.fatal) {
        if (data.details === "fragLoadError" || data.details === "fragLoadTimeOut") {
          this.onLog?.(`Non-fatal warning [${data.details}]: segment unavailable or timed out`, "warning");
          if (!this.video.paused) this.video.currentTime += 0.5;
        } else if (data.details === "bufferStalledError") {
          this.onLog?.("Player buffer stalled; nudging playhead to recover", "warning");
          this.video.currentTime += 0.25;
        }
        this.onLog?.(`HLS non-fatal error: ${data.details}`, "warning");
        return;
      }
      this.handleFatalHlsError(hls, source, generation, data);
    });

    hls.loadSource(source.url);
    hls.attachMedia(this.video);
  }

  private mountNative(source: PlaybackSource, generation: number): void {
    const onLoadedMetadata = () => {
      if (!this.isCurrentGeneration(generation)) return;
      this.video.removeEventListener("loadedmetadata", onLoadedMetadata);
    };

    this.video.addEventListener("loadedmetadata", onLoadedMetadata);
    const savedPos = this.getSavedPosition?.(source.url) ?? 0;
    this.video.src = source.url;
    this.video.load();
    this.video.play().then(
      () => this.updateStatus("playing", generation),
      () => this.updateStatus("paused", generation),
    );
  }

  private handleFatalHlsError(hls: Hls, source: PlaybackSource, generation: number, data: any): void {
    const message = `HLS error [details: ${data.details}, type: ${data.type}, fatal: ${data.fatal}]`;
    const errorTypes = Hls.ErrorTypes;
    if (data.type === errorTypes.NETWORK_ERROR) {
      this.onLog?.(`${message}. Fatal network error - reloading stream pipeline...`, "warning");
      hls.startLoad();
      return;
    }
    if (data.type === errorTypes.MEDIA_ERROR) {
      const count = (this.mediaErrorCounts.get(hls) ?? 0) + 1;
      this.mediaErrorCounts.set(hls, count);
      if (count === 1) {
        this.onLog?.(`${message}. Attempting media recovery...`, "warning");
        hls.recoverMediaError();
        return;
      }
      if (count === 2) {
        this.onLog?.(`${message}. Swapping audio codec and recovering...`, "warning");
        hls.swapAudioCodec();
        hls.recoverMediaError();
        return;
      }
      this.mediaErrorCounts.set(hls, 0);
    }
    this.fail(generation, message);
    this.onFatalError?.(source, message);
  }

  private fail(generation: number, message: string): void {
    if (!this.isCurrentGeneration(generation)) return;
    this.state = { ...this.state, status: "error", error: message };
    this.emit();
    this.onLog?.(message, "error");
  }

  private updateStatus(status: PlaybackStatus, generation = this.generation): void {
    if (!this.isCurrentGeneration(generation)) return;
    this.state = { ...this.state, status, error: null };
    this.emit();
  }

  private isCurrentGeneration(generation: number): boolean {
    return !this.destroyed && generation === this.generation;
  }

  private destroyEngine(): void {
    teardownHlsInstance(this.hls, this.video);
    this.hls = null;
    this.video.pause();
  }

  private emit(): void {
    this.onStateChange?.(this.getState());
  }
}
