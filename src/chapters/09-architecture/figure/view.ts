import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import type { ModuleKey } from "../steps";

/**
 * 總成工作台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是模型機櫃（第 01 章），前方一條導軌載著 Harness 滑台；
 * 導軌後方一字排開前面各章機器的縮小版，右前方是編劇 / 導演的批准桌。
 */

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 56;

export const BASE: Plan = { x: -214, y: -86, w: 428, d: 166, r: 12 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 導軌與滑台（Agent Loop） */
export const RAIL: Plan = { x: -144, y: 2, w: 342, d: 10, r: 2 };
export const RAIL_H = 4;
export const RAIL_Y = RAIL.y + RAIL.d / 2;
export const CARRIAGE: Plan = { x: -13, y: RAIL_Y - 14, w: 26, d: 28, r: 2.5 };

/* 模型機櫃 */
export const CAB: Plan = { x: -194, y: -40, w: 46, d: 58, r: 4 };
export const CAB_TOP = 56;

/* 導軌後方各站的中心 x（y 都在後排） */
export const BACK_Y = -46;
export const MODULE_X = {
  context: -112,
  rules: -70,
  tools: -6,
  subagents: 60,
  skills: 128,
  memory: 190,
} as const;

/** 權限閘門跨在導軌上 */
export const GATE_X = -40;

/** 編劇 / 導演的批准桌（右前方） */
export const DESK: Plan = { x: 130, y: 32, w: 44, d: 28, r: 2.5 };

/** 每一站在導軌上的停靠位置（滑台中心 x） */
export const STOP_X: Record<ModuleKey, number> = {
  core: -129,
  context: -112,
  rules: -70,
  hooks: GATE_X,
  tools: -6,
  subagents: 60,
  skills: 128,
  memory: 178,
  user: 150,
};

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ x: CAB.x, y: CAB.y, w: CAB.w, d: CAB.d, r: 0 }, 0, CAB_TOP + 10),
    ...boxCorners({ x: -130, y: -64, w: 30, d: 34, r: 0 }, 0, 84),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
