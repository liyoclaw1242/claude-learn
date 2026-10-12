import {
  corners, cylinder, depthOf, haloOf, insetPlan, knurl, lineOnTop, pathOf, planOutline, radialTicks, ring, sideArc,
  sideRing, sideSeam, slabOf, type Plan, type Plane,
} from "../../../iso/iso-kit";
import type { ModuleKey, Owner } from "../steps";
import {
  BACK_Y, BASE, BASE_H, CAB, CAB_TOP, CARRIAGE, DESK, FOOT_H, GATE_X, MODULE_X, P, RAIL, RAIL_H, RAIL_Y, at,
} from "./view";

const S = (plan: Plan, z: number, h: number, steps = 3, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const C = (cx: number, cy: number, r: number, z: number, h: number, steps = 20, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const join = (list: string[]) => list.join("");
const byDepth = (points: Plane[]) => [...points].sort((a, b) => depthOf([a[0], a[1], 0], P) - depthOf([b[0], b[1], 0], P));
const box = (cx: number, cy: number, w: number, d: number, r = 1.5): Plan => ({ x: cx - w / 2, y: cy - d / 2, w, d, r });
const faceY = (y: number, x0: number, x1: number, z0: number, z1: number) =>
  pathOf([at([x0, y, z0]), at([x1, y, z0]), at([x1, y, z1]), at([x0, y, z1])], true);

export const PAD_H = 1.5;

/** 每台機器的底板：SDK 現成 = 光面；Film 自建 = 滿刻線；兩者 = 半刻線 */
function padOf(plan: Plan) {
  const lines = (from: number, to: number) => {
    const out: string[] = [];
    for (let x = plan.x + 4; x <= plan.x + plan.w - 4; x += 4) {
      if (x < from || x > to) continue;
      out.push(lineOnTop([x, plan.y + 1.2], [x, plan.y + plan.d - 1.2], PAD_H, P));
    }
    return join(out);
  };
  const lampAt: Plane = [plan.x + plan.w - 3.5, plan.y + plan.d - 3.5];
  return {
    pad: S(plan, 0, PAD_H, 3, 0.3),
    hatch: { sdk: "", film: lines(-Infinity, Infinity), both: lines(-Infinity, plan.x + plan.w / 2) } as Record<Owner, string>,
    lampBase: C(lampAt[0], lampAt[1], 2.2, PAD_H, 1, 14),
    lamp: C(lampAt[0], lampAt[1], 1.5, PAD_H + 1, 1.6, 14),
  };
}

/* ---------- 底座 ---------- */

const FEET = byDepth(corners(BASE, 24));
const SCREWS = corners(BASE, 9);
const LABEL: Plan = { x: -150, y: 50, w: 62, d: 13, r: 2 };
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

/* ---------- 01 核心：模型機櫃 + 導軌 + 滑台 ---------- */

const DIAL = { x: CAB.x + 16, y: CAB.y + 18, r: 10 };
const DIAL_TOP = CAB_TOP + 6;
const DIAL_TICKS = radialTicks(DIAL.x, DIAL.y, DIAL.r - 2, 20, 5, DIAL_TOP, [1, 2.2], P, -0.75 * Math.PI, 1.5 * Math.PI);
export const CORE_ART = {
  pad: padOf(insetPlan(CAB, -5)),
  halo: haloOf(CAB, 0, CAB_TOP, P),
  plinth: S(insetPlan(CAB, -2), PAD_H, 3, 4, 0.5),
  body: S(CAB, PAD_H + 3, CAB_TOP - PAD_H - 3, 6, 1.2),
  seams: join([16, 46].map((z) => sideSeam(CAB, z, P, 6))),
  vents: join([0, 1, 2, 3].map((i) => faceY(CAB.y + CAB.d, CAB.x + 8, CAB.x + 30, 22 + i * 5, 23.8 + i * 5))),
  rivets: [18.5, 43.5].flatMap((z) => Array.from({ length: 5 }, (_, i) => at([CAB.x + 6 + i * 8.5, CAB.y + CAB.d, z]))),
  bay: pathOf([at([CAB.x + CAB.w, RAIL_Y - 15, 8]), at([CAB.x + CAB.w, RAIL_Y + 15, 8]), at([CAB.x + CAB.w, RAIL_Y + 15, 34]), at([CAB.x + CAB.w, RAIL_Y - 15, 34])], true),
  cap: S(insetPlan(CAB, 3), CAB_TOP, 2, 6, 0.6),
  dialStand: C(DIAL.x, DIAL.y, DIAL.r - 3, CAB_TOP + 2, 1.5, 32),
  dial: C(DIAL.x, DIAL.y, DIAL.r, CAB_TOP + 3.5, 2.5, 48, 0.6),
  dialKnurl: knurl(DIAL.x, DIAL.y, DIAL.r, CAB_TOP + 3.5, DIAL_TOP, 60, P, 0.3),
  dialMinor: DIAL_TICKS.minor,
  dialMajor: DIAL_TICKS.major,
  needle: lineOnTop([DIAL.x, DIAL.y], [DIAL.x + 5.5, DIAL.y - 4], DIAL_TOP + 0.2, P),
  lampBase: C(CAB.x + 34, CAB.y + 44, 3.4, CAB_TOP + 2, 1.5, 20),
  lamp: C(CAB.x + 34, CAB.y + 44, 2.4, CAB_TOP + 3.5, 2.4, 20),
  rail: S(RAIL, 0, RAIL_H, 3, 0.5),
  railTicks: join(Array.from({ length: Math.floor((RAIL.w - 8) / 10) + 1 }, (_, i) => {
    const x = RAIL.x + 4 + i * 10;
    return pathOf([at([x, RAIL.y + RAIL.d, RAIL_H]), at([x, RAIL.y + RAIL.d, RAIL_H - (i % 5 === 0 ? 2.6 : 1.4)])]);
  })),
  railStop: S({ x: RAIL.x + RAIL.w - 6, y: RAIL.y - 4, w: 6, d: RAIL.d + 8, r: 1 }, 0, 8, 3, 0.4),
  railStopScrews: [at([RAIL.x + RAIL.w - 3, RAIL.y - 1, 8]), at([RAIL.x + RAIL.w - 3, RAIL.y + RAIL.d + 1, 8])],
};

/** 滑台：在 x = 0 建好，平移到停靠位置 */
const POSTS: Plane[] = [[-10.5, RAIL_Y - 11.5], [10.5, RAIL_Y - 11.5], [-10.5, RAIL_Y + 11.5], [10.5, RAIL_Y + 11.5]];
const CARD: Plan = { x: -9, y: RAIL_Y - 10, w: 18, d: 20, r: 1 };
export const CARRIAGE_ART = {
  plate: S(CARRIAGE, RAIL_H, 4, 3, 0.5),
  seam: sideSeam(CARRIAGE, RAIL_H + 1.6, P, 3),
  backPosts: POSTS.filter(([, y]) => y < RAIL_Y).map(([x, y]) => C(x, y, 1.3, RAIL_H + 4, 18, 12)),
  frontPosts: POSTS.filter(([, y]) => y > RAIL_Y).map(([x, y]) => C(x, y, 1.3, RAIL_H + 4, 18, 12)),
  deck: [3, 2, 4].map((t, i, all) => S(CARD, RAIL_H + 4 + all.slice(0, i).reduce((a, b) => a + b, 0), t, 2)),
  /** 走查時載著的那張請求卡 */
  request: S(CARD, RAIL_H + 13, 1.6, 2),
};

/* ---------- 02 Context：卡架 ---------- */

const CTX = box(MODULE_X.context, BACK_Y, 26, 22);
const CTX_TOP = 76;
const CTX_POSTS: Plane[] = [[CTX.x - 2.5, CTX.y - 2.5], [CTX.x + CTX.w + 2.5, CTX.y - 2.5], [CTX.x - 2.5, CTX.y + CTX.d + 2.5], [CTX.x + CTX.w + 2.5, CTX.y + CTX.d + 2.5]];
const CTX_CARDS = [5, 3, 13, 3, 9];
const ctxZ = (i: number) => PAD_H + 4 + CTX_CARDS.slice(0, i).reduce((a, b) => a + b, 0);
const WIRE_Z = PAD_H + 4 + 0.85 * (CTX_TOP - PAD_H - 8);
export const CONTEXT_ART = {
  pad: padOf(insetPlan(CTX, -10)),
  plinth: S(insetPlan(CTX, -7), PAD_H, 4, 3, 0.5),
  backPosts: CTX_POSTS.filter(([, y]) => y < BACK_Y).map(([x, y]) => C(x, y, 1.5, PAD_H + 4, CTX_TOP - PAD_H - 4, 12)),
  frontPosts: CTX_POSTS.filter(([, y]) => y > BACK_Y).map(([x, y]) => C(x, y, 1.5, PAD_H + 4, CTX_TOP - PAD_H - 4, 12)),
  cards: CTX_CARDS.map((t, i) => S(CTX, ctxZ(i), t, 2, t > 2 ? 0.3 : 0)),
  head: S(insetPlan(CTX, -6), CTX_TOP, 5, 3, 0.5),
  knob: C(CTX.x + CTX.w / 2, BACK_Y, 3, CTX_TOP + 5, 3, 20),
  wire: pathOf([at([CTX.x - 1, CTX.y + CTX.d + 2.5, WIRE_Z]), at([CTX.x + CTX.w + 1, CTX.y + CTX.d + 2.5, WIRE_Z])]),
  wireEnds: [at([CTX.x - 1, CTX.y + CTX.d + 2.5, WIRE_Z]), at([CTX.x + CTX.w + 1, CTX.y + CTX.d + 2.5, WIRE_Z])],
};

/* ---------- 03 規則：組裝夾具（三片分隔板）---------- */

const JIG = box(MODULE_X.rules, BACK_Y + 2, 26, 22);
const JIG_PARTS: { t: number; divider?: 0 | 1 | 2 }[] = [
  { t: 0.9, divider: 0 }, { t: 5 }, { t: 0.9, divider: 1 }, { t: 7 }, { t: 3 }, { t: 0.9, divider: 2 }, { t: 4 }, { t: 6 }, { t: 3 },
];
export const RULES_ART = {
  pad: padOf(insetPlan(JIG, -10)),
  plinth: S(insetPlan(JIG, -6), PAD_H, 4, 3, 0.6),
  rods: [JIG.x - 3, JIG.x + JIG.w + 3].map((x) => C(x, JIG.y - 3, 1.6, PAD_H + 4, 56, 14)),
  parts: JIG_PARTS.map((p, i) => {
    const z = PAD_H + 4 + JIG_PARTS.slice(0, i).reduce((a, b) => a + b.t, 0);
    if (p.divider === undefined) return { kind: "card" as const, paths: S(JIG, z, p.t, 2, 0.3) };
    const tabY = [JIG.y + 14, JIG.y + 6, JIG.y - 2][p.divider];
    return {
      kind: "divider" as const,
      paths: S(insetPlan(JIG, -1), z, p.t, 2),
      tab: S({ x: JIG.x + JIG.w + 1, y: tabY, w: 5, d: 8, r: 1 }, z, p.t, 2),
    };
  }),
  clampBar: S({ x: JIG.x - 7, y: JIG.y - 6, w: JIG.w + 14, d: 6, r: 1.5 }, 50, 4, 3, 0.4),
  clampPlate: S(insetPlan(JIG, 2), 46, 2, 2, 0.3),
};

/* ---------- 04 工具：卡片目錄工具櫃 ---------- */

const TOOLS = box(MODULE_X.tools, BACK_Y, 40, 32);
const TOOL_TOP = 44;
const DRAWER_W = 15;
const DRAWER_H = 11;
const drawerAt = (col: number, row: number) => ({ x0: TOOLS.x + 4 + col * (DRAWER_W + 3), z0: PAD_H + 6 + row * (DRAWER_H + 2.5) });
const TOOL_FRONT = TOOLS.y + TOOLS.d;
export const TOOLS_ART = {
  pad: padOf(insetPlan(TOOLS, -6)),
  plinth: S(insetPlan(TOOLS, -2), PAD_H, 3, 3, 0.5),
  body: S(TOOLS, PAD_H + 3, TOOL_TOP - PAD_H - 3, 4, 1),
  bays: join([0, 1].flatMap((col) => [0, 1, 2].map((row) => {
    const { x0, z0 } = drawerAt(col, row);
    return faceY(TOOL_FRONT, x0, x0 + DRAWER_W, z0, z0 + DRAWER_H);
  }))),
  /** 抽屜正面與說明卡（在關閉位置建好，打開時往 +y 平移） */
  drawers: [0, 1].flatMap((col) => [0, 1, 2].map((row) => {
    const { x0, z0 } = drawerAt(col, row);
    const front: Plan = { x: x0 + 0.5, y: TOOL_FRONT, w: DRAWER_W - 1, d: 1.8, r: 0.5 };
    return {
      front: S(front, z0 + 0.5, DRAWER_H - 1, 2, 0.3),
      card: faceY(TOOL_FRONT + 1.8, x0 + 3, x0 + DRAWER_W - 3, z0 + 3, z0 + DRAWER_H - 3),
      pull: S({ x: x0 + DRAWER_W / 2 - 3, y: TOOL_FRONT + 1.8, w: 6, d: 1.4, r: 0.5 }, z0 + 1.2, 1.4, 2),
      box: (open: number) => S({ x: x0 + 1, y: TOOL_FRONT, w: DRAWER_W - 2, d: Math.max(0.01, open), r: 0.3 }, z0 + 1, DRAWER_H - 3, 2),
    };
  })),
  top: S(insetPlan(TOOLS, 2), TOOL_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(TOOLS, 2), 3.5).map(([x, y]) => at([x, y, TOOL_TOP + 2])),
};
/** 走查時會被拉開的那格（右欄中間） */
export const OPEN_DRAWER = 4;

/* ---------- 05 權限與 Hooks：跨在導軌上的閘門 ---------- */

const GATE_POSTS: Plane[] = [[GATE_X, RAIL_Y - 18], [GATE_X, RAIL_Y + 18]];
const GATE_TOP = 44;
export const GATE_ART = {
  pad: padOf(box(GATE_X, RAIL_Y, 16, 46, 2)),
  feet: GATE_POSTS.map(([x, y]) => S(box(x, y, 9, 7, 1.2), PAD_H, 3, 3, 0.4)),
  backPost: S(box(GATE_POSTS[0][0], GATE_POSTS[0][1], 4, 4, 1), PAD_H + 3, GATE_TOP - PAD_H - 3, 3),
  frontPost: S(box(GATE_POSTS[1][0], GATE_POSTS[1][1], 4, 4, 1), PAD_H + 3, GATE_TOP - PAD_H - 3, 3),
  beam: S(box(GATE_X, RAIL_Y, 8, 42, 1.5), GATE_TOP, 5, 3, 0.5),
  beamScrews: GATE_POSTS.map(([x, y]) => at([x, y, GATE_TOP + 5])),
  /** 閘板：在 z = 0 建好，往上平移；放下時底面在導軌頂上 */
  plate: S(box(GATE_X, RAIL_Y, 3, 30, 0.8), 0, 18, 2, 0.4),
  plateLine: sideSeam(box(GATE_X, RAIL_Y, 3, 30, 0.8), 9, P, 2),
};
export const GATE_DOWN = RAIL_H + 0.5;
export const GATE_UP = GATE_TOP - 17.5;

/* ---------- 06 子代理：三個攝製組小卡架 ---------- */

export const SUB_X = [MODULE_X.subagents - 26, MODULE_X.subagents, MODULE_X.subagents + 26];
export const SUBAGENT_ART = {
  pad: padOf(box(MODULE_X.subagents, BACK_Y, 76, 32, 2)),
  partition: S({ x: SUB_X[0] - 15, y: BACK_Y - 15, w: 2.5, d: 30, r: 0.6 }, PAD_H, 30, 2, 0.4),
  racks: SUB_X.map((cx) => {
    const card = box(cx, BACK_Y, 14, 14, 1);
    const posts: Plane[] = [[cx - 9, BACK_Y - 9], [cx + 9, BACK_Y - 9], [cx - 9, BACK_Y + 9], [cx + 9, BACK_Y + 9]];
    return {
      plinth: S(box(cx, BACK_Y, 22, 22, 1.5), PAD_H, 3, 3, 0.4),
      backPosts: posts.filter(([, y]) => y < BACK_Y).map(([x, y]) => C(x, y, 1.1, PAD_H + 3, 36, 10)),
      frontPosts: posts.filter(([, y]) => y > BACK_Y).map(([x, y]) => C(x, y, 1.1, PAD_H + 3, 36, 10)),
      cards: [3, 10].map((t, i) => S(card, PAD_H + 3 + (i ? 3 : 0), t, 2, 0.2)),
      cab: S(box(cx, BACK_Y, 22, 22, 2), PAD_H + 39, 10, 3, 0.6),
      cabSlot: faceY(BACK_Y + 11, cx - 5, cx + 5, PAD_H + 42, PAD_H + 43.6),
    };
  }),
};

/* ---------- 07 技能卡匣 + MCP 插座 ---------- */

const SK = box(MODULE_X.skills - 14, BACK_Y, 30, 30, 2);
const CART_X = [0, 1, 2, 3].map((i) => SK.x + 3 + i * 6.6);
const PANEL_X = MODULE_X.skills + 20;
const SOCKETS = [BACK_Y - 4, BACK_Y + 8];
export const SKILLS_ART = {
  pad: padOf(box(MODULE_X.skills, BACK_Y + 6, 60, 48, 2)),
  rackBase: S(SK, PAD_H, 3, 3, 0.4),
  rackBack: S({ x: SK.x, y: SK.y, w: SK.w, d: 2.5, r: 0.6 }, PAD_H + 3, 26, 2),
  /** 卡匣：在原位建好，拉出時往 +y 平移 */
  carts: CART_X.map((x) => ({
    body: S({ x, y: SK.y + 3, w: 5, d: 24, r: 0.6 }, PAD_H + 3, 22, 2, 0.3),
    spine: faceY(SK.y + 27, x + 1, x + 4, PAD_H + 14, PAD_H + 22),
  })),
  panelFoot: S({ x: PANEL_X - 3, y: BACK_Y - 16, w: 10, d: 32, r: 1 }, PAD_H, 3, 3, 0.4),
  panel: S({ x: PANEL_X, y: BACK_Y - 14, w: 4, d: 28, r: 1 }, PAD_H + 3, 32, 3, 0.5),
  sockets: join(SOCKETS.map((y) => sideRing([PANEL_X + 4, y, 22], 2.4, "x", P, 18))),
  socketsInner: join(SOCKETS.map((y) => sideRing([PANEL_X + 4, y, 22], 1, "x", P, 12))),
  device: S(box(PANEL_X + 10, -24, 9, 9, 1.2), PAD_H, 8, 2, 0.4),
  deviceLamp: C(PANEL_X + 10, -24, 1.4, PAD_H + 8, 1.2, 12),
  /** 外部系統接到插座的纜線：兩端都落在端子上 */
  cable: pathOf([at([PANEL_X + 10, -24, PAD_H + 9.2]), at([PANEL_X + 8, -30, 22]), at([PANEL_X + 4, SOCKETS[1], 22])]),
  cableEnds: [at([PANEL_X + 10, -24, PAD_H + 9.2]), at([PANEL_X + 4, SOCKETS[1], 22])],
};
/** 走查時被拉出的卡匣 */
export const PULLED_CART = 1;

/* ---------- 08 記憶：檔案櫃 ---------- */

const MEM = box(MODULE_X.memory, BACK_Y, 30, 34, 2);
const MEM_TOP = 50;
const MEM_FRONT = MEM.y + MEM.d;
const memDrawerZ = (i: number) => PAD_H + 5 + i * 14.5;
export const MEMORY_ART = {
  pad: padOf(insetPlan(MEM, -6)),
  plinth: S(insetPlan(MEM, -2), PAD_H, 3, 3, 0.5),
  body: S(MEM, PAD_H + 3, MEM_TOP - PAD_H - 3, 4, 1),
  bays: join([0, 1, 2].map((i) => faceY(MEM_FRONT, MEM.x + 3, MEM.x + MEM.w - 3, memDrawerZ(i), memDrawerZ(i) + 12.5))),
  drawers: [0, 1, 2].map((i) => {
    const z0 = memDrawerZ(i);
    return {
      front: S({ x: MEM.x + 3.5, y: MEM_FRONT, w: MEM.w - 7, d: 1.8, r: 0.5 }, z0 + 0.5, 11.5, 2, 0.3),
      holder: faceY(MEM_FRONT + 1.8, MEM.x + MEM.w / 2 - 5, MEM.x + MEM.w / 2 + 5, z0 + 7.5, z0 + 10),
      pull: S({ x: MEM.x + MEM.w / 2 - 4, y: MEM_FRONT + 1.8, w: 8, d: 1.4, r: 0.5 }, z0 + 2, 1.6, 2),
      box: (open: number) => S({ x: MEM.x + 4.5, y: MEM_FRONT, w: MEM.w - 9, d: Math.max(0.01, open), r: 0.3 }, z0 + 1, 9, 2),
    };
  }),
  top: S(insetPlan(MEM, 2), MEM_TOP, 2, 4, 0.5),
  topScrews: corners(insetPlan(MEM, 2), 3.5).map(([x, y]) => at([x, y, MEM_TOP + 2])),
};
/** 回寫時拉開的抽屜（最上層） */
export const WRITE_DRAWER = 2;

/* ---------- 編劇 / 導演：批准桌 ---------- */

const LEGS: Plane[] = byDepth(corners(DESK, 3.5));
export const USER_ART = {
  pad: padOf(insetPlan(DESK, -5)),
  legs: LEGS.map(([x, y]) => C(x, y, 1.4, PAD_H, 17, 12)),
  top: S(DESK, PAD_H + 17, 2.5, 3, 0.6),
  pages: [0, 1, 2].map((i) => S({ x: DESK.x + 5 + i * 0.8, y: DESK.y + 5 - i * 0.8, w: 18, d: 14, r: 0.6 }, PAD_H + 19.5 + i * 0.7, 0.7, 2)),
  buttonBase: C(DESK.x + DESK.w - 10, DESK.y + DESK.d - 9, 4, PAD_H + 19.5, 1.5, 24),
  button: C(DESK.x + DESK.w - 10, DESK.y + DESK.d - 9, 2.8, PAD_H + 21, 1.8, 24),
  buttonRing: ring(DESK.x + DESK.w - 10, DESK.y + DESK.d - 9, 4, PAD_H + 21, P, 24),
  edge: sideArc(DESK.x + DESK.w - 10, DESK.y + DESK.d - 9, 4, PAD_H + 20.2, P, 16),
};

export const PADS: Record<ModuleKey, ReturnType<typeof padOf>> = {
  core: CORE_ART.pad, context: CONTEXT_ART.pad, rules: RULES_ART.pad, tools: TOOLS_ART.pad, hooks: GATE_ART.pad,
  subagents: SUBAGENT_ART.pad, skills: SKILLS_ART.pad, memory: MEMORY_ART.pad, user: USER_ART.pad,
};
