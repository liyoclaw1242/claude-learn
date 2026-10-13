import { get, regions, type Grid } from "./grid";
import type { Rng } from "./rng";

/** 初始狀態：每格以機率 fill 成為牆（1） */
export const randomFill = (w: number, h: number, rand: Rng, fill: number): Grid =>
  ({ w, h, cells: Array.from({ length: w * h }, () => (rand() < fill ? 1 : 0)) });

/** 3×3 範圍內（含自己）的牆數；地圖外算牆，所以邊緣會自然長出外牆 */
export function wallsAround(g: Grid, x: number, y: number) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) n += get(g, x + dx, y + dy, 1);
  return n;
}

/**
 * 4-5 規則：3×3 內牆數 ≥ 5 → 牆，否則地板。
 * 等價說法：原本是牆、8 鄰有 ≥ 4 道牆就留著；原本是地板、8 鄰有 ≥ 5 道牆就變牆。
 * 同步更新：全部依「上一輪」的狀態計算，寫進新陣列。
 */
export function caStep(g: Grid, threshold = 5): Grid {
  const cells = g.cells.map((_, i) => (wallsAround(g, i % g.w, Math.floor(i / g.w)) >= threshold ? 1 : 0));
  return { w: g.w, h: g.h, cells };
}

/** 錯誤示範：原地更新，掃描到後面時讀到的是「已經改過」的鄰居 */
export function caStepInPlace(g: Grid, threshold = 5): Grid {
  const out: Grid = { w: g.w, h: g.h, cells: [...g.cells] };
  for (let i = 0; i < out.cells.length; i++) {
    out.cells[i] = wallsAround(out, i % g.w, Math.floor(i / g.w)) >= threshold ? 1 : 0;
  }
  return out;
}

export const changedCells = (a: Grid, b: Grid) => a.cells.flatMap((v, i) => (v !== b.cells[i] ? [i] : []));

/** 只保留最大的地板區塊，其他區塊填成牆 */
export function keepLargest(g: Grid) {
  const { list } = regions(g, 0);
  const largest = list.reduce((best, r) => (r.length > best.length ? r : best), [] as number[]);
  const keep = new Set(largest);
  return { grid: { ...g, cells: g.cells.map((v, i) => (v === 0 && !keep.has(i) ? 1 : v)) }, regions: list, largest };
}
