import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, ring, sideRing, sideSeam,
  slabOf, type Plan, type Plane,
} from "../../../iso/iso-kit";
import {
  BASE, BASE_H, CAB, CAB_TOP, CARD, CASSETTE_D, CASSETTE_H, CASSETTE_W, CONSOLE, CONSOLE_H, CRATE, CRATE_H, DEVICE,
  DEVICE_Y, DIVIDER, DRAWER_UP, FOOT_H, P, PANEL, PANEL_FACE, PANEL_H, PLINTH, PLINTH_H, POST_TOP, POSTS, RACK_CX,
  RACK_FRONT, RACK_W, RACK_X, RACK_Y, RACK_Z, SOCKET_X, SOCKET_Z, at, cassetteX,
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
const LABEL: Plan = { x: 70, y: 40, w: 62, d: 13, r: 2 };
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

/* ---------- 技能卡匣架 ---------- */

const RACK_PLAN: Plan = { x: RACK_X, y: RACK_Y - 2, w: RACK_W, d: CASSETTE_D + 4, r: 2 };
export const RACK_ART = {
  halo: haloOf(RACK_PLAN, 0, RACK_Z + CASSETTE_H, P),
  floor: S(insetPlan(RACK_PLAN, -2), 0, RACK_Z, 4, 0.6),
  floorScrews: corners(insetPlan(RACK_PLAN, -2), 3.5).map(([x, y]) => at([x, y, RACK_Z])),
  back: S({ x: RACK_X, y: RACK_Y - 2, w: RACK_W, d: 2, r: 0.5 }, RACK_Z, CASSETTE_H - 4, 3),
  /** 卡匣之間的分隔片：比卡匣矮、短，卡匣書背露在外面 */
  dividers: Array.from({ length: 6 }, (_, i) => S({ x: RACK_X + i * (CASSETTE_W + DIVIDER), y: RACK_Y - 2, w: DIVIDER, d: CASSETTE_D - 6, r: 0.5 }, RACK_Z, CASSETTE_H - 10, 2, 0.3)),
  /** 底板前緣的定位刻線：每個卡匣一條，從底板邊緣往內 */
  stops: join(Array.from({ length: 5 }, (_, i) => lineOnTop([cassetteX(i) + CASSETTE_W / 2, RACK_FRONT + 2], [cassetteX(i) + CASSETTE_W / 2, RACK_FRONT - 0.5], RACK_Z, P))),
};

/** 一個卡匣（在原位建好，拉出時往 +y 平移） */
export function cassetteArt(i: number) {
  const x = cassetteX(i);
  const body: Plan = { x, y: RACK_Y, w: CASSETTE_W, d: CASSETTE_D, r: 1 };
  const spineY = RACK_Y + CASSETTE_D;
  const z0 = RACK_Z + 0.5;
  const top = z0 + CASSETTE_H;
  return {
    body: S(body, z0, CASSETTE_H, 3, 0.5),
    seam: sideSeam(body, z0 + 4, P, 3),
    /** 書背上的名片（name + description）：一個封閉的卡框，加兩條代表文字的短線 */
    card: faceY(spineY, x + 1.6, x + CASSETTE_W - 1.6, top - 15, top - 4),
    cardRule: join([0, 1].map((k) => pathOf([at([x + 3, spineY, top - 7 - k * 3.5]), at([x + CASSETTE_W - (k ? 4.5 : 3), spineY, top - 7 - k * 3.5])]))),
    grip: faceY(spineY, x + 3, x + CASSETTE_W - 3, z0 + 5, z0 + 8),
    gripDots: [at([x + 2.2, spineY, z0 + 6.5]), at([x + CASSETTE_W - 2.2, spineY, z0 + 6.5])],
    /** 只能手動觸發：書背上方一個鎖扣 */
    clasp: S({ x: x - 0.6, y: spineY - 6, w: CASSETTE_W + 1.2, d: 6.6, r: 0.8 }, top - 2, 3, 2, 0.3),
    claspPin: C(x + CASSETTE_W / 2, spineY - 3, 1.3, top + 1, 1.6, 12),
    /** 附屬檔小抽屜：藏在卡匣頂端，用到時往上升 */
    drawer: S({ x: x + 1.5, y: RACK_Y + 10, w: CASSETTE_W - 3, d: 18, r: 0.6 }, top - DRAWER_UP, DRAWER_UP, 2, 0.3),
    drawerLine: lineOnTop([x + 3, RACK_Y + 14], [x + CASSETTE_W - 3, RACK_Y + 14], top, P),
  };
}

/* ---------- 使用者按鍵盤 ---------- */

export const KEY_X = [CONSOLE.x + 7, CONSOLE.x + 17, CONSOLE.x + 27, CONSOLE.x + 37];
export const CONSOLE_ART = {
  halo: haloOf(CONSOLE, 0, CONSOLE_H, P),
  body: S(CONSOLE, 0, CONSOLE_H, 4, 0.8),
  seam: sideSeam(CONSOLE, 2.5, P, 4),
  plate: planOutline(insetPlan(CONSOLE, 2.5), CONSOLE_H, P),
  screws: corners(CONSOLE, 2.6).map(([x, y]) => at([x, y, CONSOLE_H])),
  /** 按鍵（在 z = CONSOLE_H 建好，按下時往下平移） */
  keys: KEY_X.map((x) => S({ x: x - 3.5, y: CONSOLE.y + 6, w: 7, d: 9, r: 1.2 }, CONSOLE_H, 2.4, 3, 0.4)),
};

/* ---------- context 卡架 ---------- */

const post = ([dx, dy]: [number, number]) => ({
  collar: C(RACK_CX + dx, dy, 3, PLINTH_H, 2, 16),
  post: C(RACK_CX + dx, dy, 2, PLINTH_H + 2, POST_TOP - PLINTH_H - 2, 16),
  cap: C(RACK_CX + dx, dy, 2.8, POST_TOP, 1.6, 16),
});
export const CTX_ART = {
  halo: haloOf(PLINTH, 0, 6, P),
  plinth: S(PLINTH, 0, PLINTH_H, 4, 0.6),
  plinthScrews: corners(PLINTH, 3.5).map(([x, y]) => at([x, y, PLINTH_H])),
  tray: S(insetPlan(CARD, -1.5), PLINTH_H, 1, 3),
  backPosts: POSTS.filter(([, y]) => y < 0).map(post),
  frontPosts: POSTS.filter(([, y]) => y > 0).map(post),
};

/** 一張卡：在 z = 0 建好，厚度 t */
export function cardArt(t: number) {
  const layers: string[] = [];
  for (let h = 1.6; h < t - 0.6; h += 1.6) layers.push(sideSeam(CARD, h, P, 3));
  return { paths: S(CARD, 0, t, 3, t > 1.6 ? 0.3 : 0), layers: join(layers) };
}

/* ---------- 模型機櫃 ---------- */

export const CAB_ART = {
  halo: haloOf(insetPlan(CAB, -2), 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), 0, 3, 4, 0.5),
  body: S(CAB, 3, CAB_TOP - 3, 6, 1.2),
  seams: join([14, 48].map((z) => sideSeam(CAB, z, P, 6))),
  vents: join([0, 1, 2].map((i) => faceY(CAB.y + CAB.d, CAB.x + 8, CAB.x + 34, 24 + i * 6, 26.2 + i * 6))),
  rivets: [16.5, 45.5].flatMap((z) => Array.from({ length: 5 }, (_, i) => at([CAB.x + 6 + i * 8, CAB.y + CAB.d, z]))),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  capScrews: corners(insetPlan(CAB, 3), 4).map(([x, y]) => at([x, y, CAB_TOP + 2])),
};

