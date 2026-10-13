import { pickWeighted, type Rng } from "./rng";

/** 拼塊：四邊的接口（上、右、下、左），1 = 有路、0 = 沒路；相鄰兩格接觸的那一邊必須相同 */
export type Tile = { name: string; sockets: [number, number, number, number]; weight: number };

export const DIRS: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const OPP = [2, 3, 0, 1];

export type Snapshot = {
  /** 每格剩下的候選拼塊 */
  domains: number[][];
  /** 這一步被塌縮的格子 */
  collapsed?: number;
  /** 這一步被傳播影響（候選變少）的格子，依發生順序 */
  ripple: number[];
  /** 候選變成 0 的格子 */
  contradiction?: number;
};

/** 加權的 Shannon 熵：候選越多、權重越平均，熵越高 */
export function entropy(tiles: Tile[], domain: number[]) {
  const sum = domain.reduce((a, t) => a + tiles[t].weight, 0);
  const sl = domain.reduce((a, t) => a + tiles[t].weight * Math.log(tiles[t].weight), 0);
  return Math.log(sum) - sl / sum;
}

/** 由規則推出：拼塊 a 的 d 方向，可以接哪些拼塊 */
export const compatible = (tiles: Tile[]) =>
  tiles.map((a) => DIRS.map((_, d) => tiles.flatMap((b, j) => (a.sockets[d] === b.sockets[OPP[d]] ? [j] : []))));

/**
 * 跑一次 WFC，記錄每一步的快照。
 * 每輪：挑熵最小的格子（同分用亂數打破平手）→ 依權重塌縮成一種拼塊 → 傳播（AC-3）。
 * 地圖外視為「沒路」，所以邊緣的格子不會有通向界外的路。
 */
export function runWfc(w: number, h: number, tiles: Tile[], rng: Rng, preset?: (i: number) => number[] | undefined) {
  const rules = compatible(tiles);
  // preset：某些格子一開始就限定候選（例如非陸地只能是空地）
  const domains: number[][] = Array.from({ length: w * h }, (_, i) => preset?.(i) ?? tiles.map((_, k) => k));
  const history: Snapshot[] = [];
  const copy = () => domains.map((d) => [...d]);

  /** 傳播：佇列裡的格子候選變少了，檢查它的四鄰還剩哪些候選有可能 */
  const propagate = (queue: number[], ripple: number[]) => {
    while (queue.length) {
      const i = queue.shift()!;
      const x = i % w;
      const y = Math.floor(i / w);
      for (let d = 0; d < 4; d++) {
        const nx = x + DIRS[d][0];
        const ny = y + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        const allowed = new Set(domains[i].flatMap((t) => rules[t][d]));
        const next = domains[j].filter((t) => allowed.has(t));
        if (next.length === domains[j].length) continue;
        domains[j] = next;
        ripple.push(j);
        if (!next.length) return j;
        queue.push(j);
      }
    }
    return undefined;
  };

  // 邊界：界外沒有路
  {
    const ripple: number[] = [];
    for (let i = 0; i < w * h; i++) {
      const x = i % w;
      const y = Math.floor(i / w);
      const before = domains[i].length;
      domains[i] = domains[i].filter((t) => {
        const s = tiles[t].sockets;
        return !((y === 0 && s[0]) || (x === w - 1 && s[1]) || (y === h - 1 && s[2]) || (x === 0 && s[3]));
      });
      if (domains[i].length !== before) ripple.push(i);
    }
    propagate([...ripple], ripple);
    history.push({ domains: copy(), ripple });
  }

  for (;;) {
    let best = -1;
    let bestH = Infinity;
    for (let i = 0; i < w * h; i++) {
      if (domains[i].length <= 1) continue;
      const e = entropy(tiles, domains[i]) + rng() * 1e-3;
      if (e < bestH) { bestH = e; best = i; }
    }
    if (best < 0) break;
    const pick = domains[best][pickWeighted(rng, domains[best].map((t) => tiles[t].weight))];
    domains[best] = [pick];
    const ripple: number[] = [];
    const bad = propagate([best], ripple);
    history.push({ domains: copy(), collapsed: best, ripple, contradiction: bad });
    if (bad !== undefined) return { history, ok: false };
  }
  return { history, ok: true };
}
