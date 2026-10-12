import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, ring, sideArc, sideSeam,
  slabOf, type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  ARM_Z, BASE, BASE_H, BED, BED_H, CAB, CAB_TOP, CARD, CLAMP_H, COLUMN_Y, DIVIDER_H, FOOT_H, P, PAGE, PLINTH,
  PLINTH_H, PRESS_X, RAM_R, ROD_TOP, RODS, SHEET, SHELF, SHELF_TOP, STOP, STOP_H, TRAY_H, TRAY_Z, at,
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
const LABEL: Plan = { x: 30, y: 38, w: 62, d: 13, r: 2 };
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

/* ---------- 組裝夾具 ---------- */

export const JIG_ART = {
  halo: haloOf(PLINTH, 0, 8, P),
  plinth: S(PLINTH, 0, PLINTH_H, 4, 0.8),
  plinthSeam: sideSeam(PLINTH, 2, P, 4),
  plinthScrews: corners(PLINTH, 4).map(([x, y]) => at([x, y, PLINTH_H])),
  seat: planOutline(insetPlan(CARD, -1.5), PLINTH_H, P),
  rods: RODS.map(([x, y]) => ({
    collar: C(x, y, 4, PLINTH_H, 3, 20),
    rod: C(x, y, 2.2, PLINTH_H + 3, ROD_TOP - PLINTH_H - 3, 18),
    cap: C(x, y, 3.2, ROD_TOP, 2.5, 20),
  })),
};

/** 一張卡：z 是底面、t 是厚度 */
export function cardArt(z: number, t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(CARD, z + h, P, 3));
  return { paths: S(CARD, z, t, 3, 0.3), layers: join(layers) };
}

/** 分隔板：比卡大一圈，右側伸出一片索引籤；三個區段的籤在不同位置 */
export function dividerArt(section: 0 | 1 | 2) {
  const plate: Plan = insetPlan(CARD, -1);
  const tabY = [CARD.y + 18, CARD.y + 8, CARD.y - 2][section];
  const tab: Plan = { x: CARD.x + CARD.w, y: tabY, w: 6, d: 10, r: 1.2 };
  return { plate: S(plate, 0, DIVIDER_H, 3, 0.2), tab: S(tab, 0, DIVIDER_H, 2) };
}

/** 快取夾板：橫在兩根導桿之間，往前伸出一塊壓板 */
export const CLAMP_ART = {
  bar: S({ x: RODS[0][0] - 5, y: RODS[0][1] - 4, w: RODS[1][0] - RODS[0][0] + 10, d: 8, r: 2 }, 0, CLAMP_H, 4, 0.5),
  bushings: RODS.map(([x, y]) => C(x, y, 4.2, -1, CLAMP_H + 2, 20)),
  plate: S({ x: CARD.x + 2, y: CARD.y + 1, w: CARD.w - 4, d: CARD.d - 4, r: 1.5 }, 0, 2.5, 3, 0.5),
  plateLine: planOutline({ x: CARD.x + 6, y: CARD.y + 5, w: CARD.w - 12, d: CARD.d - 12, r: 1 }, 2.5, P),
  lampBase: C(0, RODS[0][1], 2.6, CLAMP_H, 1.2, 16),
  lamp: C(0, RODS[0][1], 1.8, CLAMP_H + 1.2, 2, 16),
};

/* ---------- 公文架（目錄層級） ---------- */

const SIDE_W = 3;
const shelfSide = (x: number) => S({ x, y: SHELF.y, w: SIDE_W, d: SHELF.d, r: 1 }, 2, SHELF_TOP - 2, 3, 0.4);
export const SHELF_ART = {
  halo: haloOf({ x: SHELF.x, y: SHELF.y, w: SHELF.w, d: SHELF.d, r: 3 }, 0, SHELF_TOP, P),
  foot: S({ x: SHELF.x - 3, y: SHELF.y - 3, w: SHELF.w + 6, d: SHELF.d + 6, r: 3 }, 0, 2, 4, 0.5),
  back: S({ x: SHELF.x + SIDE_W, y: SHELF.y, w: SHELF.w - 2 * SIDE_W, d: 2, r: 0.5 }, 2, SHELF_TOP - 2, 3),
  left: shelfSide(SHELF.x),
  right: shelfSide(SHELF.x + SHELF.w - SIDE_W),
  top: S({ x: SHELF.x - 1, y: SHELF.y - 1, w: SHELF.w + 2, d: SHELF.d + 2, r: 2 }, SHELF_TOP, 2.5, 4, 0.5),
  topScrews: corners({ x: SHELF.x, y: SHELF.y, w: SHELF.w, d: SHELF.d, r: 0 }, 4).map(([x, y]) => at([x, y, SHELF_TOP + 2.5])),
  sideScrews: TRAY_Z.flatMap((z) => [at([SHELF.x + SHELF.w, SHELF.y + 10, z + 3]), at([SHELF.x + SHELF.w, SHELF.y + SHELF.d - 10, z + 3])]),
  trays: TRAY_Z.map((z) => {
    const floor: Plan = { x: SHELF.x + SIDE_W, y: SHELF.y + 2, w: SHELF.w - 2 * SIDE_W, d: SHELF.d - 2, r: 0.6 };
    const lip: Plan = { x: floor.x, y: SHELF.y + SHELF.d - 2.5, w: floor.w, d: 2.5, r: 0.6 };
    const hx = floor.x + floor.w / 2 - 8;
    return {
      floor: S(floor, z, 1.5, 3),
      lip: S(lip, z + 1.5, TRAY_H - 4, 2, 0.3),
      holder: faceY(SHELF.y + SHELF.d, hx, hx + 16, z + 2.2, z + 4.6),
      rivets: [at([hx - 1.6, SHELF.y + SHELF.d, z + 3.4]), at([hx + 17.6, SHELF.y + SHELF.d, z + 3.4])],
    };
  }),
};

