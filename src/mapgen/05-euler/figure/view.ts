import { boxCorners, fitProjection, iso, type Point3 } from "../../../iso/iso-kit";
import { boardPlan, makeBoard } from "../../shared/board";
import { H, W } from "../model";

/** 沿用第 04 章的 40 × 28 地牢；房間中央立柱子（節點），柱子之間架橫條（邊） */
export const WIDTH = 640;
export const HEIGHT = 350;
export const AZIMUTH = 56;

export const BOARD = makeBoard(W, H, 5, 0.4);
export const PLATE = boardPlan(BOARD, 10, 8);
export const PED_R = 5;
export const PED_H = 8;
export const BAR_Z = 0.6;
export const BAR_H = 1.6;

export const P = fitProjection(
  [...boxCorners(PLATE, -13, 0), ...boxCorners(boardPlan(BOARD), 0, PED_H + 4)],
  WIDTH,
  HEIGHT,
  { pad: 18, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
