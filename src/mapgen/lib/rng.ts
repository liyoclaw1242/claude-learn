/**
 * 可重現的亂數：同一顆種子永遠得到同一串數字。
 * mulberry32 是 32 位元狀態的小型 PRNG，夠快、分布夠均勻，適合遊戲與教學用。
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = () => number;

/** [lo, hi) 之間的整數 */
export const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo));

/** 依權重抽一個索引 */
export function pickWeighted(rng: Rng, weights: number[]) {
  const total = weights.reduce((a, w) => a + w, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1;
}
