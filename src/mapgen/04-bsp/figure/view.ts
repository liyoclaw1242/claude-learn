import { boxCorners, fitProjection, iso, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 40 × 28 的地牢棋盤；切割的刀口是豎起的隔板，越早切的越高 */
export const WIDTH = 640;
export const HEIGHT = 350;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 5, 0.4);
export const PLATE = boardPlan(BOARD, 10, 8);
export const FENCE_H = [13, 9.5, 7, 5];

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, FENCE_H[0])],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
