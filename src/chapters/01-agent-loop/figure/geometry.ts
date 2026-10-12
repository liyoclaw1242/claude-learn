import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, radialTicks, ring,
  sideArc, sideMatrix, sideSeam, sideTicks, slabOf, topTicks, type Flat, type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  ARM_H, ARM_Z, BASE, BASE_H, CAB, CAB_FACE, CAB_FRONT, CAB_TOP, CAB_Z, CARD, CARRIAGE, CARRIAGE_H, CARRIAGE_Z,
  COLUMN_D, COLUMN_Y, DIAL, FOOT_H, HEAD_R, HEAD_Z, HOOD, HOOD_H, HOOD_Z, LAMP, P, PAD_H, PAD_R, POST_R, POST_TOP,
  POSTS, RAIL, RAIL_H, ROD_LEN, ROD_R, STATION, TRAY_H, TRAY_Z, at,
} from "./view";

/* 靜態零件：載入時算一次，之後只搬動群組 */

const S = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 28, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/** 垂直面上的封閉矩形（通風槽、讀卡窗）：face 是 "y" 表示位在 y = at 的面上 */
function faceRect(face: "x" | "y", fixed: number, u0: number, u1: number, z0: number, z1: number) {
  const p = (u: number, z: number): [number, number, number] => (face === "y" ? [u, fixed, z] : [fixed, u, z]);
  return pathOf([at(p(u0, z0)), at(p(u1, z0)), at(p(u1, z1)), at(p(u0, z1))], true);
}

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const BASE_SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: -60, y: 36, w: 62, d: 13, r: 2 };
const STRIP: Plan = { x: RAIL.x + 4, y: 50, w: RAIL.w - 8, d: 7, r: 1 };
const STRIP_TICKS = topTicks(STRIP.x + 3, STRIP.x + STRIP.w - 3, 5, 5, STRIP.y + 0.8, 0.6, [2, 3.6], P);

export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P),
  feet: FEET.map(([x, y]) => [C(x, y, 7, -BASE_H - FOOT_H, 1.6), C(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6)]),
  slab: S(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(BASE_SCREWS.map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: BASE_SCREWS.map(([x, y]) => at([x, y, 0])),
  label: S(LABEL, 0, 0.8, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P),
  labelRule: join([0, 1, 2].map((row) => lineOnTop([LABEL.x + 8, LABEL.y + 3.6 + row * 2.2], [LABEL.x + [46, 32, 40][row], LABEL.y + 3.6 + row * 2.2], 0.8, P))),
  labelScrews: [at([LABEL.x + 3.5, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.5, LABEL.y + LABEL.d / 2, 0.8])],
  strip: S(STRIP, 0, 0.6, 3),
  stripMinor: STRIP_TICKS.minor,
  stripMajor: STRIP_TICKS.major,
  stripScrews: [at([STRIP.x + 2, STRIP.y + 5, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 5, 0.6])],
};

/* ---------- 模型機櫃（密封，只有一個讀卡口） ---------- */

const CAP = insetPlan(CAB, 3);
const RIVET_X = Array.from({ length: 8 }, (_, i) => CAB.x + 8 + i * 8.5);
const RIVET_Y = Array.from({ length: 8 }, (_, i) => CAB.y + 8 + i * 9);
const DIAL_TOP = DIAL.z + DIAL.h;
const DIAL_TICKS = radialTicks(DIAL.x, DIAL.y, DIAL.r - 3, 30, 5, DIAL_TOP, [1.3, 2.8], P, -0.75 * Math.PI, 1.5 * Math.PI);

export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, CAB_Z, 6, 0.6),
  body: S(CAB, CAB_Z, CAB_TOP - CAB_Z, 6, 1.2),
  seams: join([16, 54].map((z) => sideSeam(CAB, z, P, 6))),
  rivets: [
    ...[18.5, 51.5].flatMap((z) => RIVET_X.map((x) => at([x, CAB_FRONT, z]))),
    ...[18.5, 51.5].flatMap((z) => RIVET_Y.map((y) => at([CAB_FACE, y, z]))),
  ],
  vents: join([0, 1, 2, 3].map((i) => faceRect("y", CAB_FRONT, CAB.x + 12, CAB.x + 46, 24 + i * 6, 26.2 + i * 6))),
  plateText: sideMatrix([CAB.x + 12, CAB_FRONT], 46, P, "left"),
  bay: faceRect("x", CAB_FACE, -19, 19, CAB_Z + 3, 48),
  bayInner: faceRect("x", CAB_FACE, -16.5, 16.5, CAB_Z + 5.5, 45.5),
  cap: S(CAP, CAB_TOP, 2, 6, 0.6),
  capScrews: corners(CAP, 4.5).map(([x, y]) => at([x, y, CAB_TOP + 2])),
  dialStand: C(DIAL.x, DIAL.y, DIAL.r - 4, CAB_TOP + 2, DIAL.z - CAB_TOP - 2, 40),
  dial: C(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, 64, 0.8),
  dialKnurl: knurl(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 2.6, DIAL_TOP, 80, P, 0.3),
  dialBand: sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 2.6, P, 40),
  dialBezel: ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL_TOP, P, 64),
  dialMinor: DIAL_TICKS.minor,
  dialMajor: DIAL_TICKS.major,
  dialHub: ring(DIAL.x, DIAL.y, 1.4, DIAL_TOP, P, 16),
  lampBase: C(LAMP.x, LAMP.y, 4.6, CAB_TOP + 2, 2, 24),
  lamp: C(LAMP.x, LAMP.y, 3.2, CAB_TOP + 4, 3.2, 24, 0.4),
  lampRing: ring(LAMP.x, LAMP.y, 4.6, CAB_TOP + 4, P, 24),
};

