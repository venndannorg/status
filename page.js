const RECORD = "https://raw.githubusercontent.com/venndannorg/status/data/status.json";

const SERVICES = [
  { id: "api", name: "Inferra API" },
  { id: "website", name: "Website" },
  { id: "docs", name: "Documentation" },
  { id: "console", name: "Platform console" },
];

const DAYS = 90;

const STATE_TEXT = { up: "Working", slow: "Slow", down: "Not answering" };

function text(tag, content, className) {
  const node = document.createElement(tag);
  node.textContent = content;
  if (className) node.className = className;
  return node;
}

function lastDays() {
  const days = [];
  const today = new Date();
  for (let back = DAYS - 1; back >= 0; back -= 1) {
    const day = new Date(today);
    day.setUTCDate(today.getUTCDate() - back);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

function bar(date, day) {
  const cell = document.createElement("span");
  if (!day) {
    cell.className = "day none";
    cell.title = `${date}: no checks`;
    return cell;
  }
  const share = day.failed / day.checks;
  cell.className = share === 0 ? "day good" : share < 0.05 ? "day some" : "day bad";
  cell.title = `${date}: ${day.checks - day.failed} of ${day.checks} checks answered`;
  return cell;
}

function uptime(record, id) {
  let checks = 0;
  let failed = 0;
  for (const day of Object.values(record.days)) {
    checks += day[id]?.checks ?? 0;
    failed += day[id]?.failed ?? 0;
  }
  return checks === 0 ? "" : `${(((checks - failed) / checks) * 100).toFixed(2)}% over 90 days`;
}

function render(record) {
  const list = document.getElementById("services");
  const days = lastDays();
  const states = SERVICES.map((service) => record.current[service.id]?.state ?? "down");
  list.replaceChildren(
    ...SERVICES.map((service, index) => {
      const item = document.createElement("li");
      const head = document.createElement("div");
      head.className = "head";
      const state = states[index];
      head.append(
        text("h2", service.name),
        text("span", STATE_TEXT[state], `state ${state}`),
      );
      const history = document.createElement("div");
      history.className = "history";
      history.append(...days.map((date) => bar(date, record.days[date]?.[service.id])));
      item.append(head, history, text("p", uptime(record, service.id), "quiet"));
      return item;
    }),
  );
  const down = states.filter((state) => state === "down").length;
  const summary = document.getElementById("summary");
  summary.textContent =
    down === 0 ? "Everything is working." : `${down} of ${SERVICES.length} services are not answering.`;
  summary.className = down === 0 ? "summary good" : "summary bad";
  document.getElementById("checked").textContent =
    `Last checked ${new Date(record.checkedAt).toLocaleString()}.`;
}

fetch(`${RECORD}?at=${Date.now()}`, { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  })
  .then(render)
  .catch(() => {
    document.getElementById("summary").textContent =
      "The latest checks could not be read. Try again in a minute.";
  });
