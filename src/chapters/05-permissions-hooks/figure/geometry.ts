import {
  corners, cylinder, depthOf, haloOf, insetPlan, iso, knurl, lineOnTop, pathOf, planOutline, radialTicks, ring,
  sideArc, sideSeam, sideTicks, slabOf, type Flat, type Plan, type Plane, type Point3,
} from "../../../iso/iso-kit";
import {
  ARM_H, ARM_Z, BARRIER_H, BASE, BASE_H, CAB, CAB_FACE, CAB_FRONT, CAB_TOP, CARD, CARD_H, CARD_Z, CARRIAGE,
  CARRIAGE_H, CARRIAGE_Z, COLUMN_Y, DESK, DESK_H, FOOT_H, GATE_D, GATE_H, GATE_HOUSING, GATE_TOP, GATE_Y0, HEAD_Z,
  P, RAIL, RAIL_H, X, at,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

/** 螢幕空間的凸包，用來做「某個平面以下/以上」的裁切 */
function hull(points: Flat[]): Flat[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const q of p) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop(); lower.push(q); }
  const upper: Flat[] = [];
  for (const q of [...p].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop(); upper.push(q); }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}
const clipOf = (points: Point3[]) => pathOf(hull(points.map((q) => iso(q, P))), true);

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: 40, y: 40, w: 60, d: 13, r: 2 };
export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P),
  feet: FEET.map(([x, y]) => [C(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), C(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28)]),
  slab: S(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(SCREWS.map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  label: S(LABEL, 0, 0.8, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P),
  labelRule: join([0, 1, 2].map((row) => lineOnTop([LABEL.x + 8, LABEL.y + 3.6 + row * 2.2], [LABEL.x + [44, 30, 38][row], LABEL.y + 3.6 + row * 2.2], 0.8, P))),
  labelScrews: [at([LABEL.x + 3.5, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.5, LABEL.y + LABEL.d / 2, 0.8])],
};

/* ---------- 模型機櫃：正面有出口門與 Stop hook 的門閂 ---------- */

const DOOR = { x0: CAB.x + 12, x1: CAB.x + 36, z0: 10, z1: 38 };
export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 6, 1.2),
  seams: join([14, 50].map((z) => sideSeam(CAB, z, P, 6))),
  rivets: [16.5, 47.5].flatMap((z) => Array.from({ length: 5 }, (_, i) => at([CAB.x + 8 + i * 8, CAB_FRONT, z]))),
  door: faceY(CAB_FRONT, DOOR.x0, DOOR.x1, DOOR.z0, DOOR.z1),
  doorInner: faceY(CAB_FRONT, DOOR.x0 + 2, DOOR.x1 - 2, DOOR.z0 + 2, DOOR.z1 - 2),
  /** 門閂的兩個導座，鎖在門框右側 */
  keepers: [24, 30].map((z) => S({ x: DOOR.x1 + 1, y: CAB_FRONT, w: 6, d: 2.2, r: 0.5 }, z - 1.6, 3.2, 2)),
  /** 門閂本體（在 x = 0 建好，收起時往右退） */
  bolt: S({ x: DOOR.x0 + 4, y: CAB_FRONT, w: 30, d: 1.6, r: 0.6 }, 26, 2.4, 2, 0.3),
  boltKnob: C(DOOR.x0 + 32, CAB_FRONT + 1, 1.6, 28.4, 2, 12),
  slot: faceY(CAB_FACE, -10, 10, CARD_Z - 1, CARD_Z + CARD_H + 3),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  capScrews: corners(insetPlan(CAB, 3), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
  lampBase: C(CAB.x + 24, CAB.y + 20, 4.6, CAB_TOP + 2, 2, 24),
  lamp: C(CAB.x + 24, CAB.y + 20, 3.2, CAB_TOP + 4, 3.2, 24, 0.4),
};
export const BOLT_TRAVEL = 18;

/* ---------- 導軌 ---------- */

