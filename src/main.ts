import "./style.css";
import {
  createGame,
  SCENARIOS,
  ROOM_INFO,
  ROLE_INFO,
  AILMENTS,
  WIDTH,
  HEIGHT,
  ENTRANCE,
  buildRoom,
  placementError,
  hireStaff,
  assignStaff,
  sellRoom,
  dismissStaff,
  grant,
  satisfaction,
  queueFor,
  serviceFor,
  roomStaff,
  step,
  saveGame,
  restoreGame,
  contains,
  equal,
  eligible,
  door,
  roomPrice,
  blueprintFromDrag,
} from "./game";
import type {
  RoomKind,
  Role,
  Room,
  Patient,
  RoomLayout,
  DoorSide,
  Point,
} from "./game";
let game = createGame(),
  paused = true,
  speed = 1,
  tool: RoomKind | null = null,
  selected: number | null = null,
  panel: "rooms" | "staff" | "patients" = "rooms";
let accumulator = 0,
  last = performance.now(),
  dialogAction: (() => void) | null = null,
  returnFocus: HTMLElement | null = null;
let draft: (RoomLayout & Point) | null = null;
let draftPhase: "size" | "door" = "size";
let dragStart: Point | null = null;
const storageKey = "oddwell-hospital-v1";
const app = document.querySelector<HTMLDivElement>("#app")!;
const money = (n: number) =>
  `${n < 0 ? "−" : ""}$${Math.abs(n).toLocaleString("en-US")}`;
const esc = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const button = (action: string, label: string, cls = "", extra = "") =>
  `<button type="button" class="${cls}" data-action="${action}" ${extra}>${label}</button>`;
app.innerHTML = `<header class="topbar"><a class="brand" href="#" aria-label="Oddwell Hospital home"><span class="brand-mark">✚</span><span>ODDWELL<small>HOSPITAL</small></span></a><span class="motto">A peculiar practice.<br>A little care goes a long way.</span><nav aria-label="Game controls">${button("help", "? <span>Handbook</span>")}${button("save", "↓ <span>Save</span>")}${button("load", "↻ <span>Load</span>")}${button("restart", "<span>Restart</span>", "subtle")}</nav></header>
<main><section class="heading"><div><p class="eyebrow" id="chapter"></p><h1 id="scenario-name"></h1><p id="scenario-brief"></p></div><div class="seal"><span>DEPARTMENT OF</span><b>PECULIAR<br>CARE</b><span>EST. WHENEVER</span></div></section>
<section id="metrics" class="metrics" aria-label="Hospital dashboard"></section>
<div class="workspace"><section class="floor-panel"><div class="section-heading"><div><p class="eyebrow">THE FLOOR PLAN</p><h2>Make room for the unusual.</h2></div><div class="time-controls"><span id="clock"></span>${button("pause", "▶ Open clinic", "primary", 'id="pause"')}${[1, 2, 4].map((n) => button(`speed:${n}`, `${n}×`, "speed", `aria-label="Speed ${n} times" aria-pressed="${n === 1}"`)).join("")}</div></div>
<div class="build-toolbar" id="build-toolbar"></div><div class="plan-status" id="plan-status" role="status">Select a room, drag its rectangle, choose a wall door, then confirm.</div><div id="blueprint-controls" class="blueprint-controls" hidden></div><div class="floor-scroll"><div class="floor-frame"><div class="north-label">ODDWELL MUNICIPAL HEALTH SERVICE <span>↑ NORTH</span></div><div id="floor" class="floor"><div id="tiles" class="tiles"></div><div id="scenery" aria-hidden="true"></div><div id="room-art" aria-hidden="true"></div><div id="people" aria-hidden="true"></div><div id="preview" aria-hidden="true"></div></div><div class="floor-bottom"><span>↳ RECEPTION</span><span class="floor-legend">● Patient &nbsp; ✚ Clinician &nbsp; ⌁ Technician &nbsp; ▰ Door</span></div></div></div>
<div class="notice" id="notice"></div><div id="outcome-actions"></div><section class="objectives" id="objectives" aria-label="Accreditation objectives"></section><div class="footer-note">Entirely fictional ailments. Entirely earnest management.<span>Built with care · No medical advice · No audio</span></div></section>
<aside><div class="tabs" role="tablist" aria-label="Management panels">${(["rooms", "staff", "patients"] as const).map((p) => button(`panel:${p}`, p[0].toUpperCase() + p.slice(1), "", `role="tab" aria-selected="${p === "rooms"}"`)).join("")}</div><div id="sidebar"></div><div class="grant-box"><span class="eyebrow">A LITTLE SAFETY NET</span><h3>Council emergency grant</h3><p>One rescue per scenario. No paperwork, just a mildly disappointed pigeon.</p>${button("grant", "Request $1,800", "", `id="grant"`)}</div><div class="tip"><span>DIRECTOR’S NOTE</span><p id="director-tip"></p></div></aside></div></main><div id="toast" role="status" aria-live="polite"></div>
<dialog id="dialog" aria-labelledby="dialog-title"><div class="dialog-top"><span class="brand-mark">✚</span>${button("close-dialog", "×", "icon", 'aria-label="Close dialog"')}</div><p class="eyebrow" id="dialog-eyebrow"></p><h2 id="dialog-title"></h2><div id="dialog-content"></div><div id="dialog-actions" class="dialog-actions"></div></dialog>`;
const dialog = document.querySelector<HTMLDialogElement>("#dialog")!;
const tiles = document.querySelector<HTMLDivElement>("#tiles")!;
for (let y = 0; y < HEIGHT; y++)
  for (let x = 0; x < WIDTH; x++)
    tiles.insertAdjacentHTML(
      "beforeend",
      `<button class="tile" data-x="${x}" data-y="${y}" aria-label="Floor tile ${x + 1}, ${y + 1}"></button>`,
    );
