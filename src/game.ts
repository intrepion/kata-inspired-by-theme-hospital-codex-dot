export type RoomKind = "consult" | "echo" | "paper" | "groove";
export type Role = "clinician" | "technician" | "expert";
export interface Point {
  x: number;
  y: number;
}
export interface Room extends Point {
  id: number;
  kind: RoomKind;
}
export interface Staff {
  id: number;
  name: string;
  role: Role;
  room: number | null;
}
export interface Patient extends Point {
  id: number;
  ailment: Exclude<RoomKind, "consult">;
  stage: "consult" | "treat" | "exit";
  mode: "walking" | "waiting" | "service";
  target: number | null;
  patience: number;
  arrived: number;
  progress: number;
}
export interface Game {
  version: 1;
  scenario: number;
  tick: number;
  cash: number;
  income: number;
  expenses: number;
  cures: number;
  happiness: number;
  walkouts: number;
  rooms: Room[];
  staff: Staff[];
  patients: Patient[];
  nextId: number;
  spawned: number;
  grantUsed: boolean;
  status: "active" | "won" | "lost";
  reason: string;
}
export const WIDTH = 12,
  HEIGHT = 8,
  ENTRANCE: Point = { x: 0, y: 4 };
export const ROOM_INFO: Record<
  RoomKind,
  {
    name: string;
    cost: number;
    duration: number;
    icon: string;
    color: string;
    detail: string;
  }
> = {
  consult: {
    name: "Consultation",
    cost: 850,
    duration: 5,
    icon: "✚",
    color: "#83c9bc",
    detail: "A gentle chat, a wild guess. Diagnoses every patient.",
  },
  echo: {
    name: "Resonance booth",
    cost: 1100,
    duration: 7,
    icon: "◎",
    color: "#eabd64",
    detail: "Echo Hiccups → a perfectly timed anti-echo.",
  },
  paper: {
    name: "Unfolding studio",
    cost: 1250,
    duration: 9,
    icon: "◇",
    color: "#db9cc2",
    detail: "Paperfold Fever → careful origami in reverse.",
  },
  groove: {
    name: "Groove lab",
    cost: 1400,
    duration: 11,
    icon: "♫",
    color: "#9cabe8",
    detail: "Moonwalk Malaise → recalibrate the inner disco.",
  },
};
export const AILMENTS = {
  echo: "Echo Hiccups",
  paper: "Paperfold Fever",
  groove: "Moonwalk Malaise",
};
export const ROLE_INFO: Record<
  Role,
  { name: string; hire: number; wage: number; rate: number }
> = {
  clinician: { name: "Clinician", hire: 250, wage: 7, rate: 1 },
  technician: { name: "Technician", hire: 250, wage: 5, rate: 1 },
  expert: { name: "Expert clinician", hire: 400, wage: 10, rate: 1.5 },
};
export const SCENARIOS = [
  {
    name: "A little peculiar",
    subtitle: "01 / The neighborhood clinic",
    brief:
      "The council has lent you a building and a very optimistic clipboard. Cure the echo outbreak and earn your first accreditation.",
    cash: 5500,
    cures: 8,
    satisfaction: 65,
    reserve: 1000,
    interval: 11,
    patience: 180,
    ailments: ["echo"] as const,
    obstacles: [] as Point[],
  },
  {
    name: "Creases & crises",
    subtitle: "02 / The civic hospital",
    brief:
      "The annual stationery fair has gone sideways. Two ailments, one bustling building. Keep your corridors clear and your queues moving.",
    cash: 7500,
    cures: 14,
    satisfaction: 70,
    reserve: 1500,
    interval: 9,
    patience: 170,
    ailments: ["echo", "paper"] as const,
    obstacles: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 6, y: 0 },
      { x: 6, y: 1 },
    ],
  },
  {
    name: "The grand oddening",
    subtitle: "03 / The regional institute",
    brief:
      "A disco convention meets a paper fair inside an echo chamber. Build the institute this town deserves. All three treatments are needed.",
    cash: 9500,
    cures: 20,
    satisfaction: 75,
    reserve: 2000,
    interval: 7,
    patience: 160,
    ailments: ["echo", "paper", "groove"] as const,
    obstacles: [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 6, y: 0 },
      { x: 6, y: 1 },
      { x: 10, y: 6 },
      { x: 11, y: 6 },
      { x: 10, y: 7 },
      { x: 11, y: 7 },
    ],
  },
];
const names = [
  "Mira Moss",
  "Otis Button",
  "Ada Quill",
  "Cleo Finch",
  "Remy Fern",
  "Bea Biscuit",
  "Ivo Sprout",
  "Nell Noodle",
];
export function createGame(scenario = 0): Game {
  if (!Number.isInteger(scenario) || !SCENARIOS[scenario])
    throw new Error("Unknown scenario");
  return {
    version: 1,
    scenario,
    tick: 0,
    cash: SCENARIOS[scenario].cash,
    income: 0,
    expenses: 0,
    cures: 0,
    happiness: 0,
    walkouts: 0,
    rooms: [],
    staff: [],
    patients: [],
    nextId: 1,
    spawned: 0,
    grantUsed: false,
    status: "active",
    reason: "",
  };
}
export const equal = (a: Point, b: Point) => a.x === b.x && a.y === b.y;
export const door = (r: Room): Point => ({ x: r.x, y: r.y + 2 });
export const contains = (r: Point, p: Point) =>
  p.x >= r.x && p.x < r.x + 2 && p.y >= r.y && p.y < r.y + 2;
