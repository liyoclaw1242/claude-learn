import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 28 × 21 的高度場棋盤；右側是八度混音台（4 根推桿 = 4 個八度） */
export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 7, 0.5);
const B = boardPlan(BOARD, 10, 8);
export const PLATE: Plan = { ...B, w: B.w + 40 };

export const MIXER: Plan = { x: BOARD.x0 + W * BOARD.cell + 13, y: -36, w: 26, d: 72, r: 3 };
export const MIXER_H = 8;
export const SLOT_Y = [-24, -8, 8, 24];
export const SLOT_X0 = MIXER.x + 5;
export const SLOT_LEN = 15;

export const MAX_H = 19;
export const BASE_H = 1;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, MAX_H + 2)],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