const RAIL_TICKS = sideTicks(RAIL.x + 6, RAIL.x + RAIL.w - 10, 5, 5, RAIL.y + RAIL.d, RAIL_H, [1.2, 2.6], P);
const STOP: Plan = { x: RAIL.x + RAIL.w - 7, y: -9, w: 7, d: 18, r: 1.2 };
export const RAIL_ART = {
  rail: S(RAIL, 0, RAIL_H, 4, 0.6),
  ticksMinor: RAIL_TICKS.minor,
  ticksMajor: RAIL_TICKS.major,
  railScrews: Array.from({ length: 7 }, (_, i) => at([RAIL.x + 16 + i * 40, 0, RAIL_H])),
  stop: S(STOP, 0, 9, 3, 0.5),
  stopScrews: [at([STOP.x + 3.5, -5, 9]), at([STOP.x + 3.5, 5, 9])],
};

/* ---------- 滑台與卡（在 x = 0 建好） ---------- */

export const CARRIAGE_ART = {
  plate: S(CARRIAGE, CARRIAGE_Z, CARRIAGE_H, 4, 0.6),
  seam: sideSeam(CARRIAGE, CARRIAGE_Z + 2, P, 4),
  rivets: Array.from({ length: 6 }, (_, i) => at([CARRIAGE.x + 5 + i * 4, CARRIAGE.y + CARRIAGE.d, CARRIAGE_Z + 3.6])),
  stops: [[-13, -14], [13, -14], [-13, 14], [13, 14]].map(([x, y]) => C(x, y, 1.4, CARD_Z, 4, 12)),
  card: S(CARD, CARD_Z, CARD_H, 3, 0.3),
  cardLayers: sideSeam(CARD, CARD_Z + 1.5, P, 3),
  /** 結果卡上的壓印：三條字行 */
  stamp: join([0, 1, 2].map((i) => lineOnTop([CARD.x + 4, CARD.y + 6 + i * 4], [CARD.x + [16, 11, 14][i], CARD.y + 6 + i * 4], CARD_Z + CARD_H, P))),
};

/* ---------- 量測站 / 壓印機的骨架 ---------- */

function frameOf(sx: number) {
  const foot: Plan = { x: sx - 12, y: COLUMN_Y - 6, w: 24, d: 24, r: 2 };
  const column: Plan = { x: sx - 7, y: COLUMN_Y, w: 14, d: 12, r: 2 };
  const arm: Plan = { x: sx - 6, y: COLUMN_Y, w: 12, d: -COLUMN_Y + 6, r: 2 };
  return {
    foot: S(foot, 0, 3, 4, 0.5),
    footScrews: corners(foot, 3.5).map(([x, y]) => at([x, y, 3])),
    column: S(column, 3, ARM_Z - 3, 4, 0.6),
    columnSeam: join([22, 44].map((z) => sideSeam(column, z, P, 4))),
    arm: S(arm, ARM_Z, ARM_H, 4, 0.6),
    armScrews: [at([sx, COLUMN_Y + 3, ARM_Z + ARM_H]), at([sx, -2, ARM_Z + ARM_H])],
    head: C(sx, 0, 5, HEAD_Z, ARM_Z - HEAD_Z, 28),
    headSeam: sideArc(sx, 0, 5, HEAD_Z + 2, P, 20),
    clip: (() => {
      const [cx, cy] = at([sx, 0, HEAD_Z]);
      return pathOf([[cx - 30, cy], [cx + 30, cy], [cx + 30, cy + 400], [cx - 30, cy + 400]], true);
    })(),
  };
}

