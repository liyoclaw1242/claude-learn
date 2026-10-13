import { boxCorners, fitProjection, iso, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 40 × 28 的島；據點、道路與巡迴路線畫在浮於上方的圖層，用虛線垂到地面 */
export const WIDTH = 640;
export const HEIGHT = 370;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 5, 0.3);
export const PLATE = boardPlan(BOARD, 10, 8);
export const LAYER_Z = 22;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, LAYER_Z + 6)],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
