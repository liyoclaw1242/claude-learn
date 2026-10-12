import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, ring, sideSeam, slabOf,
  type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  BASE, BASE_H, CAB, CAB_FRONT, CAB_TOP, CAN_R, CAN_Y, DRAWER_AT, DRAWER_H, DRAWER_W, FOOT_H, HEAD_H, INDEX_CARD,
  INDEX_TRAY, P, PLINTH_H, POST, RACK_TOP, REJECT_TRAY, TRAY_H, at, cardPlan,
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
/** 底座前緣的時間軸刻度條：三天各一個主刻度 */
const STRIP: Plan = { x: -150, y: BASE.y + BASE.d - 13, w: 220, d: 6, r: 1 };
function timeline() {
  const minor: string[] = [];
  const major: string[] = [];
  for (let x = STRIP.x + 4; x <= STRIP.x + STRIP.w - 4; x += 4) {
    const big = [-122, -46, 30].some((c) => Math.abs(c - x) < 2);
    (big ? major : minor).push(lineOnTop([x, STRIP.y + 0.8], [x, STRIP.y + 0.8 + (big ? 3.8 : 2)], 0.6, P));
  }
  return { minor: join(minor), major: join(major) };
}
const TL = timeline();
export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P),
  feet: FEET.map(([x, y]) => [C(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), C(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28)]),
  slab: S(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(SCREWS.map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  strip: S(STRIP, 0, 0.6, 3),
  stripMinor: TL.minor,
  stripMajor: TL.major,
  stripScrews: [at([STRIP.x + 2, STRIP.y + 3, 0.6]), at([STRIP.x + STRIP.w - 2, STRIP.y + 3, 0.6])],
};

/* ---------- 卡架 ---------- */

export function rackArt(cx: number) {
  const card = cardPlan(cx);
  const plinth: Plan = { x: cx - POST[0] - 6, y: -POST[1] - 6, w: 2 * POST[0] + 12, d: 2 * POST[1] + 12, r: 3 };
  const head: Plan = { x: cx - POST[0] - 5, y: -POST[1] - 5, w: 2 * POST[0] + 10, d: 2 * POST[1] + 10, r: 3 };
  const at4: [number, number][] = [[-POST[0], -POST[1]], [POST[0], -POST[1]], [-POST[0], POST[1]], [POST[0], POST[1]]];
  const post = ([dx, dy]: [number, number]) => ({
    collar: C(cx + dx, dy, 3, PLINTH_H, 2, 16),
    post: C(cx + dx, dy, 1.9, PLINTH_H + 2, RACK_TOP - PLINTH_H - 2, 16),
  });
  return {
    halo: haloOf(plinth, 0, 6, P),
    plinth: S(plinth, 0, PLINTH_H, 4, 0.6),
    plinthScrews: corners(plinth, 3.5).map(([x, y]) => at([x, y, PLINTH_H])),
    tray: S(insetPlan(card, -1.5), PLINTH_H, TRAY_H, 3),
    backPosts: at4.filter(([, y]) => y < 0).map(post),
    frontPosts: at4.filter(([, y]) => y > 0).map(post),
    head: S(head, RACK_TOP, HEAD_H, 4, 0.8),
    headSeam: sideSeam(head, RACK_TOP + 2.2, P, 4),
    headScrews: corners(head, 4).map(([x, y]) => at([x, y, RACK_TOP + HEAD_H])),
    knob: C(cx, 0, 3.6, RACK_TOP + HEAD_H, 3.5, 24),
    knobKnurl: knurl(cx, 0, 3.6, RACK_TOP + HEAD_H, RACK_TOP + HEAD_H + 3.5, 24, P),
  };
}

/** 一張卡：在 z = 0 建好，靠平移放到位置 */
export function cardArt(cx: number, t: number) {
  const plan = cardPlan(cx);
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(plan, h, P, 3));
  return { paths: S(plan, 0, t, 3, t > 1.6 ? 0.3 : 0), layers: join(layers) };
}

/* ---------- 片盒托架（transcript） ---------- */

export function canArt(cx: number) {
  const cradle: Plan = { x: cx - 14, y: CAN_Y - 12, w: 28, d: 24, r: 2 };
  return {
    cradle: S(cradle, 0, 2, 4, 0.5),
    cradleRing: ring(cx, CAN_Y, CAN_R + 1.5, 2, P, 40),
    cradleScrews: corners(cradle, 2.6).map(([x, y]) => at([x, y, 2])),
    /** 片盒（在 z = 0 建好）：盒身、盒蓋邊、中心軸、三個齒孔 */
    can: C(cx, CAN_Y, CAN_R, 0, 3.6, 48, 0.5),
    lid: C(cx, CAN_Y, CAN_R - 0.6, 3.6, 0.8, 48),
    hub: ring(cx, CAN_Y, 2.2, 4.4, P, 20),
    hubDot: [at([cx, CAN_Y, 4.4])],
    sprockets: [0, 1, 2].map((i) => {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      return at([cx + Math.cos(a) * 5.5, CAN_Y + Math.sin(a) * 5.5, 4.4]);
    }),
  };
}