/** 量測站（PreToolUse / PostToolUse hook）：懸臂上有一只錶，探針往下量卡 */
function gaugeOf(sx: number) {
  const dy = COLUMN_Y + 26;
  const top = ARM_Z + ARM_H + 6;
  const ticks = radialTicks(sx, dy, 8, 20, 5, top, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
  return {
    ...frameOf(sx),
    dialPost: C(sx, dy, 3, ARM_Z + ARM_H, 2, 16),
    dial: C(sx, dy, 10, ARM_Z + ARM_H + 2, 4, 48, 0.6),
    dialKnurl: knurl(sx, dy, 10, top - 2, top, 60, P, 0.3),
    dialBezel: ring(sx, dy, 8.6, top, P, 48),
    dialMinor: ticks.minor,
    dialMajor: ticks.major,
    /** 以下在 z = 0 建好，往上平移 */
    tip: C(sx, 0, 3.4, 0, 2, 24, 0.3),
    rod: C(sx, 0, 1.6, 2, 70, 14),
  };
}
export const PRE_ART = gaugeOf(X.pre);
export const POST_ART = gaugeOf(X.post);

/** 錶針：讀數 0..1 */
export function needleAt(sx: number, share: number) {
  const dy = COLUMN_Y + 26;
  const a = -0.75 * Math.PI + Math.max(0, Math.min(1, share)) * 1.5 * Math.PI;
  const top = ARM_Z + ARM_H + 6.2;
  return lineOnTop([sx - Math.sin(a) * 2, dy + Math.cos(a) * 2], [sx + Math.sin(a) * 7, dy - Math.cos(a) * 7], top, P);
}

/** 工具壓印機 */
export const TOOL_ART = {
  ...frameOf(X.tool),
  knob: C(X.tool, COLUMN_Y + 8, 3.6, ARM_Z + ARM_H, 4, 28),
  knobKnurl: knurl(X.tool, COLUMN_Y + 8, 3.6, ARM_Z + ARM_H, ARM_Z + ARM_H + 4, 28, P),
  pad: C(X.tool, 0, 8, 0, 3, 40, 0.5),
  padRing: ring(X.tool, 0, 5.5, 3, P, 32),
  rod: C(X.tool, 0, 2, 3, 70, 16),
};

/* ---------- PreToolUse 的擋板：從導軌的槽口升起 ---------- */

const BARRIER: Plan = { x: X.barrier - 1.5, y: -15, w: 3, d: 30, r: 0.6 };
export const BARRIER_ART = {
  housing: S({ x: X.barrier - 5, y: -20, w: 10, d: 40, r: 1.5 }, 0, RAIL_H + 0.6, 3, 0.4),
  slot: planOutline(insetPlan(BARRIER, -0.8), RAIL_H + 0.6, P),
  housingScrews: [at([X.barrier, -17.5, RAIL_H + 0.6]), at([X.barrier, 17.5, RAIL_H + 0.6])],
  /** 在完全升起的位置建好，往下平移收進槽裡 */
  plate: S(BARRIER, RAIL_H + 0.6, BARRIER_H, 2, 0.3),
  plateSeam: sideSeam(BARRIER, RAIL_H + 0.6 + BARRIER_H - 3, P, 2),
  /** 只畫槽口以上的部分 */
  clip: clipOf([
    [BARRIER.x - 2, BARRIER.y - 2, RAIL_H + 0.6], [BARRIER.x + BARRIER.w + 2, BARRIER.y - 2, RAIL_H + 0.6],
    [BARRIER.x + BARRIER.w + 2, BARRIER.y + BARRIER.d + 2, RAIL_H + 0.6], [BARRIER.x - 2, BARRIER.y + BARRIER.d + 2, RAIL_H + 0.6],
    [BARRIER.x - 2, BARRIER.y - 2, 200], [BARRIER.x + BARRIER.w + 2, BARRIER.y - 2, 200],
    [BARRIER.x + BARRIER.w + 2, BARRIER.y + BARRIER.d + 2, 200], [BARRIER.x - 2, BARRIER.y + BARRIER.d + 2, 200],
  ]),
};

/* ---------- 權限閘門組：機殼、三片閘板、指示燈、模式旋鈕 ---------- */

export const MODES = ["default", "acceptEdits", "plan", "auto", "dontAsk", "bypassPermissions"];
const KNOB = { x: GATE_HOUSING.x + GATE_HOUSING.w - 9, y: GATE_HOUSING.y + 9 };
const GATE_XS = [X.deny, X.ask, X.allow];
const MODE_TICKS = radialTicks(KNOB.x, KNOB.y, 7.5, 5, 1, GATE_TOP + 0.6, [1.6, 1.6], P, -0.8 * Math.PI, 1.6 * Math.PI);
export const GATES_ART = {
  halo: haloOf(GATE_HOUSING, 0, GATE_TOP, P),
  housing: S(GATE_HOUSING, 0, GATE_TOP, 4, 1),
  seam: sideSeam(GATE_HOUSING, 8, P, 4),
  /** 三道閘板在機殼正面的開口 */
  mouths: join(GATE_XS.map((gx) => faceY(GATE_HOUSING.y + GATE_HOUSING.d, gx - 2.6, gx + 2.6, RAIL_H, RAIL_H + GATE_H + 2))),
  plateTop: S(insetPlan(GATE_HOUSING, 2), GATE_TOP, 0.6, 4),
  screws: corners(GATE_HOUSING, 3.5).map(([x, y]) => at([x, y, GATE_TOP + 0.6])),
  lamps: GATE_XS.map((gx) => ({ base: C(gx, GATE_HOUSING.y + 22, 3, GATE_TOP + 0.6, 1.4, 20), lens: C(gx, GATE_HOUSING.y + 22, 2, GATE_TOP + 2, 2.4, 20, 0.3) })),
  knobBase: C(KNOB.x, KNOB.y, 7.5, GATE_TOP + 0.6, 0.01, 40),
  modeTicks: MODE_TICKS.major,
  knob: C(KNOB.x, KNOB.y, 4.6, GATE_TOP + 0.6, 4, 32),
  knobKnurl: knurl(KNOB.x, KNOB.y, 4.6, GATE_TOP + 0.6, GATE_TOP + 4.6, 30, P),
};
export function modePointer(index: number) {
  const a = -0.8 * Math.PI + (Math.max(0, Math.min(5, index)) / 5) * 1.6 * Math.PI;
  return lineOnTop([KNOB.x, KNOB.y], [KNOB.x + Math.sin(a) * 4.2, KNOB.y - Math.cos(a) * 4.2], GATE_TOP + 4.7, P);
}
/** 一片閘板（關閉位置；打開時往 -y 退進機殼） */
export function gatePlate(gx: number) {
  const plan: Plan = { x: gx - 1.5, y: GATE_Y0, w: 3, d: GATE_D, r: 0.6 };
  return { plate: S(plan, RAIL_H + 0.5, GATE_H, 2, 0.3), seam: sideSeam(plan, RAIL_H + GATE_H - 3, P, 2) };
}

/* ---------- 導演的批准台 ---------- */

const BUTTON = { x: DESK.x + 26, y: DESK.y + 12 };
export const DESK_ART = {
  halo: haloOf(DESK, 0, DESK_H, P),
  body: S(DESK, 0, DESK_H, 4, 0.8),
  seam: sideSeam(DESK, 4, P, 4),
  panel: planOutline(insetPlan(DESK, 3), DESK_H, P),
  screws: corners(insetPlan(DESK, 3), 2.5).map(([x, y]) => at([x, y, DESK_H])),
  bezel: C(BUTTON.x, BUTTON.y, 6, DESK_H, 1.6, 32),
  /** 在 z = 0 建好、往上平移（按下時下沉） */
  button: C(BUTTON.x, BUTTON.y, 4.4, 0, 3, 32, 0.4),
  lampBase: C(DESK.x + 10, DESK.y + 12, 3.6, DESK_H, 1.4, 20),
  lamp: C(DESK.x + 10, DESK.y + 12, 2.6, DESK_H + 1.4, 2.6, 20, 0.3),
  buttonZ: DESK_H + 1.6,
};

