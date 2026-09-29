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

export interface StreamProxyDependencies {
  lookup?: typeof dns.lookup;
  isPublicAddress?: typeof isPublicAddress;
}

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

function ipv6ToBigInt(address: string): bigint | null {
  const normalized = address.toLowerCase();
  const zoneIndex = normalized.indexOf("%");
  const withoutZone = zoneIndex >= 0 ? normalized.slice(0, zoneIndex) : normalized;
  const [head, tail] = withoutZone.split("::");

  if (tail !== undefined && withoutZone.indexOf("::") !== withoutZone.lastIndexOf("::")) {
    return null;
  }

  const parsePart = (part: string): number[] | null => {
    if (!part) return [];

    if (part.includes(".")) {
      const ipv4 = part.split(".");
      if (
        ipv4.length !== 4 ||
        ipv4.some((octet) => !/^\d+$/.test(octet) || Number(octet) < 0 || Number(octet) > 255)
      ) {
        return null;
      }
      const value =
        (Number(ipv4[0]) << 24) |
        (Number(ipv4[1]) << 16) |
        (Number(ipv4[2]) << 8) |
        Number(ipv4[3]);
      return [(value >>> 16) & 0xffff, value & 0xffff];
    }

    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    return [Number.parseInt(part, 16)];
  };

  const headParts = head.split(":").flatMap(parsePart);
  const tailParts = tail === undefined ? [] : tail.split(":").flatMap(parsePart);
  if (headParts.length === 0 && tailParts.length === 0 && withoutZone !== "::") return null;
  if (headParts.length + tailParts.length > 8) return null;

  const groups =
    tail === undefined
      ? headParts
      : [...headParts, ...Array(8 - headParts.length - tailParts.length).fill(0), ...tailParts];

  if (groups.length !== 8) return null;

  return groups.reduce((value, group) => (value << 16n) | BigInt(group), 0n);
}

function embeddedIpv4FromIpv6(address: string): string | null {
  const value = ipv6ToBigInt(address);
  if (value === null) return null;

  const top32 = value >> 96n;
  const top16 = value >> 112n;

  if (top32 === 0xffffn || top32 === 0x64ff9bn || top16 === 0x2002n) {
    const ipv4Value = Number(value & 0xffffffffn);
    return [
      (ipv4Value >>> 24) & 255,
      (ipv4Value >>> 16) & 255,
      (ipv4Value >>> 8) & 255,
      ipv4Value & 255,
    ].join(".");
  }

  return null;
}

function isBlockedIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  const embeddedIpv4 = embeddedIpv4FromIpv6(normalized);
  if (embeddedIpv4 !== null && isBlockedIpv4(embeddedIpv4)) {
    return true;
  }

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
  lookup = dns.lookup,
  addressPolicy = isPublicAddress
): Promise<ResolvedAddress[]> {
  const results = await lookup(hostname, { all: true, verbatim: true });
  const addresses = results
    .filter((entry) => entry.family === 4 || entry.family === 6)
    .map((entry) => ({ address: entry.address, family: entry.family as 4 | 6 }));

  if (addresses.length === 0 || addresses.some((entry) => !addressPolicy(entry.address, entry.family))) {
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
          const selectedEntries = family
            ? addresses.filter((entry) => entry.family === family)
            : addresses;
          if (selectedEntries.length === 0) {
            callback(new Error("No validated public address available"), "", 0);
            return;
          }

          usedFamily = selectedEntries[0].family;
          if (options.all) {
            callback(
              null,
              selectedEntries.map((entry) => ({ address: entry.address, family: entry.family }))
            );
          } else {
            const selected = selectedEntries[0];
            callback(null, selected.address, selected.family);
          }
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (response) => {
        const usedAddress = addresses.find((entry) => entry.family === usedFamily);
        if (!usedFamily || !usedAddress || !isPublicAddress(usedAddress.address, usedFamily)) {
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
  signal: AbortSignal,
  dependencies: StreamProxyDependencies = {}
): Promise<StreamProxyResult> {
  const lookup = dependencies.lookup ?? dns.lookup;
  const addressPolicy = dependencies.isPublicAddress ?? isPublicAddress;
  let currentUrl = rawUrl;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const validated = validateStreamProxyUrl(currentUrl);
    if (validated.ok === false) {
      return { ok: false, status: 400, error: validated.error };
    }

    const parsed = new URL(validated.url);
    let addresses: ResolvedAddress[];
    try {
      addresses = await resolvePublicAddresses(parsed.hostname, lookup, addressPolicy);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        status: 400,
        error: message === "Blocked stream host" ? message : "Unable to resolve stream host",
      };
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