/* ---------- 記憶檔案櫃 ---------- */

export const CAB_ART = {
  halo: haloOf(CAB, 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 4, 1),
  bays: join(Object.values(DRAWER_AT).map(([x0, z0]) => faceY(CAB_FRONT, x0, x0 + DRAWER_W, z0, z0 + DRAWER_H))),
  rivets: [CAB.x + 4, CAB.x + CAB.w - 4].flatMap((x) => [12, 34].map((z) => at([x, CAB_FRONT, z]))),
  top: S(insetPlan(CAB, 1.5), CAB_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(CAB, 1.5), 3.5).map(([x, y]) => at([x, y, CAB_TOP + 2])),
  /** 頂上的索引托盤：底板 + 三面矮牆 */
  trayFloor: S(INDEX_TRAY, CAB_TOP + 2, 1, 3),
  trayBack: S({ x: INDEX_TRAY.x, y: INDEX_TRAY.y, w: INDEX_TRAY.w, d: 1.6, r: 0.5 }, CAB_TOP + 3, 3, 2),
  trayLeft: S({ x: INDEX_TRAY.x, y: INDEX_TRAY.y, w: 1.6, d: INDEX_TRAY.d, r: 0.5 }, CAB_TOP + 3, 3, 2),
  trayRight: S({ x: INDEX_TRAY.x + INDEX_TRAY.w - 1.6, y: INDEX_TRAY.y, w: 1.6, d: INDEX_TRAY.d, r: 0.5 }, CAB_TOP + 3, 3, 2),
  /** 索引卡（在 z = 0 建好）：每一行代表一則記憶 */
  indexCard: S(INDEX_CARD, 0, 1.2, 3, 0.3),
};
export function indexRules(lines: number) {
  return join(Array.from({ length: lines }, (_, i) =>
    lineOnTop([INDEX_CARD.x + 5, INDEX_CARD.y + 6 + i * 4.5], [INDEX_CARD.x + [30, 24, 28, 20, 26][i % 5], INDEX_CARD.y + 6 + i * 4.5], 1.2, P)));
}

/** 抽屜：拉出 open 單位；箱體只畫露在櫃外的部分 */
export function drawerArt(id: keyof typeof DRAWER_AT, open: number) {
  const [bx, bz] = DRAWER_AT[id];
  const x0 = bx + 1;
  const w = DRAWER_W - 2;
  const z0 = bz + 0.8;
  const front: Plan = { x: x0 - 0.5, y: CAB_FRONT, w: w + 1, d: 2.2, r: 0.5 };
  const hy = CAB_FRONT + 2.2;
  const hz = z0 + DRAWER_H - 7;
  return {
    box: S({ x: x0, y: CAB_FRONT, w, d: Math.max(open, 0.01), r: 0.4 }, z0 + 1, DRAWER_H - 4, 2),
    /** 以下在 open = 0 建好，靠平移拉出 */
    front: S(front, z0, DRAWER_H - 1.6, 2, 0.4),
    pull: S({ x: x0 + w / 2 - 5, y: hy, w: 10, d: 2, r: 0.8 }, z0 + 3, 2, 2),
    holder: faceY(hy, x0 + w / 2 - 6, x0 + w / 2 + 6, hz, hz + 4),
    rivets: [at([x0 + w / 2 - 7.5, hy, hz + 2]), at([x0 + w / 2 + 7.5, hy, hz + 2])],
  };
}

/* 退件盤：判斷「不該記」的卡放這裡 */
const wall = (plan: Plan) => S(plan, 1.5, 4, 2, 0.3);
export const REJECT_ART = {
  halo: haloOf(REJECT_TRAY, 0, 5, P),
  floor: S(REJECT_TRAY, 0, 1.5, 4, 0.4),
  back: wall({ x: REJECT_TRAY.x, y: REJECT_TRAY.y, w: REJECT_TRAY.w, d: 1.6, r: 0.5 }),
  left: wall({ x: REJECT_TRAY.x, y: REJECT_TRAY.y, w: 1.6, d: REJECT_TRAY.d, r: 0.5 }),
  right: wall({ x: REJECT_TRAY.x + REJECT_TRAY.w - 1.6, y: REJECT_TRAY.y, w: 1.6, d: REJECT_TRAY.d, r: 0.5 }),
  front: wall({ x: REJECT_TRAY.x, y: REJECT_TRAY.y + REJECT_TRAY.d - 1.6, w: REJECT_TRAY.w, d: 1.6, r: 0.5 }),
  /** 退件卡（在 z = 0 建好） */
  card: S({ x: REJECT_TRAY.x + 6, y: REJECT_TRAY.y + 5, w: 32, d: 18, r: 1 }, 0, 1, 2),
  cardRule: join([0, 1, 2].map((i) => lineOnTop([REJECT_TRAY.x + 10, REJECT_TRAY.y + 9 + i * 4], [REJECT_TRAY.x + [30, 24, 28][i], REJECT_TRAY.y + 9 + i * 4], 1, P))),
};