/** 錶針：讀數 0..1 對應 -135°..135° */
export function needleAt(share: number) {
  const angle = -0.75 * Math.PI + Math.max(0, Math.min(1, share)) * 1.5 * Math.PI;
  const r = DIAL.r - 4;
  const tip: Plane = [DIAL.x + Math.sin(angle) * r, DIAL.y - Math.cos(angle) * r];
  const tail: Plane = [DIAL.x - Math.sin(angle) * 3, DIAL.y + Math.cos(angle) * 3];
  return lineOnTop(tail, tip, DIAL_TOP + 0.2, P);
}

/* ---------- 讀卡罩（機櫃伸出來、蓋在停靠位上方） ---------- */

const HOOD_HEAD = STATION.dock;
export const HOOD_ART = {
  gussets: [-14, 14].map((y) => S({ x: CAB_FACE, y: y - 1.5, w: 8, d: 3, r: 0.6 }, HOOD_Z - 10, 10, 2)),
  hood: S(HOOD, HOOD_Z, HOOD_H, 4, 0.6),
  hoodScrews: [-14, 14].map((y) => at([CAB_FACE + 4, y, HOOD_Z + HOOD_H])),
  head: C(HOOD_HEAD, 0, HEAD_R, HOOD_Z - 6, 6, 28),
  headSeam: sideArc(HOOD_HEAD, 0, HEAD_R, HOOD_Z - 2, P, 20),
};

/* ---------- 導軌 ---------- */

const RAIL_TICKS = sideTicks(RAIL.x + 6, RAIL.x + RAIL.w - 10, 5, 5, RAIL.y + RAIL.d, RAIL_H, [1.2, 2.6], P);
const STOP: Plan = { x: RAIL.x + RAIL.w - 7, y: -9, w: 7, d: 18, r: 1.2 };
export const RAIL_ART = {
  buffer: S({ x: CAB_FACE, y: -9, w: 2.4, d: 18, r: 0.8 }, RAIL_H, 6, 3),
  rail: S(RAIL, 0, RAIL_H, 4, 0.6),
  ticksMinor: RAIL_TICKS.minor,
  ticksMajor: RAIL_TICKS.major,
  railScrews: Array.from({ length: 7 }, (_, i) => at([RAIL.x + 20 + i * 40, 0, RAIL_H])),
  stop: S(STOP, 0, 9, 3, 0.5),
  stopScrews: [at([STOP.x + 3.5, -5, 9]), at([STOP.x + 3.5, 5, 9])],
};

/* ---------- 滑台（Harness），在 x = 0 建好，靠 translate 移動 ---------- */

const TRAY = insetPlan(CARRIAGE, 2);
const post = ([px, py]: [number, number]) => ({
  collar: C(px, py, 2.8, TRAY_Z + TRAY_H, 1.6, 16),
  post: C(px, py, POST_R, TRAY_Z + TRAY_H + 1.6, POST_TOP - TRAY_Z - TRAY_H - 1.6, 16),
  cap: C(px, py, 2.4, POST_TOP, 1.2, 16),
});
export const CARRIAGE_ART = {
  plate: S(CARRIAGE, CARRIAGE_Z, CARRIAGE_H, 4, 0.6),
  seam: sideSeam(CARRIAGE, CARRIAGE_Z + 2, P, 4),
  rivets: Array.from({ length: 7 }, (_, i) => at([CARRIAGE.x + 5 + i * 4, CARRIAGE.y + CARRIAGE.d, CARRIAGE_Z + 3.6])),
  knob: C(CARRIAGE.x + CARRIAGE.w + 1.5, 0, 2.4, CARRIAGE_Z + 1, 3, 16),
  tray: S(TRAY, TRAY_Z, TRAY_H, 4),
  trayLine: planOutline(insetPlan(TRAY, 1.5), TRAY_Z + TRAY_H, P),
  backPosts: POSTS.filter(([, y]) => y < 0).map(post),
  frontPosts: POSTS.filter(([, y]) => y > 0).map(post),
};