/* ---------- MCP 插座面板與外部系統 ---------- */

export const PANEL_ART = {
  foot: S({ x: PANEL.x - 3, y: PANEL.y - 4, w: PANEL.w + 6, d: PANEL.d + 8, r: 2 }, 0, 2.5, 4, 0.5),
  footScrews: [at([PANEL.x, PANEL_FACE + 2, 2.5]), at([PANEL.x + PANEL.w, PANEL_FACE + 2, 2.5])],
  panel: S(PANEL, 2.5, PANEL_H - 2.5, 4, 0.8),
  seam: sideSeam(PANEL, 14, P, 4),
  sockets: SOCKET_X.map((x) => ({
    plate: faceY(PANEL_FACE, x - 7, x + 7, SOCKET_Z - 7, SOCKET_Z + 7),
    ring: sideRing([x, PANEL_FACE, SOCKET_Z], 3.6, "y", P, 24),
    bore: sideRing([x, PANEL_FACE, SOCKET_Z], 1.6, "y", P, 16),
    screws: [at([x - 5.5, PANEL_FACE, SOCKET_Z + 5.5]), at([x + 5.5, PANEL_FACE, SOCKET_Z - 5.5])],
  })),
  /** tool search 開關：面板頂上一個滑塊（在左端建好，開啟時往 +x 平移） */
  switchTrack: S({ x: PANEL.x + 8, y: PANEL.y + 1, w: 22, d: 5, r: 1.2 }, PANEL_H, 1.6, 3),
  switchKnob: S({ x: PANEL.x + 9, y: PANEL.y + 0.5, w: 8, d: 6, r: 1.2 }, PANEL_H + 1.6, 3, 3, 0.4),
  switchKnurl: knurl(PANEL.x + 13, PANEL.y + 3.5, 2.4, PANEL_H + 4.6, PANEL_H + 7, 16, P),
  switchCap: C(PANEL.x + 13, PANEL.y + 3.5, 2.4, PANEL_H + 4.6, 2.4, 16),
};

