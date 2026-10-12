// Session-only production preview. No boot/login service or external exposure.
import { spawn, execFileSync } from "node:child_process";
import {
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { createServer, connect } from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const vite = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const record = "/tmp/oddwell-hospital-5206.json";
const log = "/tmp/oddwell-hospital-5206.log";
const command = process.argv[2] || "start";
function stop() {
  if (!existsSync(record)) return;
  const { pid } = JSON.parse(readFileSync(record, "utf8"));
  if (!Number.isSafeInteger(pid) || pid <= 1)
    throw new Error("Invalid server record.");
  let actual;
  try {
    actual = execFileSync("ps", ["-p", String(pid), "-o", "command="], {
      encoding: "utf8",
    });
  } catch {
    return;
  }
  if (!actual.includes(vite) || !actual.includes("--port 5206"))
    throw new Error(
      "Server identity changed; refusing to stop another process.",
    );
  process.kill(pid, "SIGTERM");
}
async function portIsFree() {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.listen(5206, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
if (command === "stop" || command === "restart") {
  stop();
  await new Promise((resolve) => setTimeout(resolve, 350));
  if (command === "stop") {
    console.log("Oddwell preview stopped.");
    process.exit(0);
  }
}
if (!["start", "restart"].includes(command))
  throw new Error("Use start, stop, or restart.");
if (!existsSync(new URL("../dist/index.html", import.meta.url)))
  throw new Error("Build first: npm run build");
if (!(await portIsFree()))
  throw new Error(
    "Port 5206 is occupied. Existing servers were left untouched.",
  );
const output = openSync(log, "a");
const child = spawn(
  process.execPath,
  [vite, "preview", "--host", "127.0.0.1", "--port", "5206", "--strictPort"],
  { cwd: root, detached: true, stdio: ["ignore", output, output] },
);
closeSync(output);
child.unref();
writeFileSync(record, JSON.stringify({ pid: child.pid, root, port: 5206 }));
let online = false;
for (let i = 0; i < 40 && !online; i++) {
  online = await new Promise((resolve) => {
    const socket = connect(5206, "127.0.0.1");
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
  if (!online) await new Promise((resolve) => setTimeout(resolve, 100));
}
if (!online) throw new Error(`Preview did not start. Read ${log}`);
console.log(
  `Oddwell Hospital: http://127.0.0.1:5206/ (detached PID ${child.pid}, log ${log})`,
);
