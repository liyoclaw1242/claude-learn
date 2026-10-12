import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, radialTicks, ring,
  sideArc, sideSeam, slabOf, type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  BASE, BASE_H, BIN, BIN_H, CAB_FRONT, CAB_TOP, CABINET, CARD_Z, DIAL, DRAWER_COUNT, DRAWER_H, DRAWER_Z0, FOOT_H, FULL,
  HEAD_H, MAIN, P, PLINTH_H, RACK_TOP, SUB, THRESHOLD, TRAY_H, UNIT, at, type Rack,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 24, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: 60, y: 38, w: 62, d: 13, r: 2 };

export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P),
  feet: FEET.map(([x, y]) => [C(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), C(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28)]),
  slab: S(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(SCREWS.map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
  label: S(LABEL, 0, 0.8, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P),
  labelRule: join([0, 1, 2].map((row) => lineOnTop([LABEL.x + 8, LABEL.y + 3.6 + row * 2.2], [LABEL.x + [46, 30, 40][row], LABEL.y + 3.6 + row * 2.2], 0.8, P))),
  labelScrews: [at([LABEL.x + 3.5, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.5, LABEL.y + LABEL.d / 2, 0.8])],
};

/* ---------- 卡架 ---------- */

function postsOf(rack: Rack) {
  const [px, py] = rack.post;
  const at4: [number, number][] = [[-px, -py], [px, -py], [-px, py], [px, py]];
  const post = ([dx, dy]: [number, number]) => ({
    collar: C(rack.cx + dx, dy, 3, PLINTH_H, 2, 16),
    post: C(rack.cx + dx, dy, 2, PLINTH_H + 2, RACK_TOP - PLINTH_H - 2, 16),
  });
  return { back: at4.filter(([, y]) => y < 0).map(post), front: at4.filter(([, y]) => y > 0).map(post) };
}

function rackArt(rack: Rack) {
  const posts = postsOf(rack);
  const head = rack.crosshead;
  const throat: Plan = insetPlan(rack.card, 4);
  return {
    halo: haloOf(rack.plinth, 0, 6, P),
    plinth: S(rack.plinth, 0, PLINTH_H, 4, 0.6),
    plinthScrews: corners(rack.plinth, 3.5).map(([x, y]) => at([x, y, PLINTH_H])),
    tray: S(insetPlan(rack.card, -1.5), PLINTH_H, TRAY_H, 3),
    backPosts: posts.back,
    frontPosts: posts.front,
    throat: S(throat, RACK_TOP - 2.5, 2.5, 3),
    throatSlot: planOutline(insetPlan(throat, 3), RACK_TOP - 2.5, P),
    head: S(head, RACK_TOP, HEAD_H, 4, 0.8),
    headSeam: sideSeam(head, RACK_TOP + 2.5, P, 4),
    headScrews: corners(head, 4).map(([x, y]) => at([x, y, RACK_TOP + HEAD_H])),
    knob: C(rack.cx, 0, 4, RACK_TOP + HEAD_H, 4, 28),
    knobKnurl: knurl(rack.cx, 0, 4, RACK_TOP + HEAD_H, RACK_TOP + HEAD_H + 4, 28, P),
  };
}

export const MAIN_ART = rackArt(MAIN);
export const SUB_ART = rackArt(SUB);

/* 主卡架左前方的刻度尺（0–100%），紅色那格是自動壓縮門檻 */
const RULER: Plan = { x: MAIN.card.x - 13, y: 12, w: 5, d: 3, r: 0.8 };
const RULER_FACE = RULER.y + RULER.d;
function rulerTicks() {
  const minor: string[] = [];
  const major: string[] = [];
  for (let p = 0; p <= 100; p += 5) {
    const big = p % 25 === 0;
    const z = CARD_Z + p * UNIT;
    (big ? major : minor).push(pathOf([at([RULER.x, RULER_FACE, z]), at([RULER.x + (big ? 3.4 : 1.8), RULER_FACE, z])]));
  }
  return { minor: join(minor), major: join(major) };
}
const RULE = rulerTicks();
const THRESHOLD_Z = CARD_Z + THRESHOLD * UNIT;
const [, PY] = MAIN.post;
export const RULER_ART = {
  foot: S(insetPlan(RULER, -2), PLINTH_H - 2, 2, 3),
  ruler: S(RULER, PLINTH_H, FULL + 3, 3, 0.4),
  minor: RULE.minor,
  major: RULE.major,
  threshold: pathOf([at([RULER.x, RULER_FACE, THRESHOLD_Z]), at([RULER.x + RULER.w, RULER_FACE, THRESHOLD_Z])]),
  /** 門檻線：一條拉在兩根前立柱之間的細線，兩端落在立柱表面 */
  wire: pathOf([at([MAIN.cx - MAIN.post[0] + 2, PY, THRESHOLD_Z]), at([MAIN.cx + MAIN.post[0] - 2, PY, THRESHOLD_Z])]),
  wireEnds: [at([MAIN.cx - MAIN.post[0] + 2, PY, THRESHOLD_Z]), at([MAIN.cx + MAIN.post[0] - 2, PY, THRESHOLD_Z])],
};

/** 一張卡（訊息）：z 是底面、t 是厚度；厚卡畫出紙層 */
export function cardArt(card: Plan, z: number, t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(card, z + h, P, 3));
  return { paths: S(card, z, t, 3, t > 1.6 ? 0.3 : 0), layers: join(layers) };
}

