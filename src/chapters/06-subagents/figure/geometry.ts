import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, ring, sideSeam, sideTicks,
  slabOf, type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  BASE, BASE_H, CARD_Z, CARGO, DRAWER_H, FILES, FILES_FRONT, FILES_TOP, FOOT_H, MAIN_CAB, MAIN_CAB_TOP, P, PLINTH_H,
  RAIL, RAIL_H, SLED, SLED_H, TRAY_H, UNIT_CAB, UNIT_CAB_H, UNIT_CAB_Z, WALL, WALL_TOP, at, type Rack,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: -170, y: 44, w: 60, d: 13, r: 2 };
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

/* ---------- 機櫃（主代理大、攝製組小） ---------- */

function cabinetArt(plan: Plan, top: number) {
  const front = plan.y + plan.d;
  return {
    halo: haloOf(insetPlan(plan, -2), 0, top, P),
    plinth: S(insetPlan(plan, -2), 0, 3, 4, 0.5),
    body: S(plan, 3, top - 3, 6, 1),
    seams: join([12, top - 10].map((z) => sideSeam(plan, z, P, 6))),
    vents: join([0, 1, 2].map((i) => faceY(front, plan.x + 6, plan.x + plan.w * 0.55, 18 + i * 5, 20 + i * 5))),
    rivets: [14.5, top - 7.5].flatMap((z) => Array.from({ length: Math.floor((plan.w - 8) / 7) + 1 }, (_, i) => at([plan.x + 4 + i * 7, front, z]))),
    cap: S(insetPlan(plan, 2.5), top, 2, 6, 0.5),
    capScrews: corners(insetPlan(plan, 2.5), 3.5).map(([x, y]) => at([x, y, top + 2])),
    lampBase: C(plan.x + plan.w - 9, plan.y + plan.d - 9, 3.6, top + 2, 1.6, 20),
    lamp: C(plan.x + plan.w - 9, plan.y + plan.d - 9, 2.4, top + 3.6, 2.6, 20, 0.3),
  };
}
export const MAIN_CAB_ART = cabinetArt(MAIN_CAB, MAIN_CAB_TOP);
/** 攝製組的小機櫃：坐在卡架頂上 */
export function unitCabArt(cx: number) {
  const plan = UNIT_CAB(cx);
  const z0 = UNIT_CAB_Z;
  const top = z0 + UNIT_CAB_H;
  const front = plan.y + plan.d;
  return {
    body: S(plan, z0, UNIT_CAB_H, 4, 0.8),
    seam: sideSeam(plan, z0 + 4, P, 4),
    vents: join([0, 1].map((i) => faceY(front, plan.x + 4, plan.x + 14, z0 + 7 + i * 3.4, z0 + 8.4 + i * 3.4))),
    rivets: [at([plan.x + 2.5, front, z0 + 2]), at([plan.x + plan.w - 2.5, front, z0 + 2])],
    lampBase: C(plan.x + plan.w - 6, plan.y + plan.d - 6, 3, top, 1.4, 18),
    lamp: C(plan.x + plan.w - 6, plan.y + plan.d - 6, 2, top + 1.4, 2.2, 18, 0.3),
  };
}

/* ---------- 卡架 ---------- */

export function rackArt(rack: Rack) {
  const [px, py] = rack.post;
  const plinth: Plan = { x: rack.cx - px - 5, y: -py - 5, w: 2 * px + 10, d: 2 * py + 10, r: 3 };
  const head: Plan = { x: rack.cx - px - 4, y: -py - 4, w: 2 * px + 8, d: 2 * py + 8, r: 3 };
  const post = ([dx, dy]: [number, number]) => ({
    collar: C(rack.cx + dx, dy, 2.8, PLINTH_H, 1.8, 16),
    post: C(rack.cx + dx, dy, 1.8, PLINTH_H + 1.8, rack.top - PLINTH_H - 1.8, 16),
  });
  const four: [number, number][] = [[-px, -py], [px, -py], [-px, py], [px, py]];
  return {
    halo: haloOf(plinth, 0, 6, P),
    plinth: S(plinth, 0, PLINTH_H, 4, 0.6),
    plinthScrews: corners(plinth, 3).map(([x, y]) => at([x, y, PLINTH_H])),
    tray: S(insetPlan(rack.card, -1.5), PLINTH_H, TRAY_H, 3),
    backPosts: four.filter(([, y]) => y < 0).map(post),
    frontPosts: four.filter(([, y]) => y > 0).map(post),
    head: S(head, rack.top, 5, 4, 0.6),
    headSeam: sideSeam(head, rack.top + 2, P, 4),
    headScrews: corners(head, 3.5).map(([x, y]) => at([x, y, rack.top + 5])),
  };
}

