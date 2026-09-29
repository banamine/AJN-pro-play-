const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isPublicAddress,
  resolvePublicAddresses,
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