/* ---------- 廢卡箱 ---------- */

const wall = (plan: Plan) => S(plan, 2, BIN_H - 2, 2, 0.3);
export const BIN_ART = {
  halo: haloOf(BIN, 0, BIN_H, P),
  floor: S(BIN, 0, 2, 4, 0.4),
  back: wall({ x: BIN.x, y: BIN.y, w: BIN.w, d: 2, r: 0.6 }),
  left: wall({ x: BIN.x, y: BIN.y, w: 2, d: BIN.d, r: 0.6 }),
  right: wall({ x: BIN.x + BIN.w - 2, y: BIN.y, w: 2, d: BIN.d, r: 0.6 }),
  front: wall({ x: BIN.x, y: BIN.y + BIN.d - 2, w: BIN.w, d: 2, r: 0.6 }),
  frontScrews: [at([BIN.x + 4, BIN.y + BIN.d, BIN_H - 2]), at([BIN.x + BIN.w - 4, BIN.y + BIN.d, BIN_H - 2])],
  /** 箱裡的廢卡堆：幾張錯開的薄卡 */
  pile: [0, 1, 2, 3, 4].map((i) => S({ x: BIN.x + 5 + (i % 2) * 6, y: BIN.y + 6 + ((i * 3) % 5) * 2, w: 24, d: 20, r: 1 }, 2 + i * 1.3, 1.2, 2)),
};

/* ---------- 檔案櫃（磁碟） ---------- */

