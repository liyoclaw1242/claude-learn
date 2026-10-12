import {
  corners, cylinder, depthOf, haloOf, insetPlan, lineOnTop, pathOf, planOutline, ring, sideSeam, slabOf,
  type Plan, type Plane,
} from "../../../iso/iso-kit";
import type { ToolId } from "../steps";
import {
  BASE, BASE_H, CAB, CAB_TOP, CARD, CAT, CAT_FRONT, CAT_TOP, DESC_H, DRAWER_GAP, DRAWER_H, DRAWER_W, DRAWER_Z0, FOOT_H,
  MCP, MCP_H, P, PLINTH_H, POST_TOP, SLOTS, TRAY_PLINTH, at,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
/** y = 定值的垂直面上的封閉矩形 */
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: -40, y: 38, w: 62, d: 13, r: 2 };
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

/* ---------- 目錄櫃 ---------- */

export const slotX = (col: number) => CAT.x + 5 + col * (DRAWER_W + 4);
export const slotZ = (row: number) => DRAWER_Z0 + row * (DRAWER_H + DRAWER_GAP);

export const CAT_ART = {
  halo: haloOf(CAT, 0, CAT_TOP, P),
  plinth: S(insetPlan(CAT, -2), 0, 3, 4, 0.5),
  body: S(CAT, 3, CAT_TOP - 3, 4, 1),
  /** 每格抽屜的開口 */
  bays: join(Object.values(SLOTS).concat([{ col: 1, row: 0 }]).map(({ col, row }) =>
    faceY(CAT_FRONT, slotX(col), slotX(col) + DRAWER_W, slotZ(row), slotZ(row) + DRAWER_H))),
  /** 中間的直隔板線，從底到頂 */
  mullion: pathOf([at([slotX(1) - 2, CAT_FRONT, 3]), at([slotX(1) - 2, CAT_FRONT, CAT_TOP])]),
  top: S(insetPlan(CAT, 2), CAT_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(CAT, 2), 4).map(([x, y]) => at([x, y, CAT_TOP + 2])),
  /** 右下那格沒有工具：封板 */
  blank: S({ x: slotX(1), y: CAT_FRONT - 2, w: DRAWER_W, d: 2, r: 0.4 }, slotZ(0), DRAWER_H, 2),
  blankScrews: [at([slotX(1) + 4, CAT_FRONT, slotZ(0) + DRAWER_H / 2]), at([slotX(1) + DRAWER_W - 4, CAT_FRONT, slotZ(0) + DRAWER_H / 2])],
};

/** 抽屜：在拉開 0 的位置建好（箱體另外依開口逐幀重建） */
export function drawerArt(tool: ToolId) {
  const { col, row } = SLOTS[tool];
  const x0 = slotX(col) + 1;
  const w = DRAWER_W - 2;
  const z0 = slotZ(row) + 0.8;
  const front: Plan = { x: x0 - 0.5, y: CAT_FRONT, w: w + 1, d: 2.4, r: 0.6 };
  const faceAt = CAT_FRONT + front.d;
  // 說明卡：插在抽屜正面的卡座裡，高度 = 說明的長度
  const h = DESC_H[tool];
  const card: Plan = { x: x0 + 4, y: faceAt, w: 21, d: 0.8, r: 0.2 };
  const cz = z0 + 3;
  const rules = Math.max(0, Math.floor((h - 1.6) / 1.6));
  return {
    front: S(front, z0, DRAWER_H - 1.6, 2, 0.4),
    card: S(card, cz, h, 2),
    cardRules: join(Array.from({ length: rules }, (_, i) => {
      const z = cz + h - 1.4 - i * 1.6;
      return pathOf([at([card.x + 2, faceAt + 0.8, z]), at([card.x + 2 + [15, 11, 17, 9, 13, 7][i % 6], faceAt + 0.8, z])]);
    })),
    holder: faceY(faceAt, card.x - 1, card.x + card.w + 1, cz - 1, cz + 1.2),
    pull: S({ x: x0 + w - 11, y: faceAt, w: 7, d: 2, r: 0.8 }, z0 + 6, 2.2, 2),
    rivets: [at([x0 + 2.5, faceAt, z0 + DRAWER_H - 4]), at([x0 + w - 2.5, faceAt, z0 + DRAWER_H - 4])],
  };
}
export function drawerBox(tool: ToolId, open: number) {
  const { col, row } = SLOTS[tool];
  return S({ x: slotX(col) + 2, y: CAT_FRONT, w: DRAWER_W - 4, d: Math.max(open, 0.01), r: 0.4 }, slotZ(row) + 1.8, DRAWER_H - 5, 2);
}

