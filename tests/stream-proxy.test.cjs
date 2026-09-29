const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const {
  isPublicAddress,
  resolvePublicAddresses,
  openStreamProxy,
} = require("../dist/test-modules/stream-proxy.cjs");

test("accepts a public IPv4 address", () => {
  assert.equal(isPublicAddress("93.184.216.34", 4), true);
});

test("rejects private, loopback, link-local, multicast and reserved IPv4 ranges", () => {
  for (const address of [
    "0.0.0.0",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.16.0.1",
    "192.168.1.1",
    "224.0.0.1",
    "255.255.255.255",
  ]) {
    assert.equal(isPublicAddress(address, 4), false, address);
  }
});

test("rejects loopback, ULA, link-local and multicast IPv6", () => {
  for (const address of [
    "::",
    "::1",
    "fc00::1",
    "fd00::1",
    "fe80::1",
    "ff02::1",
  ]) {
    assert.equal(isPublicAddress(address, 6), false, address);
  }
});

test("unwraps IPv4-mapped IPv6 and rechecks the embedded IPv4", () => {
  assert.equal(isPublicAddress("::ffff:192.168.1.10", 6), false);
  assert.equal(isPublicAddress("::ffff:93.184.216.34", 6), true);
});

test("unwraps NAT64 IPv6 and rechecks the embedded IPv4", () => {
  assert.equal(isPublicAddress("64:ff9b::10.0.0.8", 6), false);
  assert.equal(isPublicAddress("64:ff9b::93.184.216.34", 6), true);
});

test("unwraps 6to4 IPv6 and rechecks the embedded IPv4", () => {
  assert.equal(isPublicAddress("2002:c0a8:0101::1", 6), false);
  assert.equal(isPublicAddress("2002:5db8:d822::1", 6), true);
});

test("rejects a public hostname that resolves to a private IPv4 address", async () => {
  await assert.rejects(
    resolvePublicAddresses("media.example.test", async () => [
      { address: "192.168.1.10", family: 4 },
    ]),
    /Blocked stream host/
  );
});

test("rejects a hostname if any returned address is non-public", async () => {
  await assert.rejects(
    resolvePublicAddresses("media.example.test", async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.8", family: 4 },
    ]),
    /Blocked stream host/
  );
});

test("accepts a hostname whose resolved addresses are all public", async () => {
  const result = await resolvePublicAddresses("media.example.test", async () => [
    { address: "93.184.216.34", family: 4 },
    { address: "2001:db8::10", family: 6 },
  ]);

  assert.deepEqual(result, [
    { address: "93.184.216.34", family: 4 },
    { address: "2001:db8::10", family: 6 },
  ]);
});

test("fails closed when DNS resolution returns no usable address", async () => {
  await assert.rejects(
    resolvePublicAddresses("media.example.test", async () => []),
    /Blocked stream host/
  );
});

test("connects through a real local HTTP server using the validated lookup path", async () => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "video/mp4" });
    res.end("local-stream-fixture");
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    const result = await openStreamProxy(
      `http://media.example.test:${address.port}/fixture.mp4`,
      new AbortController().signal,
      {
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
        isPublicAddress: (candidate, family) =>
          candidate === "127.0.0.1" && family === 4,
      }
    );

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.statusCode, 200);
      assert.equal(result.headers["content-type"], "video/mp4");
      assert.equal((await result.body.toArray()).toString(), "local-stream-fixture");
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
});
