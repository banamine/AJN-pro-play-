import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import { validateStreamProxyUrl } from "./stream-url.ts";

export interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

export type StreamProxyResult =
  | {
      ok: true;
      statusCode: number;
      headers: Record<string, string>;
      body: Readable;
    }
  | { ok: false; status: number; error: string };

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 5;

function isBlockedIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a >= 224
  );
}

function isBlockedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("ff")
  );
}

export function isPublicAddress(address: string, family: 4 | 6): boolean {
  return family === 4 ? !isBlockedIpv4(address) : !isBlockedIpv6(address);
}

export async function resolvePublicAddresses(
  hostname: string,
  lookup = dns.lookup
): Promise<ResolvedAddress[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  const addresses = results
    .filter((entry) => entry.family === 4 || entry.family === 6)
    .map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }));

  if (addresses.length === 0 || addresses.some((entry) => !isPublicAddress(entry.address, entry.family))) {
    throw new Error("Blocked stream host");
  }

  return addresses;
}

function requestOnce(
  parsed: URL,
  addresses: ResolvedAddress[],
  signal: AbortSignal
): Promise<{ response: http.IncomingMessage; body: Readable }> {
  const transport = parsed.protocol === "https:" ? https : http;
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
  const addressByFamily = new Map(addresses.map((entry) => [entry.family, entry.address]));
  let usedFamily: 4 | 6 | undefined;

  return new Promise((resolve, reject) => {
    const request = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        lookup: (_hostname, options, callback) => {
          const family = options.family === 6 ? 6 : options.family === 4 ? 4 : undefined;
          const selected = family ? addressByFamily.get(family) : addresses[0]?.address;
          const selectedEntry = addresses.find((entry) => entry.address === selected);
          if (!selectedEntry) {
            callback(new Error("No validated public address available"), "", 0);
            return;
          }
          usedFamily = selectedEntry.family;
          callback(null, selectedEntry.address, selectedEntry.family);
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        if (!usedFamily || !isPublicAddress(addresses.find((entry) => entry.family === usedFamily)!.address, usedFamily)) {
          response.destroy(new Error("Blocked stream host"));
          reject(new Error("Blocked stream host"));
          return;
        }
        resolve({ response, body: response });
      }
    );

    const abort = () => request.destroy(new Error("Client request aborted"));
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener("abort", abort, { once: true });
    request.once("error", reject);
    request.once("timeout", () => request.destroy(new Error("Upstream request timeout")));
    request.end();
  });
}

export async function openStreamProxy(
  rawUrl: string,
  signal: AbortSignal
): Promise<StreamProxyResult> {
  let currentUrl = rawUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const validated = validateStreamProxyUrl(currentUrl);
    if (validated.ok === false) {
      return { ok: false, status: 400, error: validated.error };
    }

    const parsed = new URL(validated.url);
    let addresses: ResolvedAddress[];
    try {
      addresses = await resolvePublicAddresses(parsed.hostname);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { ok: false, status: 400, error: message === "Blocked stream host" ? message : "Unable to resolve stream host" };
    }

    let response: http.IncomingMessage;
    let body: Readable;
    try {
      ({ response, body } = await requestOnce(parsed, addresses, signal));
    } catch (error) {
      if (signal.aborted) throw error;
      return { ok: false, status: 502, error: "Stream proxy connection failed" };
    }

    const statusCode = response.statusCode ?? 502;
    if (statusCode >= 300 && statusCode < 400 && response.headers.location) {
      if (redirect === MAX_REDIRECTS) {
        body.destroy();
        return { ok: false, status: 502, error: "Too many stream redirects" };
      }
      const next = new URL(response.headers.location, parsed).toString();
      body.resume();
      currentUrl = next;
      continue;
    }

    if (statusCode < 200 || statusCode >= 300) {
      body.resume();
      return { ok: false, status: 502, error: `Failed to fetch remote stream. Status: ${statusCode}` };
    }

    const headers: Record<string, string> = {};
    const contentType = response.headers["content-type"];
    if (typeof contentType === "string") headers["content-type"] = contentType;

    return { ok: true, statusCode, headers, body };
  }

  return { ok: false, status: 502, error: "Stream proxy failed" };
}
