import { existsSync, readFileSync, writeFileSync } from "node:fs";

const TARGETS = [
  { id: "api", url: "https://venndann.com/v1/health", json: true },
  { id: "website", url: "https://venndann.com/" },
  { id: "docs", url: "https://venndann.com/docs/" },
  { id: "console", url: "https://venndann.com/console/" },
];

const TIMEOUT_MS = 10_000;

const SLOW_MS = 3_000;

const KEEP_DAYS = 90;

const FILE = process.argv[2] ?? "status.json";

function saysOk(body) {
  try {
    return JSON.parse(body).ok === true;
  } catch {
    return false;
  }
}

async function probe(target) {
  const started = performance.now();
  try {
    const response = await fetch(target.url, {
      headers: { "user-agent": "venndann-status" },
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await response.text();
    const ms = Math.round(performance.now() - started);
    const healthy =
      response.status === 200 && (!target.json || saysOk(body));
    if (!healthy) {
      const detail = response.status === 200 ? "unexpected answer" : `HTTP ${response.status}`;
      return { state: "down", ms, detail };
    }
    return { state: ms > SLOW_MS ? "slow" : "up", ms, detail: "" };
  } catch (error) {
    const ms = Math.round(performance.now() - started);
    return { state: "down", ms, detail: error.name === "TimeoutError" ? "timeout" : "unreachable" };
  }
}

function previous() {
  if (!existsSync(FILE)) return { checkedAt: null, current: {}, days: {} };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

const status = previous();
const now = new Date();
const today = now.toISOString().slice(0, 10);
const results = await Promise.all(TARGETS.map(probe));

status.checkedAt = now.toISOString();
status.days[today] ??= {};
TARGETS.forEach((target, index) => {
  const result = results[index];
  status.current[target.id] = { ...result, at: status.checkedAt };
  const day = (status.days[today][target.id] ??= { checks: 0, failed: 0, slowestMs: 0 });
  day.checks += 1;
  if (result.state === "down") day.failed += 1;
  day.slowestMs = Math.max(day.slowestMs, result.ms);
});
status.days = Object.fromEntries(
  Object.entries(status.days)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .slice(-KEEP_DAYS),
);

writeFileSync(FILE, `${JSON.stringify(status, null, 2)}\n`);
console.log(TARGETS.map((target, index) => `${target.id}: ${results[index].state}`).join(", "));
