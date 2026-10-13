import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 30 × 20 的洞穴棋盤；右側是輪數計數器，3×3 放大鏡懸在棋盤上方 */
export const WIDTH = 640;
export const HEIGHT = 340;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 7, 0.6);
const B = boardPlan(BOARD, 10, 8);
export const PLATE: Plan = { ...B, w: B.w + 36 };

export const COUNTER: Plan = { x: BOARD.x0 + W * BOARD.cell + 14, y: -24, w: 20, d: 48, r: 3 };
export const COUNTER_H = 16;

export const WALL_H = 8;
export const FLOOR_H = 1;
export const LENS_Z = 19;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, LENS_Z + 4)],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