/** 一張卡：在 z = 0 建好，再平移到疊放高度 */
export function cardArt(plan: Plan, t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(plan, h, P, 3));
  return { paths: S(plan, 0, t, 3, t > 1.6 ? 0.3 : 0), layers: join(layers) };
}
export { CARD_Z };

/* ---------- 隔板 ---------- */

export const WALL_ART = {
  feet: [WALL.y + 8, WALL.y + WALL.d - 8].map((y) => S({ x: WALL.x - 5, y: y - 5, w: WALL.w + 10, d: 10, r: 1.5 }, 0, 3, 3, 0.4)),
  panel: S(WALL, 3, WALL_TOP - 3, 3, 0.6),
  seams: join([24, 48].map((z) => sideSeam(WALL, z, P, 3))),
  rivets: [24, 48].flatMap((z) => [0, 1, 2, 3, 4, 5].map((i) => at([WALL.x + WALL.w, WALL.y + 8 + i * 13, z + 2.5]))),
  cap: S(insetPlan(WALL, -1), WALL_TOP, 2, 3, 0.4),
};

/* ---------- 劇本檔案櫃 ---------- */

export const drawerZ = (i: number) => 4 + i * (DRAWER_H + 1.5);
export const FILES_ART = {
  halo: haloOf(FILES, 0, FILES_TOP, P),
  plinth: S(insetPlan(FILES, -2), 0, 3, 4, 0.5),
  body: S(FILES, 3, FILES_TOP - 3, 4, 1),
  bays: join([0, 1].map((i) => faceY(FILES_FRONT, FILES.x + 4, FILES.x + FILES.w - 4, drawerZ(i), drawerZ(i) + DRAWER_H))),
  top: S(insetPlan(FILES, 2), FILES_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(FILES, 2), 3.5).map(([x, y]) => at([x, y, FILES_TOP + 2])),
};
export function drawerArt(i: number, open: number) {
  const z0 = drawerZ(i) + 0.8;
  const x0 = FILES.x + 5;
  const w = FILES.w - 10;
  const front: Plan = { x: x0 - 0.5, y: FILES_FRONT, w: w + 1, d: 2.4, r: 0.6 };
  const hz = z0 + DRAWER_H - 7;
  const hx = x0 + w / 2 - 6;
  return {
    box: S({ x: x0, y: FILES_FRONT, w, d: Math.max(open, 0.01), r: 0.4 }, z0 + 1, DRAWER_H - 4, 2),
    front: S(front, z0, DRAWER_H - 1.6, 2, 0.4),
    pull: S({ x: x0 + w / 2 - 5, y: front.y + front.d, w: 10, d: 2, r: 0.8 }, z0 + 3, 2.2, 2),
    holder: faceY(front.y + front.d, hx, hx + 12, hz, hz + 4),
    rivets: [at([hx - 1.5, front.y + front.d, hz + 2]), at([hx + 13.5, front.y + front.d, hz + 2])],
  };
}

/* ---------- 導軌與滑台 ---------- */

const RAIL_TICKS = sideTicks(RAIL.x + 6, RAIL.x + RAIL.w - 6, 5, 5, RAIL.y + RAIL.d, RAIL_H, [1, 2.2], P);
export const RAIL_ART = {
  rail: S(RAIL, 0, RAIL_H, 4, 0.5),
  minor: RAIL_TICKS.minor,
  major: RAIL_TICKS.major,
  stops: [RAIL.x - 4, RAIL.x + RAIL.w].map((x) => S({ x, y: RAIL.y - 3, w: 4, d: RAIL.d + 6, r: 1 }, 0, 7, 3, 0.4)),
  screws: Array.from({ length: 7 }, (_, i) => at([RAIL.x + 18 + i * 38, RAIL.y + RAIL.d / 2, RAIL_H])),
};
/** 滑台在 x = 0 建好 */
export const SLED_ART = {
  plate: S(SLED, RAIL_H, SLED_H, 3, 0.5),
  seam: sideSeam(SLED, RAIL_H + 1.6, P, 3),
  rivets: [0, 1, 2, 3].map((i) => at([SLED.x + 4 + i * 4, SLED.y + SLED.d, RAIL_H + 2.6])),
  knob: C(SLED.x + SLED.w + 1.4, SLED.y + SLED.d / 2, 1.8, RAIL_H + 1, 2.4, 14),
  knobKnurl: knurl(SLED.x + SLED.w + 1.4, SLED.y + SLED.d / 2, 1.8, RAIL_H + 1, RAIL_H + 3.4, 14, P),
  /** 滑台上載的卡（任務單或報告） */
  cargo: S(CARGO, RAIL_H + SLED_H, 1.8, 3, 0.3),
};
