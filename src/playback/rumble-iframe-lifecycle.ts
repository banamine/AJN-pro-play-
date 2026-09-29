export interface RumbleIframeNode {
  src: string;
  addEventListener: (type: "load" | "error", listener: () => void) => void;
  removeEventListener: (type: "load" | "error", listener: () => void) => void;
}

export interface RumbleIframeHost {
  appendChild: (node: RumbleIframeNode) => void;
  removeChild: (node: RumbleIframeNode) => void;
}

export interface RumbleIframeLifecycleOptions {
  createIframe?: () => RumbleIframeNode;
  onLoad?: (generation: number) => void;
  onError?: (generation: number) => void;
}

interface ActiveFrame {
  generation: number;
  iframe: RumbleIframeNode;
  onLoad: () => void;
  onError: () => void;
}

export class RumbleIframeLifecycleController {
  private globalGeneration = 0;
  private active: ActiveFrame | null = null;
  private destroyed = false;
  private readonly createIframe: () => RumbleIframeNode;
  private readonly onLoad?: (generation: number) => void;
  private readonly onError?: (generation: number) => void;

  constructor(options: RumbleIframeLifecycleOptions = {}) {
    this.createIframe =
      options.createIframe ??
      (() => document.createElement("iframe") as unknown as RumbleIframeNode);
    this.onLoad = options.onLoad;
    this.onError = options.onError;
  }

  getGeneration(): number {
    return this.globalGeneration;
  }

  mount(host: RumbleIframeHost, embedUrl: string): number {
    if (this.destroyed) return this.globalGeneration;

    this.teardownActive(host);

    // The replacement frame gets a fresh ownership token only after the
    // previous browsing context has been neutralized, listeners removed,
    // and its DOM node detached.
    const generation = ++this.globalGeneration;
    const iframe = this.createIframe();

    const onLoad = () => {
      if (!this.isCurrent(generation)) return;
      this.onLoad?.(generation);
    };

    const onError = () => {
      if (!this.isCurrent(generation)) return;
      this.onError?.(generation);
    };

    iframe.addEventListener("load", onLoad);
    iframe.addEventListener("error", onError);

    this.active = { generation, iframe, onLoad, onError };
    host.appendChild(iframe);

    iframe.src = embedUrl;
    return generation;
  }

  teardown(host: RumbleIframeHost): void {
    this.teardownActive(host);
  }

  destroy(host: RumbleIframeHost): void {
    if (this.destroyed) return;
    this.teardownActive(host);
    this.destroyed = true;
  }

  private teardownActive(host: RumbleIframeHost): void {
    const active = this.active;
    if (!active) return;

    // Invalidate the active frame before any browser event can be observed
    // during teardown.
    this.active = null;

    // 1. Neutralize the browsing context.
    active.iframe.src = "about:blank";

    // 2. Unbind lifecycle listeners.
    active.iframe.removeEventListener("load", active.onLoad);
    active.iframe.removeEventListener("error", active.onError);

    // 3. Detach the iframe node from the lifecycle-owned DOM host.
    host.removeChild(active.iframe);

    // 4. Advance the ownership generation before a replacement is created.
    ++this.globalGeneration;
  }

  private isCurrent(generation: number): boolean {
    return (
      !this.destroyed &&
      this.active?.generation === generation &&
      this.globalGeneration === generation
    );
  }
}