/** 公文架裡的一張文件（在 z = 0 建好，平移到所屬層） */
export function sheetArt(offset: number) {
  const plan: Plan = { ...SHEET, x: SHEET.x + offset, y: SHEET.y - offset };
  return { paths: S(plan, 0, 0.9, 2), rule: join([0, 1, 2, 3].map((i) => lineOnTop([plan.x + 6, plan.y + 8 + i * 5], [plan.x + [30, 22, 34, 18][i], plan.y + 8 + i * 5], 0.9, P))) };
}

/* ---------- 模型機櫃 ---------- */

export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 6, 1.2),
  seams: join([14, 46].map((z) => sideSeam(CAB, z, P, 6))),
  slot: faceY(CAB.y + CAB.d, CAB.x + 10, CAB.x + 36, 30, 33),
  rivets: [16.5, 43.5].flatMap((z) => Array.from({ length: 5 }, (_, i) => at([CAB.x + 7 + i * 8, CAB.y + CAB.d, z]))),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  capScrews: corners(insetPlan(CAB, 3), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
};

/* ---------- Edit 壓印機 + hook 擋塊 ---------- */

const COLUMN: Plan = { x: PRESS_X - 7, y: COLUMN_Y, w: 14, d: 12, r: 2 };
const ARM: Plan = { x: PRESS_X - 6, y: COLUMN_Y, w: 12, d: -COLUMN_Y + 6, r: 2 };
const FOOT: Plan = { x: PRESS_X - 12, y: COLUMN_Y - 6, w: 24, d: 24, r: 2 };
export const PRESS_ART = {
  foot: S(FOOT, 0, 3, 4, 0.5),
  footScrews: corners(FOOT, 3.5).map(([x, y]) => at([x, y, 3])),
  column: S(COLUMN, 3, ARM_Z - 3, 4, 0.6),
  columnSeam: join([24, 50].map((z) => sideSeam(COLUMN, z, P, 4))),
  bed: S(BED, 0, BED_H, 4, 0.6),
  bedScrews: corners(BED, 3).map(([x, y]) => at([x, y, BED_H])),
  page: S(PAGE, BED_H, 0.8, 2),
  pageRule: join([0, 1, 2].map((i) => lineOnTop([PAGE.x + 4, PAGE.y + 6 + i * 4], [PAGE.x + [16, 12, 18][i], PAGE.y + 6 + i * 4], BED_H + 0.8, P))),
  head: C(PRESS_X, 0, 5.5, ARM_Z - 8, 8, 28),
  headSeam: sideArc(PRESS_X, 0, 5.5, ARM_Z - 6, P, 20),
  arm: S(ARM, ARM_Z, 8, 4, 0.6),
  armScrews: [at([PRESS_X, COLUMN_Y + 3, ARM_Z + 8]), at([PRESS_X, -2, ARM_Z + 8])],
  knob: C(PRESS_X, COLUMN_Y + 8, 3.6, ARM_Z + 8, 4, 28),
  knobKnurl: knurl(PRESS_X, COLUMN_Y + 8, 3.6, ARM_Z + 8, ARM_Z + 12, 28, P),
  /** 在 z = 0 建好、往上平移 */
  ram: C(PRESS_X, 0, RAM_R, 0, 3, 40, 0.5),
  ramRing: ring(PRESS_X, 0, RAM_R - 2.5, 3, P, 32),
  rod: C(PRESS_X, 0, 2, 3, 70, 16),
  rodClip: (() => {
    const [cx, cy] = at([PRESS_X, 0, ARM_Z - 8]);
    return pathOf([[cx - 30, cy], [cx + 30, cy], [cx + 30, cy + 400], [cx - 30, cy + 400]], true);
  })(),
  /** 擋塊與它的導軌：從 +x 側滑進壓頭下方 */
  guide: S({ x: BED.x + BED.w, y: -6, w: 26, d: 12, r: 1 }, 0, BED_H, 3, 0.4),
  stop: S(STOP, BED_H, STOP_H, 3, 0.5),
  stopLine: sideSeam(STOP, BED_H + STOP_H - 2, P, 3),
};
