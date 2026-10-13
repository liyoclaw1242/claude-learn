import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 16 × 12 的棋盤放在底座左側，右側是種子控制台（轉盤 + 種子數字） */
export const WIDTH = 640;
export const HEIGHT = 340;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 10, 1);
export const PLATE: Plan = { ...boardPlan(BOARD, 12, 8), w: boardPlan(BOARD, 12).w + 46 };

export const CONSOLE: Plan = { x: 94, y: -26, w: 26, d: 52, r: 3 };
export const CONSOLE_H = 18;
export const DIAL = { x: 107, y: -8, r: 9.5, h: 3 };
export const LAMP = { x: 107, y: 15 };

export const WALL_H = 9;
export const FLOOR_H = 1.2;
export const PEAK_H = 18;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, PEAK_H)],
  WIDTH,
  HEIGHT,
  { pad: 20, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