/** MCP 擴充模組：在 z = 0 建好，往上平移到櫃頂 */
export const MCP_ART = (() => {
  const front = MCP.y + MCP.d;
  const cells: string[] = [];
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    const x0 = MCP.x + 4 + c * 17.5;
    const z0 = 3 + r * 9;
    cells.push(faceY(front, x0, x0 + 15, z0, z0 + 7.5));
  }
  return {
    body: S(MCP, 0, MCP_H, 4, 0.8),
    seam: sideSeam(MCP, MCP_H - 3, P, 4),
    cells: join(cells),
    knobs: Array.from({ length: 10 }, (_, i) => at([MCP.x + 11.5 + (i % 5) * 17.5, front, 6.75 + Math.floor(i / 5) * 9])),
    /** 接頭：模組背面伸出的插座 */
    plug: S({ x: MCP.x + MCP.w / 2 - 8, y: MCP.y - 4, w: 16, d: 4, r: 1 }, 6, 8, 2),
  };
})();

/* ---------- 模型機櫃 ---------- */

export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 6, 1.2),
  seams: join([16, 58].map((z) => sideSeam(CAB, z, P, 6))),
  slot: faceY(CAB.y + CAB.d, CAB.x + 14, CAB.x + 50, 40, 43),
  vents: join([0, 1, 2].map((i) => faceY(CAB.y + CAB.d, CAB.x + 14, CAB.x + 50, 24 + i * 4.5, 25.8 + i * 4.5))),
  rivets: [18.5, 55.5].flatMap((z) => Array.from({ length: 7 }, (_, i) => at([CAB.x + 6 + i * 8.6, CAB.y + CAB.d, z]))),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  capScrews: corners(insetPlan(CAB, 3), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
};

/* ---------- context 卡架 ---------- */

const POSTS: Plane[] = [[CARD.x - 3, CARD.y - 3], [CARD.x + CARD.w + 3, CARD.y - 3], [CARD.x - 3, CARD.y + CARD.d + 3], [CARD.x + CARD.w + 3, CARD.y + CARD.d + 3]];
const post = ([x, y]: Plane) => ({ collar: C(x, y, 2.8, PLINTH_H, 1.6, 16), post: C(x, y, 1.8, PLINTH_H + 1.6, POST_TOP - PLINTH_H - 1.6, 16), cap: C(x, y, 2.4, POST_TOP, 1.2, 16) });
export const TRAY_ART = {
  halo: haloOf(TRAY_PLINTH, 0, 6, P),
  plinth: S(TRAY_PLINTH, 0, PLINTH_H, 4, 0.6),
  plinthScrews: corners(TRAY_PLINTH, 3.5).map(([x, y]) => at([x, y, PLINTH_H])),
  seat: S(insetPlan(CARD, -1.5), PLINTH_H, 1, 3),
  backPosts: POSTS.filter(([, y]) => y < CARD.y).map(post),
  frontPosts: POSTS.filter(([, y]) => y > CARD.y).map(post),
};

/** 一張結果卡：在 z = 0 建好；厚卡畫出紙層 */
export function cardArt(t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(CARD, h, P, 3));
  return { paths: S(CARD, 0, t, 3, t > 1.6 ? 0.3 : 0), layers: join(layers) };
}

/** 「如果讀全文會有這麼大」：從卡座往上的點線外框 */
export function ghostOutline(z: number, t: number) {
  return slabOf(CARD, z, t, P, 3).outline;
}
