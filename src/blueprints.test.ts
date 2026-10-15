import { blueprintFromDrag } from "./game";
import { readFileSync } from "node:fs";
import { it, expect } from "vitest";
import {
  createGame,
  buildRoom,
  placementError,
  door,
  path,
  ENTRANCE,
  saveGame,
  restoreGame,
  roomPrice,
  sellRoom,
  hireStaff,
  assignStaff,
  step,
  SCENARIOS,
  satisfaction,
  queueFor,
} from "./game";
import type { DoorSide, RoomLayout } from "./game";
const layout = (
  side: DoorSide = "south",
  offset = 0,
  width = 3,
  height = 2,
): RoomLayout => ({ width, height, entry: { side, offset } });
it.each(["north", "south", "west", "east"] as const)(
  "builds variable rectangles with a reachable %s wall door",
  (side) => {
    const g = createGame();
    const plan = layout(side, 1, 3, 4);
    const before = saveGame(g);
    expect(placementError(g, "consult", 3, 2, plan)).toBe("");
    expect(saveGame(g)).toBe(before);
    expect(buildRoom(g, "consult", 3, 2, plan)).toBe("");
    const r = g.rooms[0];
    expect(r.purchasePrice).toBe(1490);
    expect(path(g, ENTRANCE, door(r))).not.toBeNull();
    expect(restoreGame(saveGame(g))).toEqual(g);
    plan.entry.offset = 0;
    expect(r.entry.offset).toBe(1);
    const cash = g.cash;
    expect(sellRoom(g, r.id)).toBe("");
    expect(g.cash - cash).toBe(Math.floor(1490 * 0.7));
  },
);
it("rejects bounds, wall offsets, overlapping doors and live occupied corridors atomically", () => {
  const g = createGame();
  buildRoom(g, "consult", 3, 2, layout("west", 1));
  const cases: [number, number, RoomLayout][] = [
    [10, 6, layout()],
    [0, 0, layout("north")],
    [6, 1, layout("south", 3)],
    [6, 1, layout("south", 0, 5, 2)],
    [2, 3, layout()],
  ];
  for (const [x, y, p] of cases) {
    const before = saveGame(g);
    expect(buildRoom(g, "echo", x, y, p)).not.toBe("");
    expect(saveGame(g)).toBe(before);
  }
  const live = createGame();
  buildRoom(live, "consult", 1, 1);
  hireStaff(live, "clinician");
  assignStaff(live, live.staff[0].id, live.rooms[0].id);
  for (let i = 0; i < 6; i++) step(live);
  const patient = live.patients[0];
  expect(patient).toBeDefined();
  const before = saveGame(live);
  expect(
    buildRoom(live, "consult", patient.x, patient.y, layout("east", 0, 2, 2)),
  ).not.toBe("");
  expect(saveGame(live)).toBe(before);
});
it("migrates populated legacy saves to the exact old geometry without changing finances or people", () => {
  const g = createGame();
  buildRoom(g, "consult", 1, 1);
  buildRoom(g, "echo", 4, 1);
  hireStaff(g, "clinician");
  assignStaff(g, g.staff[0].id, g.rooms[0].id);
  for (let i = 0; i < 20; i++) step(g);
  const legacy = JSON.parse(saveGame(g));
  legacy.version = 1;
  legacy.rooms = legacy.rooms.map(({ id, kind, x, y }: any) => ({
    id,
    kind,
    x,
    y,
  }));
  const migrated = restoreGame(JSON.stringify(legacy));
  expect(migrated).toEqual(g);
  expect(door(migrated.rooms[0])).toEqual({ x: 1, y: 3 });
  const bad = JSON.parse(saveGame(g));
  bad.rooms[0].purchasePrice++;
  expect(() => restoreGame(JSON.stringify(bad))).toThrow();
});
it("completes a normal variable-room workflow with opposite doors and safe occupied sale", () => {
  let g = createGame();
  expect(buildRoom(g, "consult", 1, 1, layout("east", 1))).toBe("");
  expect(buildRoom(g, "echo", 6, 2, layout("west", 1, 3, 3))).toBe("");
  for (const [i, role] of (["clinician", "technician"] as const).entries()) {
    hireStaff(g, role);
    assignStaff(g, g.staff[i].id, g.rooms[i].id);
  }
  let sawQueue = false,
    sawService = false;
  for (let i = 0; i < 720 && g.status === "active"; i++) {
    step(g);
    sawQueue ||= queueFor(g, g.rooms[0].id).length > 0;
    sawService ||= g.patients.some((p) => p.mode === "service");
    if (i % 7 === 0) g = restoreGame(saveGame(g));
    expect(g.cash).toBe(SCENARIOS[0].cash + g.income - g.expenses);
  }
  expect(sawQueue).toBe(true);
  expect(sawService).toBe(true);
  expect(g.status).toBe("won");
  expect(satisfaction(g)).toBeGreaterThanOrEqual(65);
  const busy = createGame();
  buildRoom(busy, "consult", 1, 1, layout("east", 1));
  hireStaff(busy, "clinician");
  assignStaff(busy, busy.staff[0].id, busy.rooms[0].id);
  while (!busy.patients.some((p) => p.mode === "service")) step(busy);
  const r = busy.rooms[0];
  const exit = door(r);
  const cash = busy.cash;
  expect(sellRoom(busy, r.id)).toBe("");
  expect(busy.cash - cash).toBe(Math.floor(roomPrice("consult", 3, 2) * 0.7));
  expect(busy.patients.every((p) => path(busy, p, ENTRANCE) !== null)).toBe(
    true,
  );
  expect(busy.patients[0]).toMatchObject(exit);
  expect(restoreGame(saveGame(busy))).toEqual(busy);
});

it("loads a genuine baseline v1 hospital with active service and preserves subsequent outcomes", () => {
  const legacy = JSON.parse(
    readFileSync(
      new URL("./fixtures/v1-hospital.json", import.meta.url),
      "utf8",
    ),
  );
  let g = restoreGame(JSON.stringify(legacy));
  expect(g.version).toBe(2);
  expect(g.cash).toBe(legacy.cash);
  expect(g.staff).toEqual(legacy.staff);
  expect(g.patients).toEqual(legacy.patients);
  expect(
    g.rooms.map((r) => ({ id: r.id, kind: r.kind, x: r.x, y: r.y })),
  ).toEqual(legacy.rooms);
  for (let i = 0; i < 720 && g.status === "active"; i++) {
    step(g);
    g = restoreGame(saveGame(g));
  }
  expect(g.status).toBe("won");
  expect(g.walkouts).toBe(0);
});

it("keeps the dragged anchor inside the maximum rectangle in every direction", () => {
  for (const [dx, dy] of [
    [10, 10],
    [-10, -10],
    [10, -10],
    [-10, 10],
  ]) {
    const d = blueprintFromDrag({ x: 7, y: 4 }, { x: 7 + dx, y: 4 + dy });
    expect(d.width).toBe(4);
    expect(d.height).toBe(4);
    expect(
      d.x <= 7 && d.x + d.width > 7 && d.y <= 4 && d.y + d.height > 4,
    ).toBe(true);
  }
  expect(blueprintFromDrag({ x: 4, y: 3 }, { x: 2, y: 2 })).toMatchObject({
    x: 2,
    y: 2,
    width: 3,
    height: 2,
  });
});
