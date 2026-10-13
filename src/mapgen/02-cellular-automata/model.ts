import { caStep, caStepInPlace, changedCells, keepLargest, randomFill, wallsAround } from "../lib/ca";
import { regions, type Grid } from "../lib/grid";
import { mulberry32 } from "../lib/rng";

export const W = 30;
export const H = 20;
export const SEED = 3;
export const FILL = 0.45;

export const start = randomFill(W, H, mulberry32(SEED), FILL);

/** 同步更新的每一輪（rounds[0] = 初始） */
export const rounds: Grid[] = [start];
for (let k = 0; k < 4; k++) rounds.push(caStep(rounds[k]));
export const changes = rounds.slice(1).map((g, k) => changedCells(rounds[k], g));

/** 原地更新 4 輪（錯誤示範） */
let ip = start;
for (let k = 0; k < 4; k++) ip = caStepInPlace(ip);
export const inPlace = ip;
export const inPlaceDiff = changedCells(rounds[4], inPlace);

/** 同一顆種子、牆密度 52% */
let dense = randomFill(W, H, mulberry32(SEED), 0.52);
for (let k = 0; k < 4; k++) dense = caStep(dense);
export const denseCave = dense;
export const denseRegions = regions(dense, 0).list;

export const cave = rounds[4];
export const caveRegions = regions(cave, 0);
export const final = keepLargest(cave);

/** 示範用的兩格：第 1 輪中「地板 → 牆」與「牆 → 地板」，各挑最靠近中央的一格 */
function pick(from: number, to: number) {
  const c = changes[0].filter((i) => start.cells[i] === from && rounds[1].cells[i] === to);
  const dist = (i: number) => Math.abs((i % W) - W / 2 + 4) + Math.abs(Math.floor(i / W) - H / 2);
  return c.sort((a, b) => dist(a) - dist(b))[0];
}
export const LENS_A = pick(0, 1);
export const LENS_B = pick(1, 0);
export const countAt = (g: Grid, i: number) => wallsAround(g, i % W, Math.floor(i / W));
