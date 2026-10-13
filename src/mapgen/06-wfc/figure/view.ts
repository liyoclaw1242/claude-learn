import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 12 × 9 的拼塊棋盤；右側拼塊架陳列 19 種拼塊 */
export const WIDTH = 640;
export const HEIGHT = 350;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 14, 0);
const B = boardPlan(BOARD, 10, 8);
export const PLATE: Plan = { ...B, w: B.w + 62 };

export const RACK_COLS = 4;
export const RACK_CELL = 11;
export const RACK: Plan = { x: BOARD.x0 + W * BOARD.cell + 12, y: -28.5, w: RACK_COLS * RACK_CELL + 4, d: 5 * RACK_CELL + 4, r: 2 };
export const RACK_H = 3;

export const CHIP = 0.52;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, 19 * CHIP + 2)],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
