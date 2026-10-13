import { fbm, gradient, hash2, perlin01, valueNoise } from "../lib/noise";

export const W = 28;
export const H = 21;
/** 晶格間距（格）：每 7 格一個晶格點 */
export const S = 7;
export const SEED = 4;
export const LX = W / S + 1;
export const LY = H / S + 1;

const sample = (f: (x: number, y: number) => number) =>
  Array.from({ length: W * H }, (_, i) => f((i % W + 0.5) / S, (Math.floor(i / W) + 0.5) / S));

/** 拉伸到 0–1（只為了讓起伏在圖上看得清楚） */
function stretch(v: number[]) {
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  return v.map((x) => (x - lo) / (hi - lo));
}

export const white = Array.from({ length: W * H }, (_, i) => hash2(i % W, Math.floor(i / W), SEED));
export const lattice = Array.from({ length: LX * LY }, (_, i) => hash2(i % LX, Math.floor(i / LX), SEED));
export const valueLinear = sample((x, y) => valueNoise(x, y, SEED, false));
export const valueSmooth = sample((x, y) => valueNoise(x, y, SEED, true));
export const grads = Array.from({ length: LX * LY }, (_, i) => gradient(i % LX, Math.floor(i / LX), SEED));
export const perlin1 = stretch(sample((x, y) => perlin01(x, y, SEED)));
export const fbm2 = stretch(sample((x, y) => fbm(x, y, SEED, 2)));
export const fbm4 = stretch(sample((x, y) => fbm(x, y, SEED, 4)));

/** 島嶼遮罩（Red Blob Games 的 square bump）：中心 0、邊緣 1 */
export const islandDist = (x: number, y: number) => {
  const nx = (2 * (x + 0.5)) / W - 1;
  const ny = (2 * (y + 0.5)) / H - 1;
  return 1 - (1 - nx * nx) * (1 - ny * ny);
};
export const island = stretch(fbm4.map((e, i) => e * 0.5 + (1 - islandDist(i % W, Math.floor(i / W))) * 0.5));

export type Biome = "water" | "sand" | "grass" | "rock";
export const SEA = 0.38;
export const biomeOf = (e: number): Biome => (e < SEA ? "water" : e < 0.46 ? "sand" : e < 0.72 ? "grass" : "rock");
