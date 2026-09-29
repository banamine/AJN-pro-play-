const test = require("node:test");
const assert = require("node:assert/strict");

const { validateStreamProxyUrl } = require("../dist/test-modules/stream-url.cjs");

test("accepts a public HTTPS stream URL", () => {
  assert.deepEqual(
    validateStreamProxyUrl("https://example.com/media/master.m3u8"),
    { ok: true, url: "https://example.com/media/master.m3u8" }
  );
});

test("rejects malformed URLs", () => {
  assert.deepEqual(
    validateStreamProxyUrl("not-a-url"),
    { ok: false, error: "Invalid stream URL" }
  );
});

test("rejects unsupported protocols", () => {
  assert.deepEqual(
    validateStreamProxyUrl("file:///etc/passwd"),
    { ok: false, error: "Unsupported stream URL protocol" }
  );
});

test("rejects blocked IPv4 and metadata hosts", () => {
  for (const url of [
    "http://127.0.0.1:3000/live",
    "http://10.0.0.5/live",
    "http://172.16.0.5/live",
    "http://192.168.1.10/live",
    "http://169.254.169.254/latest/meta-data/",
    "http://metadata.google.internal/computeMetadata/v1/",
  ]) {
    assert.deepEqual(
      validateStreamProxyUrl(url),
      { ok: false, error: "Blocked stream host" },
      url
    );
  }
});

test("rejects blocked IPv6 hosts", () => {
  for (const url of [
    "http://[::1]/live",
    "http://[fd00::1]/live",
    "http://[fe80::1]/live",
  ]) {
    assert.deepEqual(
      validateStreamProxyUrl(url),
      { ok: false, error: "Blocked stream host" },
      url
    );
  }
});

test("returns canonical URL syntax for an accepted public URL", () => {
  const result = validateStreamProxyUrl("HTTPS://EXAMPLE.COM:443/media");
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.url, "https://example.com/media");
  }
});
