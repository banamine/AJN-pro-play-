const fs = require("node:fs");
const path = require("node:path");

const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));

if (pkg.engines?.node !== ">=22") {
  throw new Error("package.json must declare engines.node >=22");
}
if (!pkg.scripts?.lint || !pkg.scripts?.build || !pkg.scripts?.start) {
  throw new Error("package scripts must provide lint, build and start");
}
if (!pkg.scripts?.test) {
  throw new Error("package.json must define a test script");
}