function toast(message: string) {
  const el = document.querySelector("#toast")!;
  el.textContent = message;
  el.classList.add("show");
  window.setTimeout(() => el.classList.remove("show"), 3500);
}
function openDialog(
  title: string,
  content: string,
  actionLabel = "Back to hospital",
  action: (() => void) | null = null,
  eyebrow = "ODDWELL BULLETIN",
) {
  if (dialog.open) dialog.close();
  returnFocus = document.activeElement as HTMLElement;
  document.querySelector("#dialog-title")!.textContent = title;
  document.querySelector("#dialog-eyebrow")!.textContent = eyebrow;
  document.querySelector("#dialog-content")!.innerHTML = content;
  document.querySelector("#dialog-actions")!.innerHTML =
    button("close-dialog", action ? "Cancel" : "Close", "subtle") +
    button("dialog-confirm", actionLabel, "primary");
  dialogAction = action;
  accumulator = 0;
  dialog.showModal();
}
function closeDialog() {
  dialog.close();
  dialogAction = null;
  accumulator = 0;
  last = performance.now();
  returnFocus?.focus();
}
function handbook() {
  openDialog(
    "A crash course in peculiar care",
    `<p class="dialog-lead">Build a small hospital. Make unusual people feel better. Stay solvent.</p><ol class="handbook"><li><b>Plan while paused.</b> Pick Consultation, drag a 2–4 tile rectangle, then click a corridor tile directly beside a wall to place its door. Confirm the blueprint to pay. Coordinate, size and door controls offer a keyboard alternative. Corridors must connect to reception.</li><li><b>Build treatments.</b> Echo patients need a Resonance booth. Later, add an Unfolding studio and Groove lab. Put rooms close to reception for happier patients.</li><li><b>Hire & assign.</b> Open Staff, hire a clinician for Consultation and technicians for treatments. Each person needs a room assignment. Experts work 50% faster.</li><li><b>Open the clinic.</b> Patients walk, queue, receive diagnosis, seek treatment and leave cured. Match the door badges to the room inspector to spot bottlenecks.</li><li><b>Earn accreditation.</b> Reach all three objectives. Wages continue every second: dismiss idle staff, sell spare rooms, or use the one-time grant. Twelve walkouts, a balance below −$500, or inspection at 12:00 ends a scenario.</li></ol><p class="fineprint">Space pauses · Escape cancels building/dialogs · Save is manual · Loading starts paused · Complete all three scenarios to finish the campaign.</p>`,
  );
}
function furniture(kind: RoomKind) {
  const plant =
    '<rect x="72" y="12" width="13" height="11" rx="3" fill="#ad7560"/><circle cx="79" cy="12" r="9" fill="#548964"/><path d="M79 6v13m-6-8 6 3 6-3" stroke="#b2d3a1" fill="none"/>';
  const shapes: Record<RoomKind, string> = {
    consult:
      '<rect x="12" y="24" width="37" height="26" rx="4" fill="#bd8961" stroke="#855e45" stroke-width="2"/><rect x="17" y="27" width="12" height="9" rx="1" fill="#f8f4e8"/><rect x="36" y="29" width="8" height="10" rx="1" fill="#294e51"/><rect x="24" y="14" width="14" height="8" rx="3" fill="#285f59"/><rect x="20" y="54" width="17" height="10" rx="3" fill="#e9ca66"/><rect x="64" y="37" width="19" height="35" rx="4" fill="#f4f1df" stroke="#507b74" stroke-width="2"/><rect x="67" y="40" width="13" height="8" rx="2" fill="#c5e0d8"/>',
    echo: '<circle cx="35" cy="40" r="23" fill="#bb8644" stroke="#8d672f" stroke-width="2"/><circle cx="35" cy="40" r="16" fill="#f7dfa2"/><path d="M24 40q11-25 22 0q-11 25-22 0" fill="none" stroke="#ae753b" stroke-width="3"/><rect x="64" y="40" width="19" height="25" rx="4" fill="#356664"/><circle cx="74" cy="48" r="4" fill="#93dbb3"/><path d="M65 60h17" stroke="#f2e5b1" stroke-width="2"/>',
    paper:
      '<rect x="15" y="28" width="42" height="36" rx="4" fill="#ae6a96" stroke="#805776" stroke-width="2"/><path d="m20 47 18-15 13 22-24 6Z" fill="#fff5eb"/><path d="m20 47 31 7-13-22-1 28" fill="none" stroke="#c8a1b9"/><rect x="66" y="39" width="17" height="30" rx="3" fill="#b78d62"/><path d="M68 46h13m-13 8h13m-13 8h13" stroke="#f6ebce" stroke-width="4"/>',
    groove:
      '<circle cx="37" cy="45" r="25" fill="#7187bb" stroke="#4a5d8c" stroke-width="2"/><path d="M17 40h40M17 51h40m-14-25v39M31 24v43" stroke="#a3b4d5"/><circle cx="37" cy="45" r="7" fill="#f4d481"/><rect x="69" y="40" width="13" height="28" rx="3" fill="#334c77"/><circle cx="75" cy="47" r="3" fill="#b4cce8"/><circle cx="75" cy="60" r="5" fill="#151f38"/>',
  };
  return `<svg viewBox="0 0 100 100" class="furniture">${plant}${shapes[kind]}</svg>`;
}
function drawRooms() {
  document.querySelector("#room-art")!.innerHTML = game.rooms
    .map((r) => {
      const info = ROOM_INFO[r.kind],
        staff = roomStaff(game, r.id),
        queue = queueFor(game, r.id).length,
        service = serviceFor(game, r.id);
      return `<div class="room ${selected === r.id ? "selected" : ""}" style="left:${(r.x / 12) * 100}%;top:${(r.y / 8) * 100}%;width:${(r.width / WIDTH) * 100}%;height:${(r.height / HEIGHT) * 100}%;--room-color:${info.color}"><div class="room-wall"></div>${furniture(r.kind)}<span class="room-sign">${info.icon} ${r.kind === "consult" ? "Consultation" : r.kind === "echo" ? "Resonance" : r.kind === "paper" ? "Unfolding" : "Groove lab"}</span><span class="room-id">${r.id}</span><div class="door ${r.entry.side}" style="${doorStyle(r)}"></div><span class="queue-badge ${staff ? "" : "unstaffed"}">${!staff ? "! No staff" : service ? `● ${queue} waiting` : `${queue} waiting`}</span></div>`;
    })
    .join("");
  document.querySelector("#scenery")!.innerHTML =
    `<div class="reception" style="left:0;top:50%"><span>✚</span><small>IN / OUT</small></div>` +
    SCENARIOS[game.scenario].obstacles
      .map(
        (o) =>
          `<div class="garden" style="left:${(o.x / 12) * 100}%;top:${(o.y / 8) * 100}%">✿</div>`,
      )
      .join("");
  for (const tile of tiles.querySelectorAll<HTMLButtonElement>(".tile")) {
    const x = Number(tile.dataset.x),
      y = Number(tile.dataset.y),
      room = game.rooms.find((r) => contains(r, { x, y }));
    tile.setAttribute(
      "aria-label",
      `Floor tile ${x + 1}, ${y + 1}${room ? `, ${ROOM_INFO[room.kind].name} room ${room.id}` : ""}`,
    );
    tile.classList.toggle("occupied", !!room);
  }
}
function patientSvg(p: Patient) {
  const color = ROOM_INFO[p.ailment].color;
  return `<svg viewBox="0 0 28 36"><ellipse cx="14" cy="32" rx="10" ry="3" fill="#164849" opacity=".17"/><path d="M10 26v5m8-5v5" stroke="#334e50" stroke-width="4" stroke-linecap="round"/><rect x="6" y="13" width="16" height="14" rx="5" fill="${p.stage === "exit" ? "#8bbd89" : color}" stroke="#626451" stroke-width="1"/><circle cx="14" cy="9" r="7" fill="#edbd94"/><path d="M7 7q0-7 8-6l6 5" fill="${p.id % 2 ? "#72523f" : "#b27849"}"/><circle cx="12" cy="9" r=".9"/><circle cx="17" cy="9" r=".9"/><path d="M12 12h4" stroke="#9d694f"/><text x="14" y="23" text-anchor="middle" font-size="10" fill="#414c51">${p.stage === "exit" ? "✓" : ROOM_INFO[p.ailment].icon}</text></svg>`;
}
function drawPeople() {
  const offsets = new Map<string, number>();
  document.querySelector("#people")!.innerHTML =
    game.patients
      .map((p) => {
        const room = game.rooms.find((r) => r.id === p.target),
          inRoom = p.mode === "service" && room;
        const key = `${p.x},${p.y}`;
        const offset = offsets.get(key) || 0;
        offsets.set(key, offset + 1);
        const x = inRoom
            ? room.x + room.width * 0.45
            : p.x + 0.2 + (offset % 3) * 0.22,
          y = inRoom
            ? room.y + room.height * 0.525
            : p.y + 0.1 + (Math.floor(offset / 3) % 2) * 0.26;
        return `<div class="person ${p.stage === "exit" ? "cured" : ""}" style="left:${(x / 12) * 100}%;top:${(y / 8) * 100}%" title="Patient ${p.id} · ${AILMENTS[p.ailment]}">${patientSvg(p)}${p.patience < 45 ? '<span class="impatient">!</span>' : ""}</div>`;
      })
      .join("") +
    game.staff
      .filter((s) => s.room !== null)
      .map((s) => {
        const r = game.rooms.find((r) => r.id === s.room)!;
        return `<div class="staff-dot" style="left:${((r.x + 0.4) / 12) * 100}%;top:${((r.y + 0.9) / 8) * 100}%"><svg viewBox="0 0 24 32"><ellipse cx="12" cy="29" rx="8" ry="2" fill="#235c5b" opacity=".2"/><path d="M8 25v4m8-4v4" stroke="#365955" stroke-width="3"/><rect x="5" y="12" width="14" height="14" rx="4" fill="${s.role === "technician" ? "#355e74" : "#fffcf0"}"/><circle cx="12" cy="8" r="6" fill="#dcae86"/><path d="M6 5q7-9 13 1" fill="#494846"/><text x="12" y="22" text-anchor="middle" font-size="11" fill="${s.role === "technician" ? "#fff" : "#5d9e90"}">${s.role === "technician" ? "⌁" : "✚"}</text></svg></div>`;
      })
      .join("");
}
function renderMetrics() {
  const s = SCENARIOS[game.scenario],
    wages =
      game.rooms.length +
      game.staff.reduce((sum, s) => sum + ROLE_INFO[s.role].wage, 0);
  document.querySelector("#metrics")!.innerHTML =
    `<div class="metric"><span>Hospital balance</span><b class="${game.cash < 1000 ? "warning" : ""}">${money(game.cash)}</b><small>${money(wages)} / sec operating cost</small></div><div class="metric"><span>Patients cured</span><b>${game.cures}<em> / ${s.cures}</em></b><small>${game.patients.filter((p) => p.stage !== "exit").length} currently in care</small></div><div class="metric"><span>Patient satisfaction</span><b>${satisfaction(game)}<em>%</em></b><small>${game.cures ? "Average of cured patients" : "Awaiting your first cure"}</small></div><div class="metric"><span>Walkouts</span><b>${game.walkouts}<em> / 12</em></b><small>${12 - game.walkouts} before council closure</small></div>`;
  document.querySelector("#clock")!.textContent =
    `${String(Math.floor(game.tick / 60)).padStart(2, "0")}:${String(game.tick % 60).padStart(2, "0")}`;
  const pause = document.querySelector<HTMLButtonElement>("#pause")!;
  pause.textContent =
    game.status !== "active"
      ? "Clinic closed"
      : paused
        ? "▶ Open clinic"
        : "Ⅱ Pause";
  pause.disabled = game.status !== "active";
  document
    .querySelectorAll<HTMLButtonElement>(".speed")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(Number(b.dataset.action!.split(":")[1]) === speed),
      ),
    );
  document.querySelector<HTMLButtonElement>("#grant")!.disabled =
    game.grantUsed || game.status !== "active";
  document.querySelector("#grant")!.textContent = game.grantUsed
    ? "Grant received ✓"
    : "Request $1,800";
  const obj = (label: string, value: number, target: number, display: string) =>
    `<div class="objective"><span>${value >= target ? "✓" : "○"} ${label}<b>${display}</b></span><div class="track"><i style="width:${Math.min(100, Math.max(0, (value / target) * 100))}%"></i></div></div>`;
  document.querySelector("#objectives")!.innerHTML =
    `<div class="objective-heading"><span class="eyebrow">NEXT ACCREDITATION</span><strong>Three goals. One happy hospital.</strong></div>${obj("Cures", game.cures, s.cures, `${game.cures} / ${s.cures}`)}${obj("Satisfaction", game.cures ? satisfaction(game) : 0, s.satisfaction, `≥ ${s.satisfaction}%`)}${obj("Cash reserve", game.cash, s.reserve, `≥ ${money(s.reserve)}`)}`;
  const unstaffed = game.rooms.filter((r) => !roomStaff(game, r.id)),
    needed = SCENARIOS[game.scenario].ailments.filter(
      (a) => !game.rooms.some((r) => r.kind === a),
    ),
    backlog = game.rooms.find((r) => queueFor(game, r.id).length >= 3);
  let msg =
    "All systems gently humming. Keep an eye on queues and operating costs.";
  if (!game.rooms.some((r) => r.kind === "consult"))
    msg =
      "Start with a Consultation room, then assign a clinician. Patients need a diagnosis before treatment.";
  else if (unstaffed.length)
    msg = `${unstaffed.length} room${unstaffed.length > 1 ? "s need" : " needs"} staff. Hire in the Staff panel and choose a room assignment.`;
  else if (needed.length)
    msg = `Missing treatment: ${needed.map((a) => ROOM_INFO[a].name).join(", ")}. Build it before patients lose patience.`;
  else if (backlog)
    msg = `Bottleneck at ${ROOM_INFO[backlog.kind].name} #${backlog.id}. Try an expert, a second room, or a shorter walking route.`;
  if (game.cash < 500)
    msg =
      "Cash is tight. Request your grant, dismiss idle staff, or sell a spare room for 70% of its price.";
  if (game.status !== "active") msg = game.reason;
  document.querySelector("#outcome-actions")!.innerHTML =
    game.status === "active"
      ? ""
      : button(
          "results",
          game.status === "lost"
            ? "Review results & retry →"
            : game.scenario === 2
              ? "Campaign complete · View award →"
              : "Accredited · Continue to next hospital →",
          "primary full",
        );
  document.querySelector("#notice")!.innerHTML =
    `<span>${game.status === "won" ? "✓" : "✦"}</span><p>${esc(msg)}</p>`;
  document.querySelector("#director-tip")!.textContent = [
    "Compact corridors make happy patients. Choose the door nearest your patients while keeping corridors open.",
    "Treatments are different jobs. Technicians can cure, but only clinicians can diagnose.",
    "A busy consultation room can hold up the whole hospital. Experts may be worth the extra wages.",
  ][game.scenario];
}
function renderToolbar() {
  document.querySelector("#build-toolbar")!.innerHTML =
    (Object.keys(ROOM_INFO) as RoomKind[])
      .map((kind) => {
        const info = ROOM_INFO[kind],
          locked =
            kind !== "consult" &&
            !SCENARIOS[game.scenario].ailments.some((a) => a === kind);
        return button(
          `build:${kind}`,
          `<span class="tool-icon" style="background:${info.color}">${info.icon}</span><span>${info.name}<small>${locked ? "Opens later" : money(info.cost)}</small></span>`,
          tool === kind ? "chosen" : "",
          `aria-pressed="${tool === kind}" ${locked || game.status !== "active" ? "disabled" : ""}`,
        );
      })
      .join("") +
    button(
      "cancel-build",
      "↖ Inspect",
      "inspect-tool",
      `aria-pressed="${tool === null}"`,
    );
}
function renderSidebar() {
  const sidebar = document.querySelector("#sidebar")!;
  if (panel === "staff") {
    sidebar.innerHTML = `<div class="panel-title"><span class="eyebrow">THE PEOPLE DEPARTMENT</span><h2>A very capable crew.</h2><p>Hire, then choose a room. Idle staff still earn wages.</p></div><div class="hire-options">${(
      Object.keys(ROLE_INFO) as Role[]
    )
      .map((role) => {
        const info = ROLE_INFO[role];
        return button(
          `hire:${role}`,
          `<span><b>${info.name}</b><small>${role === "expert" ? "Any room · 50% faster" : role === "technician" ? "Treatment rooms only" : "Any room"} · ${money(info.wage)}/sec</small></span><strong>${money(info.hire)} +</strong>`,
          "hire",
          game.status !== "active" ? "disabled" : "",
        );
      })
      .join("")}</div><div class="roster">${
      game.staff.length
        ? game.staff
            .map(
              (member) =>
                `<article class="staff-card"><div><span class="avatar">${member.role === "technician" ? "⌁" : "✚"}</span><div><b>${esc(member.name)}</b><small>${ROLE_INFO[member.role].name}</small></div>${button(`dismiss:${member.id}`, "×", "icon", `aria-label="Dismiss ${esc(member.name)}"`)}</div><label>Assignment<select aria-label="Assign ${esc(member.name)}" data-staff="${member.id}" ${game.status !== "active" ? "disabled" : ""}><option value="" ${member.room === null ? "selected" : ""}>Unassigned</option>${game.rooms
                  .filter((r) => eligible(member.role, r.kind))
                  .map(
                    (r) =>
                      `<option value="${r.id}" ${member.room === r.id ? "selected" : ""} ${game.staff.some((s) => s.id !== member.id && s.room === r.id) ? "disabled" : ""}>${ROOM_INFO[r.kind].name} #${r.id}</option>`,
                  )
                  .join("")}</select></label></article>`,
            )
            .join("")
        : '<div class="empty"><span>✚</span><b>Your team starts here.</b><p>A clinician for diagnosis. A technician for each treatment.</p></div>'
    }</div>`;
  } else if (panel === "patients") {
    sidebar.innerHTML = `<div class="panel-title"><span class="eyebrow">THE WAITING ROOM</span><h2>Peculiar people.</h2><p>Each color and symbol matches a treatment. Waiting costs patience.</p></div><div class="patient-list">${game.patients.length ? game.patients.map((p) => `<article class="patient-card"><span class="patient-symbol" style="background:${ROOM_INFO[p.ailment].color}">${ROOM_INFO[p.ailment].icon}</span><div><b>Patient #${p.id}</b><small>${AILMENTS[p.ailment]}</small><span>${p.stage === "exit" ? "Cured · heading home" : p.mode === "service" ? (p.stage === "consult" ? "In consultation" : "In treatment") : p.target === null ? "Waiting for a staffed room" : p.mode === "walking" ? "Walking to room #" + p.target : "Queued at room #" + p.target}</span><div class="track"><i style="width:${(p.patience / SCENARIOS[game.scenario].patience) * 100}%"></i></div><small>${p.patience}s patience remaining</small></div></article>`).join("") : '<div class="empty"><span>☺</span><b>A peaceful moment.</b><p>Open the clinic to welcome your first patients.</p></div>'}</div>`;
  } else {
    const room = game.rooms.find((r) => r.id === selected);
    if (room) {
      const info = ROOM_INFO[room.kind],
        member = roomStaff(game, room.id),
        patient = serviceFor(game, room.id),
        available = game.staff.filter((s) => eligible(s.role, room.kind));
      sidebar.innerHTML = `<div class="panel-title"><span class="eyebrow">ROOM ${room.id} / INSPECTOR</span><h2>${info.name}</h2><p>${info.detail} ${room.width}×${room.height} · ${room.entry.side} door · built for ${money(room.purchasePrice)}.</p></div><div class="room-portrait" style="--room-color:${info.color}">${furniture(room.kind)}</div><div class="room-stats"><div><b id="room-queue">${queueFor(game, room.id).length}</b><span>Waiting / en route</span></div><div><b>${info.duration}s</b><span>Base service time</span></div></div><div class="service-status" id="service-status">${patient ? `Patient #${patient.id} · ${Math.round((patient.progress / info.duration) * 100)}% complete` : member ? "Ready for the next patient" : "Waiting for an assigned staff member"}</div><label class="assignment-label">Room staff<select aria-label="Staff for room ${room.id}" data-room="${room.id}" ${game.status !== "active" ? "disabled" : ""}><option value="">No staff assigned</option>${available.map((s) => `<option value="${s.id}" ${member?.id === s.id ? "selected" : ""}>${esc(s.name)} · ${ROLE_INFO[s.role].name}${s.room && s.room !== room.id ? " (reassign)" : ""}</option>`).join("")}</select></label>${available.length ? "" : button("panel:staff", "Hire staff →", "primary full")}<p class="fineprint">Reassigning interrupts service until another worker takes over. ${member ? `Current wages ${money(ROLE_INFO[member.role].wage)}/sec.` : ""}</p>${button(`sell:${room.id}`, `Sell room · ${money(Math.floor(room.purchasePrice * 0.7))}`, "danger full", game.status !== "active" ? "disabled" : "")}`;
    } else
      sidebar.innerHTML = `<div class="panel-title"><span class="eyebrow">THE ESTATES DEPARTMENT</span><h2>Every room matters.</h2><p>Click a room on the floor to inspect its queue, assign staff, or sell it.</p></div>${game.rooms.length ? `<div class="room-list">${game.rooms.map((r) => button(`inspect:${r.id}`, `<span class="tool-icon" style="background:${ROOM_INFO[r.kind].color}">${ROOM_INFO[r.kind].icon}</span><span><b>${ROOM_INFO[r.kind].name}</b><small>#${r.id} · ${roomStaff(game, r.id) ? `${queueFor(game, r.id).length} waiting` : "Needs staff"}</small></span><span>→</span>`)).join("")}</div>` : '<div class="empty"><span>⌂</span><b>A blank floor. Big possibilities.</b><p>Build Consultation and a Resonance booth to begin.</p></div>'}<div class="ledger"><h3>The accounts</h3><p>Income <b>${money(game.income)}</b></p><p>Expenses <b>${money(game.expenses)}</b></p><small>Includes construction, hiring, wages, cures, diagnosis, grants and refunds.</small></div>`;
  }
  document
    .querySelectorAll('[role="tab"]')
    .forEach((t) =>
      t.setAttribute(
        "aria-selected",
        String(t.getAttribute("data-action") === `panel:${panel}`),
      ),
    );
}
function render(all = true) {
  const s = SCENARIOS[game.scenario];
  document.querySelector("#chapter")!.textContent = s.subtitle;
  document.querySelector("#scenario-name")!.textContent = s.name;
  document.querySelector("#scenario-brief")!.textContent = s.brief;
  renderMetrics();
  drawRooms();
  drawPeople();
  if (tool) drawBlueprint();
  if (all) {
    renderToolbar();
    renderSidebar();
  } else if (panel === "patients" || (panel === "rooms" && selected === null))
    renderSidebar();
  else if (panel === "rooms" && selected) {
    const r = game.rooms.find((r) => r.id === selected);
    if (r) {
      const q = document.querySelector("#room-queue"),
        service = document.querySelector("#service-status");
      if (q) q.textContent = String(queueFor(game, r.id).length);
      if (service) {
        const p = serviceFor(game, r.id);
        service.textContent = p
          ? `Patient #${p.id} · ${Math.round((p.progress / ROOM_INFO[r.kind].duration) * 100)}% complete`
          : roomStaff(game, r.id)
            ? "Ready for the next patient"
            : "Waiting for an assigned staff member";
      }
    }
  }
}
function clearTool() {
  tool = null;
  draft = null;
  dragStart = null;
  document.querySelector<HTMLElement>("#blueprint-controls")!.hidden = true;
  document.querySelector("#preview")!.innerHTML = "";
  document.querySelector("#plan-status")!.textContent =
    "Select a room, drag its rectangle, choose a wall door, then confirm.";
  renderToolbar();
}
function fresh(scenario: number) {
  game = createGame(scenario);
  paused = true;
  selected = null;
  panel = "rooms";
  clearTool();
  accumulator = 0;
  render();
  scenarioIntro();
}
function scenarioIntro() {
  const s = SCENARIOS[game.scenario];
  openDialog(
    s.name,
    `<p class="dialog-lead">${s.brief}</p><div class="brief-stats"><span><b>${money(s.cash)}</b>Starting budget</span><span><b>${s.cures}</b>Cures needed</span><span><b>${s.satisfaction}%</b>Happy patients</span></div><p><b>Your first steps:</b> build Consultation and ${s.ailments.map((a) => ROOM_INFO[a].name).join(", ")}. Hire one clinician for diagnosis and one technician per treatment. Then open the clinic.</p><p class="fineprint">All building and hiring can happen while paused. Rooms need a clear corridor to reception, and a clear corridor tile beside their chosen wall door.</p>`,
    "Let’s build",
    null,
    `SCENARIO ${game.scenario + 1} OF 3`,
  );
}
function ended() {
  paused = true;
  clearTool();
  render();
  if (game.status === "won") {
    const last = game.scenario === 2;
    openDialog(
      last ? "A wonderfully odd success." : "Accreditation, achieved.",
      `<div class="award">✹<span>${last ? "ODDWELL EXCELLENCE AWARD" : "COUNCIL ACCREDITATION"}</span></div><p class="dialog-lead">${last ? "You turned three strange outbreaks into a thriving institution. The town is healthier, the corridors are clearer, and the council pigeon is finally impressed." : "Your hospital passed inspection. A larger challenge is waiting across town."}</p><div class="brief-stats"><span><b>${game.cures}</b>Patients cured</span><span><b>${satisfaction(game)}%</b>Satisfaction</span><span><b>${money(game.cash)}</b>Cash remaining</span></div><p>${last ? "Campaign complete. Thank you for caring for the unusual. Replay any challenge by starting a new campaign." : "The next scenario starts with a fresh building and a larger budget. Your manual save stays intact until you save again."}</p>`,
      last ? "New campaign" : "Next hospital",
      () => fresh(last ? 0 : game.scenario + 1),
      last ? "CAMPAIGN COMPLETE" : "INSPECTION PASSED",
    );
  } else
    openDialog(
      "Time for a fresh start.",
      `<p class="dialog-lead">${esc(game.reason)}</p><p>Build a compact diagnosis room and all available treatments while paused. Hire just enough staff, then open. You get a fresh budget and grant when you retry.</p>`,
      "Retry scenario",
      () => fresh(game.scenario),
      "COUNCIL NOTICE",
    );
}
app.addEventListener("click", (event) => {
  const target = (event.target as Element).closest<HTMLButtonElement>(
    "[data-action]",
  );
  if (!target || target.disabled) return;
  const [action, arg] = target.dataset.action!.split(":");
  let error = "";
  if (dialog.open && !["close-dialog", "dialog-confirm"].includes(action))
    return;
  switch (action) {
    case "help":
      handbook();
      break;
    case "results":
      ended();
      break;
    case "pause":
      paused = !paused;
      accumulator = 0;
      renderMetrics();
      break;
    case "speed":
      speed = Number(arg);
      accumulator = 0;
      renderMetrics();
      break;
    case "build":
      tool = arg as RoomKind;
      selected = null;
      draft = {
        x: 1,
        y: 1,
        width: 2,
        height: 2,
        entry: { side: "south", offset: 0 },
      };
      draftPhase = "size";
      showBlueprintControls();
      drawBlueprint();
      renderToolbar();
      renderSidebar();
      break;
    case "confirm-build":
      if (tool && draft) {
        error = buildRoom(game, tool, draft.x, draft.y, draft);
        if (!error) {
          selected = game.rooms.at(-1)!.id;
          panel = "rooms";
          clearTool();
          render();
          toast("Room built. Assign staff in the inspector.");
        } else drawBlueprint();
      }
      break;
    case "redraw-build":
      draftPhase = "size";
      drawBlueprint();
      break;
    case "cancel-build":
      clearTool();
      break;
    case "panel":
      panel = arg as typeof panel;
      renderSidebar();
      break;
    case "inspect":
      selected = Number(arg);
      panel = "rooms";
      clearTool();
      render();
      break;
    case "hire":
      error = hireStaff(game, arg as Role);
      if (!error) toast("Staff hired. Choose a room assignment below.");
      render();
      break;
    case "dismiss": {
      const id = Number(arg),
        member = game.staff.find((s) => s.id === id);
      if (member)
        openDialog(
          `Dismiss ${member.name}?`,
          "<p>Their room will stop working until you assign another eligible staff member. No dismissal fee.</p>",
          "Dismiss staff",
          () => {
            const e = dismissStaff(game, id);
            if (e) toast(e);
            render();
          },
        );
      break;
    }
    case "sell": {
      const id = Number(arg),
        room = game.rooms.find((r) => r.id === id);
      if (room)
        openDialog(
          "Sell this room?",
          `<p>Receive ${money(Math.floor(room.purchasePrice * 0.7))}. Patients will seek another suitable room and staff will become unassigned.</p>`,
          "Sell room",
          () => {
            const e = sellRoom(game, id);
            if (e) toast(e);
            selected = null;
            render();
            if (game.status !== "active") ended();
          },
        );
      break;
    }
    case "grant":
      error = grant(game);
      if (!error) toast("The council sent $1,800. Use it wisely.");
      render();
      if (game.status !== "active") ended();
      break;
    case "save":
      try {
        localStorage.setItem(storageKey, saveGame(game));
        toast("Hospital saved in this browser.");
      } catch {
        toast("Saving is unavailable in this browser.");
      }
      break;
    case "load":
      try {
        const text = localStorage.getItem(storageKey);
        if (!text) {
          toast("No hospital saved yet.");
          break;
        }
        const restored = restoreGame(text);
        openDialog(
          "Load your saved hospital?",
          `<p>Replace this hospital with scenario ${restored.scenario + 1} at ${Math.floor(restored.tick / 60)}:${String(restored.tick % 60).padStart(2, "0")}, with ${restored.cures} cures and ${money(restored.cash)}. It will start paused.</p>`,
          "Load hospital",
          () => {
            game = restored;
            paused = true;
            selected = null;
            clearTool();
            render();
            toast("Saved hospital loaded, paused.");
            if (game.status !== "active") ended();
          },
        );
      } catch (e) {
        toast(e instanceof Error ? e.message : "Save unavailable.");
      }
      break;
    case "restart":
      openDialog(
        "Restart this scenario?",
        "<p>You will get a fresh floor, budget and emergency grant. Unsaved progress in this hospital will be replaced. Your manual save stays intact.</p>",
        "Restart scenario",
        () => fresh(game.scenario),
      );
      break;
    case "close-dialog":
      closeDialog();
      break;
    case "dialog-confirm": {
      const fn = dialogAction;
      closeDialog();
      if (fn) fn();
      break;
    }
  }
  if (error) toast(error);
});
function doorStyle(r: RoomLayout): string {
  const horizontal = r.entry.side === "north" || r.entry.side === "south";
  return horizontal
    ? `left:${((r.entry.offset + 0.15) / r.width) * 100}%;width:${70 / r.width}%;`
    : `top:${((r.entry.offset + 0.15) / r.height) * 100}%;height:${70 / r.height}%;`;
}
function showBlueprintControls() {
  const controls = document.querySelector<HTMLElement>("#blueprint-controls")!;
  controls.hidden = !tool;
  if (!draft || !tool) return;
  controls.innerHTML = `<fieldset><legend>Room blueprint · no charge until confirmed</legend>${[
    ["x", "Column", draft.x + 1, 1, WIDTH],
    ["y", "Row", draft.y + 1, 1, HEIGHT],
    ["width", "Width", draft.width, 2, 4],
    ["height", "Height", draft.height, 2, 4],
  ]
    .map(
      ([key, label, value, min, max]) =>
        `<label>${label}<input type="number" data-blueprint="${key}" aria-label="Blueprint ${label}" value="${value}" min="${min}" max="${max}" step="1"></label>`,
    )
    .join("")}
  <label>Door wall<select data-blueprint="side" aria-label="Door wall">${["north", "south", "west", "east"].map((side) => `<option ${draft!.entry.side === side ? "selected" : ""}>${side}</option>`).join("")}</select></label>
  <label>Door tile<input type="number" data-blueprint="offset" aria-label="Door tile along wall" value="${draft.entry.offset + 1}" min="1" max="${["north", "south"].includes(draft.entry.side) ? draft.width : draft.height}"></label>
  </fieldset><div>${button("confirm-build", "Confirm room", "primary")}${button("redraw-build", "Redraw footprint")}${button("cancel-build", "Cancel blueprint")}</div>`;
}
function drawBlueprint() {
  if (!draft || !tool) return;
  const error = placementError(game, tool, draft.x, draft.y, draft);
  const candidate: Room = {
    ...draft,
    id: -1,
    kind: tool,
    purchasePrice: roomPrice(tool, draft.width, draft.height),
  };
  const d = door(candidate);
  document.querySelector("#preview")!.innerHTML =
    `<div class="ghost ${error ? "invalid" : ""}" style="left:${(draft.x / WIDTH) * 100}%;top:${(draft.y / HEIGHT) * 100}%;width:${(draft.width / WIDTH) * 100}%;height:${(draft.height / HEIGHT) * 100}%">${ROOM_INFO[tool].icon}<small>${draft.width}×${draft.height}</small><div class="door ${draft.entry.side}" style="${doorStyle(draft)}"></div></div><div class="door-marker ${error ? "invalid" : ""}" style="left:${(d.x / WIDTH) * 100}%;top:${(d.y / HEIGHT) * 100}%;width:${100 / WIDTH}%;height:${100 / HEIGHT}%">↥</div>`;
  document.querySelector("#plan-status")!.textContent =
    `${ROOM_INFO[tool].name} · ${money(candidate.purchasePrice)} · ${draftPhase === "size" ? "Drag a 2–4 tile rectangle (or edit the fields)." : "Click a corridor tile beside any wall for its door, then Confirm."} ${error || "Accessible blueprint. No cash spent yet."}`;
}
function chooseDoor(p: Point) {
  if (!draft) return;
  let side: DoorSide | null = null,
    offset = 0;
  if (p.x >= draft.x && p.x < draft.x + draft.width) {
    if (p.y === draft.y - 1) side = "north";
    if (p.y === draft.y + draft.height) side = "south";
    offset = p.x - draft.x;
  } else if (p.y >= draft.y && p.y < draft.y + draft.height) {
    if (p.x === draft.x - 1) side = "west";
    if (p.x === draft.x + draft.width) side = "east";
    offset = p.y - draft.y;
  }
  if (side) {
    draft.entry = { side, offset };
    showBlueprintControls();
    drawBlueprint();
  }
}
tiles.addEventListener("click", (event) => {
  if (dialog.open || game.status !== "active") return;
  const tile = (event.target as Element).closest<HTMLButtonElement>(".tile");
  if (!tile) return;
  const x = Number(tile.dataset.x),
    y = Number(tile.dataset.y);
  if (tool) {
    if (draftPhase === "door") chooseDoor({ x, y });
    else if (event.detail === 0) {
      draft = {
        x,
        y,
        width: 2,
        height: 2,
        entry: { side: "south", offset: 0 },
      };
      draftPhase = "door";
      showBlueprintControls();
      drawBlueprint();
    }
  } else {
    selected = game.rooms.find((r) => contains(r, { x, y }))?.id || null;
    panel = "rooms";
    render();
  }
});
function pointerTile(event: PointerEvent): Point {
  const rect = tiles.getBoundingClientRect();
  return {
    x: Math.max(
      0,
      Math.min(
        WIDTH - 1,
        Math.floor(((event.clientX - rect.left) / rect.width) * WIDTH),
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        HEIGHT - 1,
        Math.floor(((event.clientY - rect.top) / rect.height) * HEIGHT),
      ),
    ),
  };
}
function sizeDraft(p: Point) {
  if (!dragStart) return;
  draft = blueprintFromDrag(dragStart, p);
  drawBlueprint();
}
tiles.addEventListener("pointerdown", (event) => {
  if (
    !tool ||
    draftPhase !== "size" ||
    event.button !== 0 ||
    dialog.open ||
    game.status !== "active"
  )
    return;
  event.preventDefault();
  dragStart = pointerTile(event);
  tiles.setPointerCapture(event.pointerId);
  sizeDraft(dragStart);
});
tiles.addEventListener("pointermove", (event) => {
  if (dragStart) sizeDraft(pointerTile(event));
});
tiles.addEventListener("pointerup", (event) => {
  if (!dragStart) return;
  sizeDraft(pointerTile(event));
  dragStart = null;
  draftPhase = "door";
  if (tiles.hasPointerCapture(event.pointerId))
    tiles.releasePointerCapture(event.pointerId);
  showBlueprintControls();
  drawBlueprint();
});
tiles.addEventListener("pointercancel", () => {
  dragStart = null;
  showBlueprintControls();
  drawBlueprint();
});
app.addEventListener("change", (event) => {
  const select = event.target as HTMLSelectElement;
  if (select.dataset.blueprint && draft) {
    const key = select.dataset.blueprint;
    if (key === "side") draft.entry.side = select.value as DoorSide;
    else if (key === "offset") draft.entry.offset = Number(select.value) - 1;
    else if (key === "x" || key === "y") draft[key] = Number(select.value) - 1;
    else if (key === "width" || key === "height")
      draft[key] = Number(select.value);
    const span = ["north", "south"].includes(draft.entry.side)
      ? draft.width
      : draft.height;
    draft.entry.offset = Math.max(0, Math.min(span - 1, draft.entry.offset));
    const offset = document.querySelector<HTMLInputElement>(
      '[data-blueprint="offset"]',
    )!;
    offset.max = String(span);
    offset.value = String(draft.entry.offset + 1);
    draftPhase = "door";
    drawBlueprint();
    return;
  }
  let error = "";
  if (select.dataset.staff)
    error = assignStaff(
      game,
      Number(select.dataset.staff),
      select.value ? Number(select.value) : null,
    );
  if (select.dataset.room) {
    const id = Number(select.dataset.room),
      current = roomStaff(game, id);
    if (current) assignStaff(game, current.id, null);
    if (select.value) error = assignStaff(game, Number(select.value), id);
  }
  if (error) toast(error);
  render();
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDialog();
});
document.addEventListener("keydown", (event) => {
  if (
    event.code === "Space" &&
    !dialog.open &&
    !["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(
      (event.target as Element).tagName,
    )
  ) {
    event.preventDefault();
    if (game.status === "active") {
      paused = !paused;
      accumulator = 0;
      renderMetrics();
    }
  }
  if (event.key === "Escape" && !dialog.open) clearTool();
});
function frame(now: number) {
  const elapsed = Math.min(now - last, 1000);
  last = now;
  if (!paused && !dialog.open && game.status === "active") {
    accumulator += elapsed * speed;
    let changed = false;
    while (accumulator >= 1000 && game.status === "active") {
      accumulator -= 1000;
      step(game);
      changed = true;
    }
    if (changed) {
      render(false);
      if (game.status !== "active") ended();
    }
  } else accumulator = 0;
  requestAnimationFrame(frame);
}
render();
scenarioIntro();
requestAnimationFrame(frame);
