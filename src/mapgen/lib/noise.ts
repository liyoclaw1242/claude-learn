/** 座標雜湊：每個 (x, y, seed) 對應一個固定的 0–1 亂數，與呼叫順序無關 */
export function hash2(x: number, y: number, seed: number) {
  let h = seed ^ Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Perlin 2002 年改良版的緩和曲線 6t⁵ − 15t⁴ + 10t³：兩端的一階、二階導數都是 0 */
export const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Value noise：晶格點上放亂數值，中間用 interp 內插（linear 或 fade） */
export function valueNoise(x: number, y: number, seed: number, smooth: boolean) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smooth ? fade(x - x0) : x - x0;
  const ty = smooth ? fade(y - y0) : y - y0;
  const v = (ix: number, iy: number) => hash2(ix, iy, seed);
  return lerp(lerp(v(x0, y0), v(x0 + 1, y0), tx), lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), tx), ty);
}

/** 晶格點 (ix, iy) 上的單位梯度向量 */
export function gradient(ix: number, iy: number, seed: number): [number, number] {
  const a = hash2(ix, iy, seed ^ 0x5bd1e995) * Math.PI * 2;
  return [Math.cos(a), Math.sin(a)];
}

/**
 * Perlin（梯度）噪聲：四個角各自用「梯度 · 指向這點的偏移向量」算出一個值，再用 fade 內插。
 * 晶格點上的值恆為 0，起伏出現在晶格點之間。回傳約 −0.7 ~ 0.7。
 */
export function perlin(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const corner = (ix: number, iy: number) => {
    const [gx, gy] = gradient(x0 + ix, y0 + iy, seed);
    return gx * (fx - ix) + gy * (fy - iy);
  };
  const u = fade(fx);
  const v = fade(fy);
  return lerp(lerp(corner(0, 0), corner(1, 0), u), lerp(corner(0, 1), corner(1, 1), u), v);
}

/** 把 perlin 的輸出攤到 0–1 */
export const perlin01 = (x: number, y: number, seed: number) => Math.min(1, Math.max(0, perlin(x, y, seed) / Math.SQRT2 + 0.5));

/**
 * 分形布朗運動（fBm）：疊加多個八度，每一層頻率 × lacunarity、振幅 × gain。
 * 回傳 0–1。
 */
export function fbm(x: number, y: number, seed: number, octaves: number, lacunarity = 2, gain = 0.5) {
  let sum = 0;
  let amp = 1;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += perlin(x * freq, y * freq, seed + o * 101) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return Math.min(1, Math.max(0, (sum / norm) / Math.SQRT2 + 0.5));
}