export const DEVICES = SOCKET_X.map((x, i) => {
  const plan: Plan = { x: x - DEVICE.w / 2, y: DEVICE_Y, w: DEVICE.w, d: DEVICE.d, r: 2 };
  const h = DEVICE.h + [0, 4, -2][i];
  const terminal: [number, number, number] = [x, DEVICE_Y + 4, h];
  return {
    halo: haloOf(plan, 0, h, P),
    body: S(plan, 0, h, 4, 0.8),
    seam: sideSeam(plan, 3, P, 4),
    vents: join([0, 1, 2].map((k) => faceY(DEVICE_Y + DEVICE.d, x - 6, x + 6, 5 + k * 2.6, 6.2 + k * 2.6))),
    lampBase: C(x + 5, DEVICE_Y + 11, 2.2, h, 1, 14),
    lamp: C(x + 5, DEVICE_Y + 11, 1.5, h + 1, 1.4, 14),
    port: C(terminal[0], terminal[1], 2, h, 1.6, 14),
    /** 纜線：從機器頂上的接頭到插座中心，兩端都落在零件上 */
    cable: pathOf([at([terminal[0], terminal[1], h + 1.6]), at([x, DEVICE_Y - 6, h + 10]), at([x, PANEL_FACE + 4, SOCKET_Z]), at([x, PANEL_FACE, SOCKET_Z])]),
    ends: [at([terminal[0], terminal[1], h + 1.6]), at([x, PANEL_FACE, SOCKET_Z])],
    plug: S({ x: x - 3, y: PANEL_FACE, w: 6, d: 4, r: 1 }, SOCKET_Z - 3, 6, 2, 0.3),
  };
});

/* ---------- Plugin 套件箱 ---------- */

export const CRATE_ART = {
  floor: S(CRATE, 0, 2, 4, 0.4),
  back: S({ x: CRATE.x, y: CRATE.y, w: CRATE.w, d: 2, r: 0.5 }, 2, CRATE_H - 2, 2, 0.3),
  left: S({ x: CRATE.x, y: CRATE.y, w: 2, d: CRATE.d, r: 0.5 }, 2, CRATE_H - 2, 2, 0.3),
  right: S({ x: CRATE.x + CRATE.w - 2, y: CRATE.y, w: 2, d: CRATE.d, r: 0.5 }, 2, CRATE_H - 2, 2, 0.3),
  front: S({ x: CRATE.x, y: CRATE.y + CRATE.d - 2, w: CRATE.w, d: 2, r: 0.5 }, 2, CRATE_H - 2, 2, 0.3),
  frontPlate: faceY(CRATE.y + CRATE.d, CRATE.x + 12, CRATE.x + 28, 3.5, 7),
  /** 箱裡：一個躺平的卡匣、一個插頭、一張子代理卡 */
  cassette: S({ x: CRATE.x + 4, y: CRATE.y + 4, w: 22, d: 9, r: 0.8 }, 2, 4, 3, 0.3),
  plug: S({ x: CRATE.x + 29, y: CRATE.y + 5, w: 7, d: 7, r: 1.2 }, 2, 5, 3, 0.3),
  card: S({ x: CRATE.x + 4, y: CRATE.y + 15, w: 30, d: 7, r: 0.8 }, 2, 1.6, 2),
  rivets: [at([CRATE.x + 10, CRATE.y + CRATE.d, 5.2]), at([CRATE.x + 30, CRATE.y + CRATE.d, 5.2])],
};
