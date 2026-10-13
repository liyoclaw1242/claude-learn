import {
  corners, cylinder, depthOf, haloOf, insetPlan, planOutline, ring, slabOf, type Plan, type Projection, type SolidPaths,
} from "../../iso/iso-kit";

/**
 * 等角棋盤：cols × rows 個方格，世界座標以棋盤中心為原點（1 單位 ≈ 1 px，z 朝上）。
 * 每格是一根方柱，高度代表那格的值。
 */
export type Board = { cols: number; rows: number; cell: number; gap: number; x0: number; y0: number };

export const makeBoard = (cols: number, rows: number, cell: number, gap = 0.8): Board =>
  ({ cols, rows, cell, gap, x0: (-cols * cell) / 2, y0: (-rows * cell) / 2 });

/** 整塊棋盤的平面範圍（可往外擴 pad） */
export const boardPlan = (b: Board, pad = 0, r = 0): Plan =>
  ({ x: b.x0 - pad, y: b.y0 - pad, w: b.cols * b.cell + pad * 2, d: b.rows * b.cell + pad * 2, r });

export const cellPlan = (b: Board, c: number, r: number, shrink = 0): Plan => {
  const inset = b.gap / 2 + shrink;
  return { x: b.x0 + c * b.cell + inset, y: b.y0 + r * b.cell + inset, w: b.cell - inset * 2, d: b.cell - inset * 2, r: 0 };
};

export const cellCenter = (b: Board, c: number, r: number): [number, number] =>
  [b.x0 + (c + 0.5) * b.cell, b.y0 + (r + 0.5) * b.cell];

export const boardPlans = (b: Board, shrink = 0) =>
  Array.from({ length: b.cols * b.rows }, (_, i) => cellPlan(b, i % b.cols, Math.floor(i / b.cols), shrink));

/** 由遠到近的繪製順序（畫家演算法：後畫的蓋住先畫的） */
export function drawOrder(b: Board, P: Projection) {
  const depth = (i: number) => {
    const [x, y] = cellCenter(b, i % b.cols, Math.floor(i / b.cols));
    return depthOf([x, y, 0], P);
  };
  return Array.from({ length: b.cols * b.rows }, (_, i) => i).sort((a, c) => depth(a) - depth(c));
}

export const columnPaths = (plan: Plan, z: number, h: number, P: Projection): SolidPaths =>
  slabOf(plan, z, Math.max(h, 0.05), P, 1);

/** 棋盤底座：四腳、厚板、內凹溝線 */
export function baseArt(plan: Plan, P: Projection, thick = 8, foot = 4) {
  const feet = corners(plan, 12).sort((a, c) => depthOf([a[0], a[1], 0], P) - depthOf([c[0], c[1], 0], P));
  return {
    halo: haloOf(plan, -thick - foot, thick + foot, P),
    feet: feet.map(([x, y]) => [cylinder(x, y, 6, -thick - foot, 1.4, P, 24), cylinder(x, y, 4.6, -thick - foot + 1.4, foot - 1.4, P, 24)]),
    slab: slabOf(plan, -thick, thick, P, 8, 1.4),
    groove: planOutline(insetPlan(plan, 4), 0, P),
    screws: corners(plan, 7).map(([x, y]) => ring(x, y, 1.6, 0, P, 14)).join(""),
  };
}
