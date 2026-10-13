import { mulberry32 } from "../lib/rng";
import { makeGrid, type Grid } from "../lib/grid";

export const W = 16;
export const H = 12;

/** 手畫的小地圖：外牆 + 一個有門的房間 */
const HAND = [
  "################",
  "#..............#",
  "#..............#",
  "#....######....#",
  "#....#....#....#",
  "#....#....#....#",
  "#.........#....#",
  "#....######....#",
  "#..............#",
  "#..............#",
  "#..............#",
  "################",
];
export const handMap: Grid = makeGrid(W, H, (x, y) => (HAND[y][x] === "#" ? 1 : 0));

export const emptyMap: Grid = makeGrid(W, H, () => 0);

/** 白噪聲牆：每格獨立擲一次骰子，小於 p 就是牆 */
export const noiseWalls = (rand: () => number, p = 0.45): Grid => makeGrid(W, H, () => (rand() < p ? 1 : 0));

/** 有種子的版本：同一顆種子 → 同一張圖 */
export const seededWalls = (seed: number, p = 0.45) => noiseWalls(mulberry32(seed), p);

/** 連續值：每格一個 0–1 的亂數（白噪聲高度場） */
export const seededHeights = (seed: number): Grid => {
  const rand = mulberry32(seed);
  return makeGrid(W, H, () => rand());
};

/** 頁面載入時用 Math.random 產生一次：每次重新整理都不同 */
export const unseeded = noiseWalls(Math.random);

/** 和右鄰或下鄰的落差超過 limit 的格子 */
export function jumps(g: Grid, limit: number) {
  const out = new Set<number>();
  for (let y = 0; y < g.h; y++) {
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (x + 1 < g.w && Math.abs(g.cells[i] - g.cells[i + 1]) > limit) { out.add(i); out.add(i + 1); }
      if (y + 1 < g.h && Math.abs(g.cells[i] - g.cells[i + g.w]) > limit) { out.add(i); out.add(i + g.w); }
    }
  }
  return out;
}