/** 一張卡（訊息）：z 是底面，t 是厚度；厚的卡在正面畫出紙層 */
export function cardArt(z: number, t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(CARD, z + h, P, 3));
  return {
    paths: S(CARD, z, t, 3, t > 1.6 ? 0.3 : 0),
    layers: join(layers),
    holes: [0, 1, 2, 3, 4].map((i) => at([CARD.x + 5 + i * 4, CARD.y + 5, z + t])),
  };
}

/* ---------- 壓印機（工具）與投卡機 ---------- */

function frameOf(sx: number) {
  const foot: Plan = { x: sx - 12, y: COLUMN_Y - 6, w: 24, d: 24, r: 2 };
  const column: Plan = { x: sx - 7, y: COLUMN_Y, w: 14, d: COLUMN_D, r: 2 };
  const arm: Plan = { x: sx - 6, y: COLUMN_Y, w: 12, d: -COLUMN_Y + 6, r: 2 };
  return {
    foot: S(foot, 0, 3, 4, 0.5),
    footScrews: corners(foot, 3.5).map(([x, y]) => at([x, y, 3])),
    column: S(column, 3, ARM_Z - 3, 4, 0.6),
    columnSeam: join([24, 52].map((z) => sideSeam(column, z, P, 4))),
    arm: S(arm, ARM_Z, ARM_H, 4, 0.6),
    armScrews: [at([sx, COLUMN_Y + 3, ARM_Z + ARM_H]), at([sx, -2, ARM_Z + ARM_H])],
    knob: C(sx, COLUMN_Y + 8, 3.6, ARM_Z + ARM_H, 4, 28),
    knobKnurl: knurl(sx, COLUMN_Y + 8, 3.6, ARM_Z + ARM_H, ARM_Z + ARM_H + 4, 28, P),
  };
}

export type Tool = "Read" | "Edit" | "Bash";
export const TOOLS: Tool[] = ["Read", "Edit", "Bash"];

export const PRESS_ART = Object.fromEntries(TOOLS.map((tool) => {
  const sx = STATION[tool];
  return [tool, {
    ...frameOf(sx),
    head: C(sx, 0, HEAD_R, HEAD_Z, ARM_Z - HEAD_Z, 28),
    headSeam: sideArc(sx, 0, HEAD_R, HEAD_Z + 2, P, 20),
    /** 以下兩個在 z = 0 建好，往上平移到目前高度 */
    pad: C(sx, 0, PAD_R, 0, PAD_H, 40, 0.5),
    padRing: ring(sx, 0, PAD_R - 2.5, PAD_H, P, 32),
    rod: C(sx, 0, ROD_R, PAD_H, ROD_LEN, 16),
    /** 桿子只露出讀頭以下的部分 */
    clip: rodClip(sx, HEAD_Z),
  }];
})) as Record<Tool, ReturnType<typeof frameOf> & { head: ReturnType<typeof C>; headSeam: string; pad: ReturnType<typeof C>; padRing: string; rod: ReturnType<typeof C>; clip: string }>;

export const HOOD_PLATE = {
  pad: S({ x: STATION.dock - 13, y: -14, w: 26, d: 28, r: 1.5 }, 0, PAD_H, 3, 0.5),
  padLine: planOutline({ x: STATION.dock - 10, y: -11, w: 20, d: 22, r: 1 }, PAD_H, P),
  rod: C(STATION.dock, 0, ROD_R, PAD_H, ROD_LEN, 16),
  clip: rodClip(STATION.dock, HOOD_Z - 6),
};

/** 螢幕空間的裁切：讀頭底面以下的區域 */
function rodClip(sx: number, z: number) {
  const [cx, cy] = at([sx, 0, z]);
  return pathOf([[cx - 30, cy], [cx + 30, cy], [cx + 30, cy + 400], [cx - 30, cy + 400]] as Flat[], true);
}

/* 投卡機（使用者） */
const HOME = STATION.home;
const MAG: Plan = { x: HOME - 14, y: -16, w: 28, d: 32, r: 2 };
export const DISPENSER_ART = {
  ...frameOf(HOME),
  lip: S({ x: HOME - 11, y: -12, w: 22, d: 24, r: 1.5 }, 54, 3, 4, 0.4),
  magazine: S(MAG, 57, ARM_Z - 57, 4, 0.8),
  magSeam: sideSeam(MAG, 61, P, 4),
  window: faceRect("y", MAG.y + MAG.d, HOME - 9, HOME + 9, 64, 72.5),
  windowCards: join([66, 68.2, 70.4].map((z) => pathOf([at([HOME - 9, MAG.y + MAG.d, z]), at([HOME + 9, MAG.y + MAG.d, z])]))),
  magScrews: [at([MAG.x + 3, MAG.y + MAG.d, 74]), at([MAG.x + MAG.w - 3, MAG.y + MAG.d, 74])],
};