export function blocked(g: Game, p: Point, rooms = g.rooms): boolean {
  return (
    p.x < 0 ||
    p.y < 0 ||
    p.x >= WIDTH ||
    p.y >= HEIGHT ||
    rooms.some((r) => contains(r, p)) ||
    SCENARIOS[g.scenario].obstacles.some((o) => equal(o, p))
  );
}
export function path(
  g: Game,
  from: Point,
  to: Point,
  rooms = g.rooms,
): Point[] | null {
  if (blocked(g, from, rooms) || blocked(g, to, rooms)) return null;
  const queue: Point[][] = [[from]],
    seen = new Set([`${from.x},${from.y}`]);
  for (let i = 0; i < queue.length; i++) {
    const route = queue[i],
      last = route[route.length - 1];
    if (equal(last, to)) return route.slice(1);
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ]) {
      const p = { x: last.x + dx, y: last.y + dy },
        key = `${p.x},${p.y}`;
      if (!seen.has(key) && !blocked(g, p, rooms)) {
        seen.add(key);
        queue.push([...route, p]);
      }
    }
  }
  return null;
}
export function placementError(
  g: Game,
  kind: RoomKind,
  x: number,
  y: number,
): string {
  if (g.status !== "active") return "This scenario has ended.";
  if (!ROOM_INFO[kind]) return "Choose a room type.";
  if (
    kind !== "consult" &&
    !SCENARIOS[g.scenario].ailments.some((a) => a === kind)
  )
    return "This treatment opens in a later scenario.";
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    x < 0 ||
    y < 0 ||
    x + 1 >= WIDTH ||
    y + 2 >= HEIGHT
  )
    return "Leave space for the door below the room.";
  const candidate: Room = { id: -1, kind, x, y };
  if (contains(candidate, ENTRANCE))
    return "Keep the reception entrance clear.";
  for (let dy = 0; dy < 2; dy++)
    for (let dx = 0; dx < 2; dx++)
      if (blocked(g, { x: x + dx, y: y + dy }))
        return "The room overlaps another room or a garden.";
  if (g.rooms.some((r) => contains(candidate, door(r))))
    return "A room cannot cover an existing door.";
  const rooms = [...g.rooms, candidate];
  if (rooms.some((r) => path(g, ENTRANCE, door(r), rooms) === null))
    return "This would block a corridor or room door.";
  if (
    g.patients.some(
      (p) =>
        p.mode !== "service" &&
        (blocked(g, p, rooms) || path(g, p, ENTRANCE, rooms) === null),
    )
  )
    return "Keep occupied corridors connected to reception.";
  if (g.cash < ROOM_INFO[kind].cost)
    return "Not enough cash. Sell a room or request your grant.";
  return "";
}
export function buildRoom(
  g: Game,
  kind: RoomKind,
  x: number,
  y: number,
): string {
  const error = placementError(g, kind, x, y);
  if (error) return error;
  g.cash -= ROOM_INFO[kind].cost;
  g.expenses += ROOM_INFO[kind].cost;
  g.rooms.push({ id: g.nextId++, kind, x, y });
  return "";
}
export function eligible(role: Role, kind: RoomKind) {
  return role !== "technician" || kind !== "consult";
}
export function hireStaff(g: Game, role: Role): string {
  if (g.status !== "active") return "This scenario has ended.";
  const info = ROLE_INFO[role];
  if (!info) return "Unknown staff role.";
  if (g.staff.length >= 16) return "The roster is full. Dismiss someone first.";
  if (g.cash < info.hire) return "Not enough cash to hire.";
  g.cash -= info.hire;
  g.expenses += info.hire;
  g.staff.push({
    id: g.nextId++,
    role,
    name: names[g.staff.length % names.length],
    room: null,
  });
  return "";
}
export function assignStaff(
  g: Game,
  staffId: number,
  roomId: number | null,
): string {
  if (g.status !== "active") return "This scenario has ended.";
  const staff = g.staff.find((s) => s.id === staffId),
    room = g.rooms.find((r) => r.id === roomId);
  if (!staff) return "Staff member no longer exists.";
  if (roomId !== null && (!room || !eligible(staff.role, room.kind)))
    return "Technicians work in treatment rooms only.";
  if (
    roomId !== null &&
    g.staff.some((s) => s.id !== staffId && s.room === roomId)
  )
    return "That room already has a staff member. Unassign them first.";
  staff.room = roomId;
  return "";
}
export function dismissStaff(g: Game, id: number): string {
  if (g.status !== "active") return "This scenario has ended.";
  if (!g.staff.some((s) => s.id === id))
    return "Staff member no longer exists.";
  g.staff = g.staff.filter((s) => s.id !== id);
  return "";
}
export function sellRoom(g: Game, id: number): string {
  if (g.status !== "active") return "This scenario has ended.";
  const room = g.rooms.find((r) => r.id === id);
  if (!room) return "Room no longer exists.";
  const refund = Math.floor(ROOM_INFO[room.kind].cost * 0.7);
  g.cash += refund;
  g.income += refund;
  g.staff.filter((s) => s.room === id).forEach((s) => (s.room = null));
  g.patients
    .filter((p) => p.target === id)
    .forEach((p) => {
      if (p.mode === "service") {
        p.x = room.x;
        p.y = room.y + 2;
      }
      p.target = null;
      p.mode = "walking";
      p.progress = 0;
    });
  g.rooms = g.rooms.filter((r) => r.id !== id);
  checkOutcome(g);
  return "";
}
export function grant(g: Game): string {
  if (g.status !== "active") return "This scenario has ended.";
  if (g.grantUsed) return "Your emergency grant has already been used.";
  g.grantUsed = true;
  g.cash += 1800;
  g.income += 1800;
  checkOutcome(g);
  return "";
}
export function satisfaction(g: Game) {
  return g.cures ? Math.round(g.happiness / g.cures) : 100;
}
export function objectivesMet(g: Game) {
  const s = SCENARIOS[g.scenario];
  return (
    g.cures >= s.cures &&
    satisfaction(g) >= s.satisfaction &&
    g.cash >= s.reserve
  );
}
export function queueFor(g: Game, id: number) {
  return g.patients.filter((p) => p.target === id && p.mode !== "service");
}
export function serviceFor(g: Game, id: number) {
  return g.patients.find((p) => p.target === id && p.mode === "service");
}
export function roomStaff(g: Game, id: number) {
  return g.staff.find((s) => s.room === id);
}
export function checkOutcome(g: Game): void {
  if (g.status !== "active") return;
  if (g.cash < -500) {
    g.status = "lost";
    g.reason =
      "The council closed your overdraft. Try fewer staff, earlier treatments, or the emergency grant.";
  } else if (g.walkouts >= 12) {
    g.status = "lost";
    g.reason =
      "Twelve patients walked out. Build missing treatments and watch your queues.";
  } else if (objectivesMet(g)) {
    g.status = "won";
    g.reason =
      "Accreditation awarded. Your peculiar practice is a local legend.";
  } else if (g.tick >= 720) {
    g.status = "lost";
    g.reason =
      "Inspection day arrived before your objectives were complete. Try upgrading the busiest rooms.";
  }
}
export function step(g: Game): void {
  if (g.status !== "active") return;
  g.tick++;
  const s = SCENARIOS[g.scenario],
    cost =
      g.rooms.length +
      g.staff.reduce((sum, member) => sum + ROLE_INFO[member.role].wage, 0);
  g.cash -= cost;
  g.expenses += cost;
  if (
    g.tick >= 6 &&
    (g.tick - 6) % s.interval === 0 &&
    g.patients.length < 40
  ) {
    const ailment = s.ailments[g.spawned % s.ailments.length];
    g.spawned++;
    g.patients.push({
      id: g.nextId++,
      ailment,
      stage: "consult",
      mode: "walking",
      target: null,
      patience: s.patience,
      arrived: g.tick,
      progress: 0,
      ...ENTRANCE,
    });
  }
  const remove = new Set<number>();
  for (const p of g.patients) {
    if (p.stage === "exit") {
      const route = path(g, p, ENTRANCE);
      if (!route || !route.length) remove.add(p.id);
      else Object.assign(p, route[0]);
      continue;
    }
    p.patience--;
    if (p.patience <= 0) {
      g.walkouts++;
      remove.add(p.id);
      continue;
    }
    if (p.mode === "service") {
      const room = g.rooms.find((r) => r.id === p.target),
        staff = room && roomStaff(g, room.id);
      if (!room) {
        p.target = null;
        p.mode = "walking";
        continue;
      }
      if (!staff) continue;
      p.progress += ROLE_INFO[staff.role].rate;
      if (p.progress >= ROOM_INFO[room.kind].duration) {
        Object.assign(p, door(room));
        p.progress = 0;
        p.target = null;
        p.mode = "walking";
        if (p.stage === "consult") {
          p.stage = "treat";
          g.cash += 100;
          g.income += 100;
        } else {
          const revenue = { echo: 850, paper: 1050, groove: 1300 }[p.ailment];
          g.cures++;
          g.happiness += Math.max(
            45,
            100 - Math.floor((g.tick - p.arrived) / 2),
          );
          g.cash += revenue;
          g.income += revenue;
          p.stage = "exit";
        }
      }
      continue;
    }
    if (p.target === null) {
      const kind = p.stage === "consult" ? "consult" : p.ailment;
      const choices = g.rooms.filter(
        (r) =>
          r.kind === kind && roomStaff(g, r.id) && path(g, p, door(r)) !== null,
      );
      choices.sort(
        (a, b) =>
          queueFor(g, a.id).length +
            (serviceFor(g, a.id) ? 1 : 0) -
            (queueFor(g, b.id).length + (serviceFor(g, b.id) ? 1 : 0)) ||
          path(g, p, door(a))!.length - path(g, p, door(b))!.length ||
          a.id - b.id,
      );
      if (choices[0]) {
        p.target = choices[0].id;
        p.mode = "walking";
      }
    }
    const room = g.rooms.find((r) => r.id === p.target);
    if (!room) continue;
    const route = path(g, p, door(room));
    if (!route) {
      p.target = null;
      continue;
    }
    if (route.length) {
      Object.assign(p, route[0]);
      p.mode = "walking";
    } else {
      p.mode = "waiting";
      const first = queueFor(g, room.id)
        .filter((q) => equal(q, door(room)))
        .sort((a, b) => a.id - b.id)[0];
      if (
        first?.id === p.id &&
        roomStaff(g, room.id) &&
        !serviceFor(g, room.id)
      ) {
        p.mode = "service";
        p.progress = 0;
      }
    }
  }
  g.patients = g.patients.filter((p) => !remove.has(p.id));
  checkOutcome(g);
}
export function saveGame(g: Game): string {
  return JSON.stringify(g);
}
export function restoreGame(text: string): Game {
  const invalid = () => {
    throw new Error(
      "Save is invalid or incompatible. Your current hospital is safe.",
    );
  };
  if (text.length > 150000) invalid();
  let g: Game;
  try {
    g = JSON.parse(text);
  } catch {
    invalid();
  }
  g = g!;
  if (
    !g ||
    g.version !== 1 ||
    !Number.isInteger(g.scenario) ||
    !SCENARIOS[g.scenario]
  )
    invalid();
  const integer = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
  const finite = (v: unknown, min: number, max: number) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  for (const key of [
    "tick",
    "cures",
    "happiness",
    "walkouts",
    "spawned",
  ] as const)
    if (!integer(g[key], 0, key === "tick" ? 720 : 100000)) invalid();
  if (
    !integer(g.nextId, 1, 100000) ||
    !finite(g.cash, -10000, 1000000) ||
    !integer(g.income, 0, 1000000) ||
    !integer(g.expenses, 0, 1000000)
  )
    invalid();
  if (
    g.cash !== SCENARIOS[g.scenario].cash + g.income - g.expenses ||
    g.cures + g.walkouts > g.spawned ||
    g.happiness < 45 * g.cures ||
    g.happiness > 100 * g.cures
  )
    invalid();
  if (
    typeof g.grantUsed !== "boolean" ||
    !["active", "won", "lost"].includes(g.status) ||
    typeof g.reason !== "string" ||
    g.reason.length > 500
  )
    invalid();
  if (
    !Array.isArray(g.rooms) ||
    !Array.isArray(g.staff) ||
    !Array.isArray(g.patients) ||
    g.rooms.length > 24 ||
    g.staff.length > 16 ||
    g.patients.length > 40
  )
    invalid();
  const ids = new Set<number>();
  const id = (v: number) => {
    if (!integer(v, 1, g.nextId - 1) || ids.has(v)) invalid();
    ids.add(v);
  };
  for (const r of g.rooms) {
    if (
      !r ||
      !Object.hasOwn(ROOM_INFO, r.kind) ||
      !integer(r.x, 0, WIDTH - 2) ||
      !integer(r.y, 0, HEIGHT - 3)
    )
      invalid();
    if (
      r.kind !== "consult" &&
      !SCENARIOS[g.scenario].ailments.some((a) => a === r.kind)
    )
      invalid();
    id(r.id);
    if (
      contains(r, ENTRANCE) ||
      SCENARIOS[g.scenario].obstacles.some((o) => contains(r, o)) ||
      g.rooms.some(
        (q) =>
          q !== r &&
          [
            { x: q.x, y: q.y },
            { x: q.x + 1, y: q.y },
            { x: q.x, y: q.y + 1 },
            { x: q.x + 1, y: q.y + 1 },
          ].some((p) => contains(r, p)),
      ) ||
      path(g, ENTRANCE, door(r)) === null
    )
      invalid();
  }
  const staffed = new Set<number>();
  for (const member of g.staff) {
    if (
      !member ||
      !Object.hasOwn(ROLE_INFO, member.role) ||
      typeof member.name !== "string" ||
      member.name.length > 40
    )
      invalid();
    id(member.id);
    if (member.room !== null) {
      const r = g.rooms.find((r) => r.id === member.room);
      if (!r || !eligible(member.role, r.kind) || staffed.has(member.room))
        invalid();
      staffed.add(member.room);
    }
  }
  for (const p of g.patients) {
    if (
      !p ||
      !Object.hasOwn(AILMENTS, p.ailment) ||
      !SCENARIOS[g.scenario].ailments.some((a) => a === p.ailment) ||
      !["consult", "treat", "exit"].includes(p.stage) ||
      !["walking", "waiting", "service"].includes(p.mode)
    )
      invalid();
    id(p.id);
    if (
      !integer(p.x, 0, WIDTH - 1) ||
      !integer(p.y, 0, HEIGHT - 1) ||
      !integer(p.patience, 1, SCENARIOS[g.scenario].patience) ||
      !integer(p.arrived, 0, g.tick) ||
      !finite(p.progress, 0, 11) ||
      path(g, p, ENTRANCE) === null
    )
      invalid();
    if (p.target !== null) {
      const r = g.rooms.find((r) => r.id === p.target);
      if (
        !r ||
        r.kind !== (p.stage === "consult" ? "consult" : p.ailment) ||
        p.stage === "exit"
      )
        invalid();
      if (p.mode !== "walking" && !equal(p, door(r!))) invalid();
      if (p.mode === "service" && p.progress >= ROOM_INFO[r!.kind].duration)
        invalid();
    } else if (p.mode !== "walking") invalid();
    if (
      (p.mode !== "service" && p.progress !== 0) ||
      !Number.isInteger(p.progress * 2)
    )
      invalid();
  }
  if (
    g.cures +
      g.walkouts +
      g.patients.filter((p) => p.stage !== "exit").length !==
      g.spawned ||
    g.patients.filter((p) => p.stage === "exit").length > g.cures
  )
    invalid();
  if (g.grantUsed && g.income < 1800) invalid();
  if (
    g.rooms.some(
      (r) =>
        g.patients.filter((p) => p.target === r.id && p.mode === "service")
          .length > 1,
    )
  )
    invalid();
  if (g.status === "won" && !objectivesMet(g)) invalid();
  if (
    g.status === "active" &&
    (g.cash < -500 || g.walkouts >= 12 || g.tick >= 720 || objectivesMet(g))
  )
    invalid();
  if (
    g.status === "lost" &&
    !(g.cash < -500 || g.walkouts >= 12 || g.tick >= 720)
  )
    invalid();
  // Return only the canonical schema. Unknown properties are discarded.
  const clean = createGame(g.scenario);
  for (const key of Object.keys(clean) as (keyof Game)[])
    Object.assign(clean, { [key]: g[key] });
  clean.rooms = g.rooms.map(({ id, kind, x, y }) => ({ id, kind, x, y }));
  clean.staff = g.staff.map(({ id, name, role, room }) => ({
    id,
    name,
    role,
    room,
  }));
  clean.patients = g.patients.map(
    ({
      id,
      ailment,
      stage,
      mode,
      target,
      patience,
      arrived,
      progress,
      x,
      y,
    }) => ({
      id,
      ailment,
      stage,
      mode,
      target,
      patience,
      arrived,
      progress,
      x,
      y,
    }),
  );
  return clean;
}
