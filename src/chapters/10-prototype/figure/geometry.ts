import {
  corners, cylinder, depthOf, dotGrid, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, ring, sideSeam,
  slabOf, type Plan, type Plane, type SolidPaths,
} from "../../../iso/iso-kit";
import type { FloorId } from "../steps";
import {
  BASE, BASE_H, CAB, CAB_TOP, CARD, CARD_T, DESK, DESK_H, FILES, FILES_H, FOOT_H, LIFT_X, MAST_TOP, P, RAIL, RAIL_H,
  RAIL_Y, SLED, SLED_H, SUB, SUB_TOP, TOWER, TOWER_FRONT, TOWER_TOP, TRAY_H, TRAY_Z, TRAY_Z0, WALL, at,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 20, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
/** y = 定值的垂直面上一個封閉矩形 */
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

export type Part = { paths: SolidPaths; tone: "hi" | "mid" | "lo"; crease?: "none" };

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 22));
const SCREWS = corners(BASE, 9);
export const BASE_ART = {
  halo: haloOf(BASE, -BASE_H - FOOT_H, BASE_H + FOOT_H, P),
  feet: FEET.map(([x, y]) => [C(x, y, 7, -BASE_H - FOOT_H, 1.6, 28), C(x, y, 5.4, -BASE_H - FOOT_H + 1.6, FOOT_H - 1.6, 28)]),
  slab: S(BASE, -BASE_H, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(SCREWS.map(([x, y]) => ring(x, y, 2.2, 0, P, 16))),
  screws: SCREWS.map(([x, y]) => at([x, y, 0])),
};

/* ---------- 導演的終端台 ---------- */

const KEYS: Plan = { x: DESK.x + 6, y: DESK.y + DESK.d - 15, w: DESK.w - 12, d: 10, r: 1 };
const SCREEN: Plan = { x: DESK.x + 7, y: DESK.y + 6, w: DESK.w - 14, d: 4, r: 1 };
const SCREEN_FACE = SCREEN.y + SCREEN.d;
export const DESK_ART = {
  halo: haloOf(DESK, 0, DESK_H, P),
  body: S(DESK, 0, DESK_H, 4, 0.8),
  seam: sideSeam(DESK, 6, P, 4),
  keys: S(KEYS, DESK_H, 1.6, 2, 0.3),
  keyDots: dotGrid(KEYS.x + 2.5, KEYS.y + 2.2, 9, 3, 2.6, DESK_H + 1.6, P),
  stand: S({ x: SCREEN.x + SCREEN.w / 2 - 3, y: SCREEN.y + 1, w: 6, d: 2, r: 0.5 }, DESK_H, 4, 2),
  screen: S(SCREEN, DESK_H + 4, 16, 3, 0.5),
  glass: faceY(SCREEN_FACE, SCREEN.x + 2, SCREEN.x + SCREEN.w - 2, DESK_H + 6, DESK_H + 18),
  prompt: join([0, 1, 2].map((i) => pathOf([at([SCREEN.x + 4, SCREEN_FACE, DESK_H + 16 - i * 3]), at([SCREEN.x + [16, 10, 13][i], SCREEN_FACE, DESK_H + 16 - i * 3])]))),
};

/* ---------- series/ 檔案櫃 ---------- */

const FILES_FRONT = FILES.y + FILES.d;
const DRAWER_H = (FILES_H - 6) / 3;
export const FILES_ART = {
  halo: haloOf(FILES, 0, FILES_H, P),
  body: S(FILES, 0, FILES_H, 4, 0.8),
  drawers: [0, 1, 2].map((i) => {
    const z0 = 3 + i * DRAWER_H;
    return {
      front: S({ x: FILES.x + 3, y: FILES_FRONT, w: FILES.w - 6, d: 1.6, r: 0.5 }, z0 + 0.6, DRAWER_H - 1.2, 2, 0.3),
      pull: S({ x: FILES.x + FILES.w / 2 - 5, y: FILES_FRONT + 1.6, w: 10, d: 1.6, r: 0.6 }, z0 + 3, 1.8, 2),
      holder: faceY(FILES_FRONT + 1.6, FILES.x + FILES.w / 2 - 6, FILES.x + FILES.w / 2 + 6, z0 + DRAWER_H - 6, z0 + DRAWER_H - 3),
    };
  }),
  top: S(insetPlan(FILES, -1), FILES_H, 2, 4, 0.5),
  topScrews: corners(FILES, 3.5).map(([x, y]) => at([x, y, FILES_H + 2])),
};

/* ---------- 抽屜塔 ---------- */

const PLINTH = insetPlan(TOWER, -3);
const RIGHT_X = TOWER.x + TOWER.w;
export const TOWER_ART = {
  halo: haloOf(PLINTH, 0, TOWER_TOP, P),
  plinth: S(PLINTH, 0, TRAY_Z0 - 1, 4, 0.8),
  plinthScrews: corners(PLINTH, 3.5).map(([x, y]) => at([x, y, TRAY_Z0 - 1])),
  back: S({ x: TOWER.x, y: TOWER.y, w: TOWER.w, d: WALL, r: 0.8 }, TRAY_Z0 - 1, TOWER_TOP - TRAY_Z0 + 1, 2),
  left: S({ x: TOWER.x, y: TOWER.y, w: WALL, d: TOWER.d, r: 0.8 }, TRAY_Z0 - 1, TOWER_TOP - TRAY_Z0 + 1, 2, 0.3),
  right: S({ x: RIGHT_X - WALL, y: TOWER.y, w: WALL, d: TOWER.d, r: 0.8 }, TRAY_Z0 - 1, TOWER_TOP - TRAY_Z0 + 1, 2, 0.3),
  /** 右側板上每層的分隔線：從後緣拉到前緣 */
  rightLines: join(Object.values(TRAY_Z).slice(1).map((z) => pathOf([at([RIGHT_X, TOWER.y + 0.8, z - 0.6]), at([RIGHT_X, TOWER_FRONT - 0.8, z - 0.6])]))),
  rightScrews: Object.values(TRAY_Z).map((z) => at([RIGHT_X, TOWER_FRONT - 4, z + 2])),
  cap: S(insetPlan(TOWER, -1.5), TOWER_TOP, 3, 4, 0.8),
  capScrews: corners(insetPlan(TOWER, -1.5), 4).map(([x, y]) => at([x, y, TOWER_TOP + 3])),
  knob: C(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, 5, TOWER_TOP + 3, 4, 28),
  knobKnurl: knurl(TOWER.x + TOWER.w / 2, TOWER.y + TOWER.d / 2, 5, TOWER_TOP + 3, TOWER_TOP + 7, 32, P),
};

/* 托盤：在關上的位置建好，拉開時沿 +y 平移 */
const X0 = TOWER.x + WALL + 0.4;
const X1 = RIGHT_X - WALL - 0.4;
const YB = TOWER.y + WALL + 0.4;
const XC = (X0 + X1) / 2;
const YC = TOWER_FRONT - 13;

function miniOf(id: FloorId, z0: number, room: number): Part[] {
  const hmax = Math.max(2.5, Math.min(room, 11));
  switch (id) {
    case "f01": // 迷你版第 01 章：導軌、滑台、卡疊
      return [
        { paths: S({ x: XC - 28, y: YC - 2, w: 56, d: 4, r: 0.8 }, z0, 1.2), tone: "lo" },
        { paths: S({ x: XC - 2, y: YC - 7, w: 14, d: 14, r: 1 }, z0 + 1.2, 2.2, 2), tone: "mid" },
        ...[0, 1, 2, 3].map((i): Part => ({ paths: S({ x: XC, y: YC - 5, w: 10, d: 10, r: 0.6 }, z0 + 3.4 + i * 1.2, 1.2, 2), tone: i === 3 ? "hi" : "mid" })),
        { paths: S({ x: XC - 26, y: YC - 8, w: 14, d: 16, r: 1 }, z0 + 1.2, hmax, 3, 0.3), tone: "hi" },
      ];
    case "f02": // 卡架：四根立柱、卡疊、紅線以下
      return [
        { paths: S({ x: XC - 10, y: YC - 7, w: 20, d: 14, r: 1 }, z0, 1, 2), tone: "lo" },
        ...[0, 1, 2].map((i): Part => ({ paths: S({ x: XC - 7, y: YC - 5, w: 14, d: 10, r: 0.6 }, z0 + 1 + i * 2, 2, 2), tone: "mid" })),
        ...byDepth([[XC - 9, YC - 6], [XC + 9, YC - 6], [XC - 9, YC + 6], [XC + 9, YC + 6]]).map(([x, y]): Part => ({ paths: C(x, y, 0.9, z0 + 1, hmax - 1, 12), tone: "mid", crease: "none" })),
      ];
    case "f03": // 組裝夾具：導桿、分隔板與卡
      return [
        ...[XC - 12, XC + 12].map((x): Part => ({ paths: C(x, YC - 7, 1, z0, hmax, 12), tone: "mid", crease: "none" })),
        ...[0, 1, 2, 3, 4].map((i): Part => (i % 2 === 0
          ? { paths: S({ x: XC - 12, y: YC - 6, w: 24, d: 13, r: 0.6 }, z0 + i * 1.5, 0.6, 2), tone: "hi" }
          : { paths: S({ x: XC - 10, y: YC - 5, w: 20, d: 11, r: 0.6 }, z0 + i * 1.5 - 0.9, 1.5, 2), tone: "mid" })),
      ];
    case "f04": // 工具櫃：一座小抽屜櫃
      return [{ paths: S({ x: XC - 18, y: YC - 8, w: 36, d: 14, r: 1 }, z0, hmax, 3, 0.4), tone: "mid" }];
    case "f05": // 分揀線：軌道與三片閘板
      return [
        { paths: S({ x: XC - 28, y: YC - 2, w: 56, d: 4, r: 0.8 }, z0, 1.2), tone: "lo" },
        ...[0, 1, 2].map((i): Part => ({ paths: S({ x: XC - 14 + i * 12, y: YC - 7, w: 2, d: 14, r: 0.4 }, z0 + 1.2, Math.min(hmax, 9), 2), tone: i === 0 ? "hi" : "mid" })),
      ];
    case "f06": // 子代理：隔板兩側的兩疊小卡
      return [
        { paths: S({ x: XC - 1, y: YC - 8, w: 2, d: 16, r: 0.4 }, z0, hmax, 2), tone: "mid" },
        ...[XC - 16, XC + 6].flatMap((x) => [0, 1].map((i): Part => ({ paths: S({ x, y: YC - 5, w: 10, d: 10, r: 0.6 }, z0 + i * 1.6, 1.6, 2), tone: "mid" }))),
      ];
    case "f08": // 長期記憶：一個卡片盒，裡面立著幾張筆記卡
      return [
        { paths: S({ x: XC - 14, y: YC - 7, w: 28, d: 14, r: 1 }, z0, 2.5, 2), tone: "lo" },
        ...[0, 1, 2, 3].map((i): Part => ({ paths: S({ x: XC - 10 + i * 6, y: YC - 5, w: 1, d: 10, r: 0.3 }, z0 + 2.5, Math.min(hmax - 2.5, 6), 2), tone: i === 3 ? "hi" : "mid" })),
      ];
    default:
      return [];
  }
}

export function trayArt(id: FloorId) {
  const z = TRAY_Z[id];
  const h = TRAY_H[id];
  const wallH = Math.min(4, h - 2);
  const floor: Plan = { x: X0, y: YB, w: X1 - X0, d: TOWER_FRONT - YB, r: 0.6 };
  const front: Plan = { x: X0 - 0.4, y: TOWER_FRONT, w: X1 - X0 + 0.8, d: 2.4, r: 0.6 };
  // 托盤正面只是一道矮唇：拉出來時看得到裡面的迷你機構
  const lip = Math.min(h - 0.6, 6.5);
  const handleZ = z + lip / 2 - 0.6;
  const ghost = id === "f07";
  return {
    floor: S(floor, z, 1.2, 2),
    back: S({ x: X0, y: YB, w: X1 - X0, d: 1.6, r: 0.4 }, z + 1.2, wallH, 2),
    left: S({ x: X0, y: YB, w: 1.6, d: floor.d, r: 0.4 }, z + 1.2, wallH, 2),
    right: S({ x: X1 - 1.6, y: YB, w: 1.6, d: floor.d, r: 0.4 }, z + 1.2, wallH, 2),
    contents: ghost ? [] : miniOf(id, z + 1.2, h - 2.5),
    front: S(front, z + 0.3, lip, 2, 0.4),
    /** 虛線層（07）：只畫一圈虛線框，表示還沒實作 */
    ghostLine: ghost ? faceY(front.y + front.d, X0 + 3, X1 - 3, z + 1.6, z + lip - 1) : "",
    handle: S({ x: XC - 9, y: front.y + front.d, w: 18, d: 1.8, r: 0.8 }, handleZ, 2, 2),
    holder: faceY(front.y + front.d, X0 + 5, X0 + 19, handleZ - 0.6, handleZ + 2.6),
    rivets: [at([X0 + 3.6, front.y + front.d, handleZ + 1]), at([X0 + 20.4, front.y + front.d, handleZ + 1])],
    /** 托盤兩側的導軌條：讓高托盤看起來是裝在塔裡的層架 */
    runners: [X0 - 0.2, X1 - 1.4].map((x) => S({ x, y: YB, w: 1.6, d: TOWER_FRONT - YB, r: 0.3 }, z + h - 1.2, 1.2, 2)),
  };
}

/* ---------- 升降梯（塔的右前方） ---------- */

const MAST: Plan = { x: LIFT_X - 4, y: RAIL_Y - 14, w: 8, d: 6, r: 1 };
export const LIFT_ART = {
  foot: S(insetPlan(MAST, -4), 0, 2, 3, 0.4),
  footScrews: corners(insetPlan(MAST, -4), 2.5).map(([x, y]) => at([x, y, 2])),
  mast: S(MAST, 2, MAST_TOP - 2, 2, 0.4),
  /** 桅杆正面的刻度：每層一格，從邊緣長出 */
  ticks: join(Object.values(TRAY_Z).map((z) => pathOf([at([MAST.x, MAST.y + MAST.d, z]), at([MAST.x + 3, MAST.y + MAST.d, z])]))),
  head: C(LIFT_X, MAST.y + MAST.d / 2, 5, MAST_TOP, 4, 24),
  headKnurl: knurl(LIFT_X, MAST.y + MAST.d / 2, 5, MAST_TOP, MAST_TOP + 4, 28, P),
  /** 升降叉：在 z = 0 建好，往上平移 */
  car: {
    bracket: S({ x: LIFT_X - 6, y: MAST.y + MAST.d, w: 12, d: 3, r: 0.6 }, 0, 6, 2, 0.3),
    tines: [-5, 3].map((dy) => S({ x: LIFT_X - 8, y: RAIL_Y + dy, w: 16, d: 2.5, r: 0.5 }, 0, 1.6, 2)),
    bar: S({ x: LIFT_X - 8, y: MAST.y + MAST.d + 3, w: 16, d: RAIL_Y + 5.5 - (MAST.y + MAST.d + 3), r: 0.5 }, 0, 1.2, 2),
  },
};

/* ---------- 導軌、滑台、卡 ---------- */

export const RAIL_ART = {
  rail: S(RAIL, 0, RAIL_H, 3, 0.5),
  ticks: join(Array.from({ length: 34 }, (_, i) => {
    const x = RAIL.x + 6 + i * 10;
    return pathOf([at([x, RAIL.y + RAIL.d, RAIL_H]), at([x, RAIL.y + RAIL.d, RAIL_H - (i % 5 === 0 ? 2.2 : 1.2)])]);
  })),
  stops: [RAIL.x, RAIL.x + RAIL.w - 5].map((x) => S({ x, y: RAIL.y - 2, w: 5, d: RAIL.d + 4, r: 1 }, 0, 7, 2, 0.4)),
};
export const SLED_ART = {
  plate: S(SLED, RAIL_H, SLED_H, 3, 0.4),
  rivets: [0, 1, 2, 3].map((i) => at([SLED.x + 4 + i * 4, SLED.y + SLED.d, RAIL_H + 1.5])),
};
export const CARD_ART = {
  card: S(CARD, 0, CARD_T, 2, 0.3),
  rule: join([0, 1, 2].map((i) => lineOnTop([CARD.x + 3, CARD.y + 3 + i * 3], [CARD.x + [11, 8, 10][i], CARD.y + 3 + i * 3], CARD_T, P))),
};

/* ---------- 模型機櫃與子代理小卡架 ---------- */

const CAB_FRONT = CAB.y + CAB.d;
export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 6, 1.2),
  seams: join([14, 48].map((z) => sideSeam(CAB, z, P, 6))),
  slot: faceY(CAB_FRONT, CAB.x + 10, CAB.x + CAB.w - 10, 24, 27),
  rivets: [16.5, 45.5].flatMap((z) => Array.from({ length: 5 }, (_, i) => at([CAB.x + 7 + i * 8, CAB_FRONT, z]))),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  capScrews: corners(insetPlan(CAB, 3), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
  lampBase: C(CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 4.4, CAB_TOP + 2, 2, 24),
  lamp: C(CAB.x + CAB.w / 2, CAB.y + CAB.d / 2, 3, CAB_TOP + 4, 3, 24, 0.4),
};

const SUB_POSTS: Plane[] = byDepth([[SUB.x + 3, SUB.y + 3], [SUB.x + SUB.w - 3, SUB.y + 3], [SUB.x + 3, SUB.y + SUB.d - 3], [SUB.x + SUB.w - 3, SUB.y + SUB.d - 3]]);
export const SUB_ART = {
  halo: haloOf(SUB, 0, SUB_TOP, P),
  plinth: S(insetPlan(SUB, -2), 0, 3, 3, 0.4),
  backPosts: SUB_POSTS.filter(([, y]) => y < SUB.y + SUB.d / 2).map(([x, y]) => C(x, y, 1.4, 3, SUB_TOP - 3, 14)),
  cards: [0, 1, 2].map((i) => S(insetPlan(SUB, 5), 3 + i * 3, 3, 2, 0.3)),
  frontPosts: SUB_POSTS.filter(([, y]) => y > SUB.y + SUB.d / 2).map(([x, y]) => C(x, y, 1.4, 3, SUB_TOP - 3, 14)),
  head: S(insetPlan(SUB, -1), SUB_TOP, 4, 3, 0.5),
  headScrews: corners(insetPlan(SUB, -1), 3).map(([x, y]) => at([x, y, SUB_TOP + 4])),
};