const DRAWER_W = CABINET.w - 8;
export const drawerZ = (i: number) => DRAWER_Z0 + i * (DRAWER_H + 1.5);
export const CABINET_ART = {
  halo: haloOf(CABINET, 0, CAB_TOP, P),
  plinth: S(insetPlan(CABINET, -2), 0, 3, 4, 0.5),
  body: S(CABINET, 3, CAB_TOP - 3, 4, 1),
  /** 每格抽屜的開口（封閉輪廓） */
  bays: join(Array.from({ length: DRAWER_COUNT }, (_, i) => {
    const z0 = drawerZ(i);
    const x0 = CABINET.x + 4;
    return pathOf([at([x0, CAB_FRONT, z0]), at([x0 + DRAWER_W, CAB_FRONT, z0]), at([x0 + DRAWER_W, CAB_FRONT, z0 + DRAWER_H]), at([x0, CAB_FRONT, z0 + DRAWER_H])], true);
  })),
  top: S(insetPlan(CABINET, 2), CAB_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(CABINET, 2), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
};

/** 抽屜：拉出 open 單位；箱體只畫露在櫃外的部分 */
export function drawerArt(i: number, open: number) {
  const z0 = drawerZ(i) + 0.8;
  const x0 = CABINET.x + 5;
  const w = DRAWER_W - 2;
  const front: Plan = { x: x0 - 0.5, y: CAB_FRONT + open, w: w + 1, d: 2.4, r: 0.6 };
  const holder: Plan = { x: x0 + w / 2 - 7, y: front.y + front.d, w: 14, d: 0, r: 0 };
  const hz = z0 + DRAWER_H - 7;
  return {
    box: S({ x: x0, y: CAB_FRONT, w, d: Math.max(open, 0.01), r: 0.4 }, z0 + 1, DRAWER_H - 4, 2),
    front: S(front, z0, DRAWER_H - 1.6, 2, 0.4),
    pull: S({ x: x0 + w / 2 - 6, y: front.y + front.d, w: 12, d: 2, r: 0.8 }, z0 + 3, 2.2, 2),
    holder: pathOf([at([holder.x, holder.y, hz]), at([holder.x + 14, holder.y, hz]), at([holder.x + 14, holder.y, hz + 4]), at([holder.x, holder.y, hz + 4])], true),
    rivets: [at([holder.x - 1.5, holder.y, hz + 2]), at([holder.x + 15.5, holder.y, hz + 2])],
  };
}

/* ---------- 用量錶 ---------- */

const DIAL_TOP = DIAL.z + DIAL.h;
const TICKS = radialTicks(DIAL.x, DIAL.y, DIAL.r - 3, 20, 5, DIAL_TOP, [1.3, 2.8], P, -0.75 * Math.PI, 1.5 * Math.PI);
const angleOf = (share: number) => -0.75 * Math.PI + Math.max(0, Math.min(1, share)) * 1.5 * Math.PI;
const tickAt = (share: number, len: number) => {
  const a = angleOf(share);
  const r = DIAL.r - 3;
  return lineOnTop([DIAL.x + Math.sin(a) * (r - len), DIAL.y - Math.cos(a) * (r - len)], [DIAL.x + Math.sin(a) * r, DIAL.y - Math.cos(a) * r], DIAL_TOP, P);
};
export const DIAL_ART = {
  stand: C(DIAL.x, DIAL.y, DIAL.r + 3, 0, 2, 48),
  standScrews: [0, 1, 2].map((i) => {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    return at([DIAL.x + Math.cos(a) * (DIAL.r + 1.5), DIAL.y + Math.sin(a) * (DIAL.r + 1.5), 2]);
  }),
  post: C(DIAL.x, DIAL.y, 4, 2, DIAL.z - 2, 20),
  puck: C(DIAL.x, DIAL.y, DIAL.r, DIAL.z, DIAL.h, 64, 0.8),
  knurl: knurl(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 2.6, DIAL_TOP, 80, P, 0.3),
  band: sideArc(DIAL.x, DIAL.y, DIAL.r, DIAL_TOP - 2.6, P, 40),
  bezel: ring(DIAL.x, DIAL.y, DIAL.r - 2, DIAL_TOP, P, 64),
  minor: TICKS.minor,
  major: TICKS.major,
  threshold: tickAt(THRESHOLD / 100, 3.6),
  hub: ring(DIAL.x, DIAL.y, 1.4, DIAL_TOP, P, 16),
};
export function needleAt(share: number) {
  const a = angleOf(share);
  const r = DIAL.r - 4;
  return lineOnTop([DIAL.x - Math.sin(a) * 3, DIAL.y + Math.cos(a) * 3], [DIAL.x + Math.sin(a) * r, DIAL.y - Math.cos(a) * r], DIAL_TOP + 0.2, P);
}

