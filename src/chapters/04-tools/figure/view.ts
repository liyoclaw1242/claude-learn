import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import type { ToolId } from "../steps";

/**
 * 工具櫃工作台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是卡片目錄櫃：一個抽屜 = 一個工具，抽屜正面插著說明卡（description）。
 * 右後方是模型機櫃，前面的卡架是「回到 context 的東西」：工具結果疊在這裡，卡厚 = token 量。
 */

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 50;

export const BASE: Plan = { x: -172, y: -64, w: 316, d: 128, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 目錄櫃 */
export const CAT: Plan = { x: -160, y: -40, w: 98, d: 56, r: 3 };
export const CAT_FRONT = CAT.y + CAT.d;
export const COLS = 2;
export const ROWS = 4;
export const DRAWER_W = 42;
export const DRAWER_H = 19;
export const DRAWER_GAP = 2;
export const DRAWER_Z0 = 5;
export const CAT_TOP = DRAWER_Z0 + ROWS * (DRAWER_H + DRAWER_GAP) + 2;
/** 抽屜拉開的距離 */
export const OPEN = 14;

/** 抽屜位置：由上而下、由左而右 */
export const SLOTS: Record<ToolId, { col: number; row: number }> = {
  get_outline: { col: 0, row: 3 },
  find_mentions: { col: 1, row: 3 },
  read_scene: { col: 0, row: 2 },
  read_file: { col: 1, row: 2 },
  edit_scene: { col: 0, row: 1 },
  check_format: { col: 1, row: 1 },
  script_tool: { col: 0, row: 0 },
};
/** 說明卡的高度 ∝ description 的長度；壞描述幾乎是空白小卡 */
export const DESC_H: Record<ToolId, number> = {
  get_outline: 10, find_mentions: 11, read_scene: 8, read_file: 4, edit_scene: 11, check_format: 10, script_tool: 2.4,
};

/* MCP 擴充模組：一排小抽屜，接上時從上方落到目錄櫃頂 */
export const MCP: Plan = { x: CAT.x + 4, y: CAT.y + 6, w: CAT.w - 8, d: CAT.d - 10, r: 2 };
export const MCP_H = 22;
export const MCP_DROP = 40;

/* 模型機櫃與 context 卡架 */
export const CAB: Plan = { x: 34, y: -54, w: 64, d: 40, r: 4 };
export const CAB_TOP = 74;
export const CARD: Plan = { x: 46, y: -2, w: 40, d: 30, r: 1.5 };
export const TRAY_PLINTH: Plan = { x: CARD.x - 9, y: CARD.y - 9, w: CARD.w + 18, d: CARD.d + 18, r: 3 };
export const PLINTH_H = 4;
export const CARD_Z = PLINTH_H + 1;
export const POST_TOP = 62;
/** steps.tsx 的 size 乘上這個數 = 卡的厚度 */
export const U = 1.5;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ ...CAT, d: CAT.d + OPEN + 4 }, 0, CAT_TOP + MCP_H + 6),
    ...boxCorners(CAB, 0, CAB_TOP + 8),
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
