import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import { CODE } from "../code";
import type { FloorId, Spot } from "../steps";

/**
 * 原型機台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 中間是一座抽屜塔：一層托盤 = claude_film.py 的一段，托盤高度 ∝ 那段的行數。
 * 前方一條導軌，滑台把卡送到各站；塔的右前方有升降梯，把卡送上各層。
 * 左邊是導演的終端台與 series/ 檔案櫃，右邊是模型機櫃與子代理的小卡架。
 */

export const WIDTH = 640;
export const HEIGHT = 420;
export const AZIMUTH = 56;

export const BASE: Plan = { x: -184, y: -62, w: 372, d: 126, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* ---------- 每層的真實行數（從 code.ts 的標記區段算） ---------- */

function linesBetween(start: string, end?: string) {
  const i = CODE.indexOf(start);
  if (i < 0) return 0;
  const j = end ? CODE.indexOf(end, i + start.length) : -1;
  return CODE.slice(i, j < 0 ? undefined : j).split("\n").length - 1;
}

export const LINES: Record<FloorId, number> = {
  f01: linesBetween("# ---------- 01", "# ---------- 02"),
  f02: linesBetween("# ---------- 02", "def main"),
  f03: linesBetween("# ---------- 03", "# ---------- 04"),
  // 04 包含工具本體與工具定義（def tool … TOOLS）
  f04: linesBetween("# ---------- 04", "def remember") + linesBetween("def tool(", "# ---------- 05"),
  f05: linesBetween("# ---------- 05", "# ---------- 01"),
  f06: linesBetween("# ---------- 06", "def tool("),
  f07: 0,
  f08: linesBetween("def remember", "# ---------- 06") + 1,
};
export const TOTAL_LINES = CODE.split("\n").length;

/* ---------- 抽屜塔 ---------- */

export const TOWER: Plan = { x: -42, y: -42, w: 84, d: 62, r: 2 };
export const TOWER_FRONT = TOWER.y + TOWER.d;
export const WALL = 3;
export const PER_LINE = 0.42;
export const MIN_TRAY = 10;
export const TRAY_GAP = 1.2;
export const TRAY_Z0 = 6;
/** 焦點托盤拉出多少 */
export const OPEN = 22;

const ORDER: FloorId[] = ["f01", "f02", "f03", "f04", "f05", "f06", "f07", "f08"];
export const TRAY_H: Record<FloorId, number> = Object.fromEntries(
  ORDER.map((id) => [id, Math.max(MIN_TRAY, LINES[id] * PER_LINE)]),
) as Record<FloorId, number>;
export const TRAY_Z: Record<FloorId, number> = (() => {
  let z = TRAY_Z0;
  const out = {} as Record<FloorId, number>;
  for (const id of ORDER) { out[id] = z; z += TRAY_H[id] + TRAY_GAP; }
  return out;
})();
export const TOWER_TOP = TRAY_Z.f08 + TRAY_H.f08 + 3;

/* ---------- 前方導軌與升降梯 ---------- */

export const RAIL_Y = 52;
export const RAIL: Plan = { x: -172, y: RAIL_Y - 4, w: 352, d: 8, r: 2 };
export const RAIL_H = 3;
export const SLED: Plan = { x: -10, y: -8, w: 20, d: 16, r: 2 };
export const SLED_H = 3;
export const CARD: Plan = { x: -7, y: -6, w: 14, d: 12, r: 1 };
export const CARD_T = 2;
export const CARD_Z = RAIL_H + SLED_H;

/** 升降梯：在塔的右前方，跟導軌同一條線上 */
export const LIFT_X = 58;
export const MAST_TOP = TOWER_TOP + 8;

/* ---------- 各站 ---------- */

export const DESK: Plan = { x: -172, y: -30, w: 40, d: 42, r: 3 };
export const DESK_H = 20;
export const FILES: Plan = { x: -120, y: -40, w: 34, d: 48, r: 3 };
export const FILES_H = 46;
export const CAB: Plan = { x: 88, y: -44, w: 46, d: 54, r: 4 };
export const CAB_TOP = 60;
export const SUB: Plan = { x: 146, y: -24, w: 26, d: 26, r: 2 };
export const SUB_TOP = 46;

/** 每一站在導軌上的 x，以及樓層在升降梯上的 z */
export const SPOT_X: Record<"director" | "disk" | "model" | "sub", number> = {
  director: DESK.x + DESK.w / 2,
  disk: FILES.x + FILES.w / 2,
  model: CAB.x + CAB.w / 2,
  sub: SUB.x + SUB.w / 2,
};
export const isFloor = (spot: Spot): spot is FloorId => spot.startsWith("f");
export const floorZ = (id: FloorId) => TRAY_Z[id] + TRAY_H[id] / 2 - CARD_T;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ ...TOWER, d: TOWER.d + OPEN }, 0, MAST_TOP + 6),
    ...boxCorners(CAB, 0, CAB_TOP + 4),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
