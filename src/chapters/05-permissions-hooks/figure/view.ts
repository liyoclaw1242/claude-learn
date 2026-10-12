import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 分揀輸送線的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是模型機櫃，一條導軌往右依序經過：PreToolUse 量測站（含擋板）→ 權限閘門組
 * （deny、ask、allow 三片閘板，前方是導演的批准台）→ 工具壓印機 → PostToolUse 驗收站。
 * 滑台載著一張工具請求卡出發，結果卡沿同一條導軌送回模型。
 */

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 60;

export const BASE: Plan = { x: -192, y: -66, w: 344, d: 132, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 模型機櫃 */
export const CAB: Plan = { x: -184, y: -44, w: 48, d: 74, r: 4 };
export const CAB_TOP = 62;
export const CAB_FACE = CAB.x + CAB.w;
export const CAB_FRONT = CAB.y + CAB.d;

/* 導軌與滑台 */
export const RAIL: Plan = { x: CAB_FACE, y: -5, w: 280, d: 10, r: 2 };
export const RAIL_H = 4;
export const CARRIAGE: Plan = { x: -15, y: -16, w: 30, d: 32, r: 3 };
export const CARRIAGE_Z = RAIL_H;
export const CARRIAGE_H = 5;
export const CARD: Plan = { x: -11, y: -12, w: 22, d: 24, r: 1.2 };
export const CARD_Z = CARRIAGE_Z + CARRIAGE_H;
export const CARD_H = 3;
export const CARD_TOP = CARD_Z + CARD_H;

/* 各站在導軌上的位置（滑台中心 x） */
export const X = {
  model: CAB_FACE + 17,
  pre: -82,
  barrier: -60,
  deny: -28,
  ask: -13,
  allow: 2,
  tool: 50,
  post: 104,
} as const;
/** 滑台停在閘板前的距離 */
export const BEFORE_GATE = 18;

/* 量測站（Pre / Post）與壓印機共用骨架：立柱在導軌後方，懸臂伸到導軌上方 */
export const COLUMN_Y = -54;
export const ARM_Z = 62;
export const ARM_H = 7;
export const HEAD_Z = 54;
export const PROBE_REST = 26;
export const TOOL_REST = 34;

/* 權限閘門組 */
export const GATE_HOUSING: Plan = { x: X.deny - 8, y: -52, w: X.allow - X.deny + 16, d: 34, r: 3 };
export const GATE_TOP = 36;
export const GATE_Y0 = -16;
export const GATE_D = 32;
export const GATE_H = 26;
/** 閘板打開時往後收進機殼的距離 */
export const GATE_OPEN = 36;

/* 導演的批准台（導軌前方） */
export const DESK: Plan = { x: X.ask - 20, y: 28, w: 40, d: 24, r: 3 };
export const DESK_H = 12;

/* PreToolUse 的擋板：從導軌下方升起 */
export const BARRIER_H = 22;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ ...CAB, r: 0 }, 0, CAB_TOP + 8),
    ...boxCorners({ x: X.pre - 12, y: COLUMN_Y - 6, w: X.post - X.pre + 24, d: 10, r: 0 }, 0, ARM_Z + ARM_H + 12),
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
