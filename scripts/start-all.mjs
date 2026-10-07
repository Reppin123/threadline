#!/usr/bin/env node
// Supervisor: runs web (:3000), gateway (:3100) and worker (:3200) as child processes with prefixed logs,
// restart-on-crash with exponential backoff, a shared env and clean shutdown.
//   node scripts/start-all.mjs          production-ish (web: next start, builds first if .next is missing)
//   node scripts/start-all.mjs --dev    dev mode (next dev, tsx watch)
//   --only web,worker                   subset of services
// Env: loaded from <repo>/.env then <repo>/.env.local (gitignored; never overrides vars already set in the shell).
import { spawn, execFileSync } from "node:child_process";
import { connect } from "node:net";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DEV = args.includes("--dev") || process.env.START_ALL_MODE === "dev";
const onlyArg = args.find((a) => a.startsWith("--only"));
const ONLY = onlyArg ? (onlyArg.includes("=") ? onlyArg.split("=")[1] : args[args.indexOf(onlyArg) + 1]).split(",") : null;

// ---------- env ----------
function loadEnvFile(p) {
  if (!existsSync(p)) return 0;
  let n = 0;
  for (const raw of readFileSync(p, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.replace(/\s+#.*$/, "");
    if (process.env[m[1]] === undefined) { process.env[m[1]] = v; n++; }
  }
  return n;
}
const envFiles = [".env", ".env.local"].map((f) => join(ROOT, f)).filter(existsSync);
for (const f of envFiles.reverse()) loadEnvFile(f); // .env.local wins over .env; shell wins over both
envFiles.reverse();
// Secrets from the macOS Keychain when unset (see COORDINATION 16:05 / 16:12). Values are never printed.
const KEYCHAIN = [
  { service: "Threadline Spectrum", account: "SPECTRUM_PROJECT_ID", alt: "PHOTON_PROJECT_ID" },
  { service: "Threadline Spectrum", account: "SPECTRUM_PROJECT_SECRET", alt: "PHOTON_PROJECT_SECRET" },
  { service: "Threadline Anthropic", account: "ANTHROPIC_API_KEY" },
];
const keychainLoaded = [];
if (process.platform === "darwin" && process.env.THREADLINE_NO_KEYCHAIN !== "1") {
  for (const { service, account, alt } of KEYCHAIN) {
    if (process.env[account] || (alt && process.env[alt])) continue;
    try {
      const v = execFileSync("security", ["find-generic-password", "-s", service, "-a", account, "-w"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
      if (v) { process.env[account] = v; keychainLoaded.push(account); }
    } catch {}
  }
}
process.env.THREADLINE_DB ||= join(ROOT, "data", "threadline.db");
mkdirSync(dirname(process.env.THREADLINE_DB), { recursive: true });
process.env.PATH = `/opt/homebrew/bin:${process.env.HOME}/.local/bin:${process.env.PATH}`;
process.env.NODE_NO_WARNINGS ??= "1"; // hide node:sqlite ExperimentalWarning noise
const PORTS = { web: Number(process.env.WEB_PORT || 3000), gateway: Number(process.env.GATEWAY_PORT || 3100), worker: Number(process.env.WORKER_PORT || 3200) };

// ---------- services ----------
const pkg = (app) => { try { return JSON.parse(readFileSync(join(ROOT, "apps", app, "package.json"), "utf8")); } catch { return null; } };
const tsxBin = (app) => [join(ROOT, "apps", app, "node_modules/.bin/tsx"), join(ROOT, "apps/worker/node_modules/.bin/tsx")].find(existsSync);

// Resolve how to run an app at (re)start time so services that land later get picked up without restarting the supervisor.
function resolveCommand(name) {
  const cwd = join(ROOT, "apps", name);
  const p = pkg(name);
  if (!p) return { error: `apps/${name}/package.json missing` };
  const scripts = p.scripts || {};
  if (name === "web") {
    // Call next directly so WEB_PORT is honoured (the package scripts hardcode -p 3000).
    const next = join(cwd, "node_modules/.bin/next");
    if (!existsSync(next)) return { error: "apps/web/node_modules/.bin/next missing (run scripts/pnpm-locked.sh install)" };
    if (DEV) return { cmd: next, argv: ["dev", "-p", String(PORTS.web)], cwd };
    const distDir = process.env.NEXT_DIST_DIR || ".next";
    return { cmd: next, argv: ["start", "-p", String(PORTS.web)], cwd, prebuild: existsSync(join(cwd, distDir, "BUILD_ID")) ? null : ["build"] };
  }
  const want = DEV ? ["dev", "start"] : ["start", "dev"];
  const s = want.find((k) => scripts[k]);
  if (s) return { cmd: "pnpm", argv: ["run", s], cwd };
  // No script yet (e.g. gateway still being written) → run the conventional entry directly.
  for (const entry of ["src/index.ts", "src/server.ts", "src/main.ts"]) {
    if (existsSync(join(cwd, entry)) && tsxBin(name)) return { cmd: tsxBin(name), argv: [entry], cwd };
  }
  return { error: `apps/${name} has no start/dev script and no src/index.ts entry yet` };
}

const COLORS = { web: 36, gateway: 35, worker: 33, start: 32 };
const pad = Math.max(...Object.keys(COLORS).map((k) => k.length));
const tty = process.stdout.isTTY || process.env.FORCE_COLOR;
function prefix(name) { const t = name.padEnd(pad); return tty ? `\x1b[${COLORS[name] || 37}m${t} |\x1b[0m ` : `${t} | `; }
function say(name, msg) { process.stdout.write(prefix(name) + msg + "\n"); }
function pipe(name, stream, out) {
  let buf = "";
  stream.on("data", (d) => {
    buf += d;
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const l of lines) out.write(prefix(name) + l + "\n");
  });
  stream.on("end", () => { if (buf) out.write(prefix(name) + buf + "\n"); });
}

const services = ["web", "gateway", "worker"].filter((s) => !ONLY || ONLY.includes(s));
const state = Object.fromEntries(services.map((s) => [s, { child: null, restarts: 0, backoff: 1000, startedAt: 0, timer: null }]));
let shuttingDown = false;
let gatewayStdin = null;
if (process.stdin.isTTY && services.includes("gateway")) {
  process.stdin.on("data", (d) => { if (gatewayStdin?.writable) gatewayStdin.write(d); });
}

function spawnLogged(name, cmd, argv, cwd) {
  const child = spawn(cmd, argv, {
    cwd,
    env: { ...process.env, PORT: String(PORTS[name]), FORCE_COLOR: tty ? "1" : "0" },
    // gateway gets a held-open stdin: its terminal mode exits on EOF, and an interactive supervisor forwards typed lines to it.
    stdio: [name === "gateway" ? "pipe" : "ignore", "pipe", "pipe"],
    detached: true, // own process group → we can signal pnpm + its grandchildren together
  });
  if (name === "gateway") { child.stdin.on("error", () => {}); gatewayStdin = child.stdin; }
  pipe(name, child.stdout, process.stdout);
  pipe(name, child.stderr, process.stderr);
  return child;
}

function portBusy(port) {
  return new Promise((r) => {
    const sock = connect({ port, host: "127.0.0.1" });
    sock.once("connect", () => { sock.destroy(); r(true); });
    sock.once("error", () => r(false));
    sock.setTimeout(1000, () => { sock.destroy(); r(false); });
  });
}
async function start(name) {
  const st = state[name];
  st.timer = null;
  if (shuttingDown) return;
  const c = resolveCommand(name);
  if (c.error) {
    say(name, `not started: ${c.error} — retrying in 30s`);
    st.timer = setTimeout(() => start(name), 30_000);
    return;
  }
  if (await portBusy(PORTS[name])) {
    // Something (e.g. a developer's own `pnpm dev`) already serves this port: adopt it instead of crash-looping on EADDRINUSE.
    if (!st.adopted) say(name, `port ${PORTS[name]} already in use — adopting the running instance; will start ours if it goes away`);
    st.adopted = true;
    st.timer = setTimeout(() => start(name), 15_000);
    return;
  }
  if (st.adopted) say(name, `external instance on :${PORTS[name]} went away — starting ours`);
  st.adopted = false;
  if (c.prebuild) {
    say(name, `no production build found → next ${c.prebuild.join(" ")} (one-off)`);
    const b = spawnLogged(name, c.cmd, c.prebuild, c.cwd);
    st.child = b;
    b.on("exit", (code) => {
      st.child = null;
      if (shuttingDown) return;
      if (code === 0) return start(name);
      say(name, `build failed (exit ${code}) — retrying in ${Math.round(st.backoff / 1000)}s`);
      scheduleRestart(name);
    });
    return;
  }
  say(name, `starting: ${c.cmd === "pnpm" ? "pnpm " + c.argv.join(" ") : c.cmd.split("/").pop() + " " + c.argv.join(" ")} (cwd apps/${name}, port ${PORTS[name]})`);
  st.startedAt = Date.now();
  const child = spawnLogged(name, c.cmd, c.argv, c.cwd);
  st.child = child;
  child.on("error", (e) => say(name, `spawn error: ${e.message}`));
  child.on("exit", (code, sig) => {
    st.child = null;
    if (shuttingDown) return say(name, `stopped (${sig || code})`);
    if (Date.now() - st.startedAt > 60_000) st.backoff = 1000; // it was healthy for a while → reset backoff
    say(name, `exited (${sig || "code " + code}) — restarting in ${Math.round(st.backoff / 1000)}s`);
    scheduleRestart(name);
  });
}
function scheduleRestart(name) {
  const st = state[name];
  st.restarts++;
  st.timer = setTimeout(() => start(name), st.backoff);
  st.backoff = Math.min(st.backoff * 2, 30_000);
}

function killGroup(child, sig) {
  try { process.kill(-child.pid, sig); } catch { try { child.kill(sig); } catch {} }
}
async function shutdown(sig) {
  if (shuttingDown) { say("start", "second signal — killing everything"); for (const s of services) if (state[s].child) killGroup(state[s].child, "SIGKILL"); process.exit(1); }
  shuttingDown = true;
  say("start", `${sig} — stopping ${services.join(", ")} (worker finishes in-flight jobs; up to 60s)`);
  const waits = [];
  for (const s of services) {
    const st = state[s];
    if (st.timer) clearTimeout(st.timer);
    if (!st.child) continue;
    waits.push(new Promise((r) => st.child.once("exit", r)));
    killGroup(st.child, "SIGTERM");
  }
  const timeout = setTimeout(() => { say("start", "timeout — SIGKILL"); for (const s of services) if (state[s].child) killGroup(state[s].child, "SIGKILL"); }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 60_000));
  await Promise.all(waits);
  clearTimeout(timeout);
  say("start", "all stopped");
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGHUP", () => shutdown("SIGHUP"));

// ---------- health summary ----------
const HEALTH = { web: `http://localhost:${PORTS.web}/`, gateway: `http://localhost:${PORTS.gateway}/health`, worker: `http://localhost:${PORTS.worker}/health` };
async function probe(url) {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(5000), redirect: "manual" }); return r.status < 500; } catch { return false; }
}
async function reportHealth() {
  const deadline = Date.now() + (DEV ? 180_000 : 600_000);
  let last = "";
  while (!shuttingDown && Date.now() < deadline) {
    const res = await Promise.all(services.map(async (s) => [s, await probe(HEALTH[s])]));
    const line = res.map(([s, ok]) => `${s}=${ok ? "up" : "down"}`).join(" ");
    if (res.every(([, ok]) => ok)) { say("start", `all healthy: ${line}  →  ${process.env.APP_URL || `http://localhost:${PORTS.web}`}`); return; }
    if (line !== last) { last = line; }
    await new Promise((r) => setTimeout(r, 3000));
  }
  if (!shuttingDown) say("start", `still not healthy after startup window: ${last}`);
}

say("start", `mode=${DEV ? "dev" : "start"} db=${process.env.THREADLINE_DB} env=${envFiles.map((f) => f.replace(ROOT + "/", "")).join(",") || "(none)"}${keychainLoaded.length ? " keychain=" + keychainLoaded.join(",") : ""} services=${services.join(",")}`);
for (const s of services) start(s);
reportHealth();
