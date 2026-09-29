const { spawn } = require("node:child_process");
const { once } = require("node:events");
const net = require("node:net");
const path = require("node:path");

function getFreePort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.listen(0, "127.0.0.1", () => {
      const { port } = socket.address();
      socket.close(() => resolve(port));
    });
    socket.on("error", reject);
  });
}

async function waitForPort(port, timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await new Promise((resolve, reject) => {
        const socket = net.createConnection({ host: "127.0.0.1", port });
        socket.once("connect", () => {
          socket.destroy();
          resolve();
        });
        socket.once("error", reject);
      });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error(`Server did not listen on ${port} within ${timeoutMs}ms`);
}

async function main() {
  const port = await getFreePort();
  const child = spawn(process.execPath, ["dist/server.cjs"], {
    cwd: path.resolve(__dirname, ".."),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port)
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForPort(port);

    const response = await fetch(`http://127.0.0.1:${port}/api/stream-proxy`);
    if (response.status !== 400) {
      throw new Error(`Expected 400 from stream proxy contract, got ${response.status}`);
    }

    const body = await response.json();
    if (body.error !== "Missing required query parameter: url") {
      throw new Error("Unexpected stream proxy validation response");
    }
  } finally {
    child.kill("SIGTERM");
    await once(child, "exit").catch(() => {});
  }

  if (stderr) process.stderr.write(stderr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
