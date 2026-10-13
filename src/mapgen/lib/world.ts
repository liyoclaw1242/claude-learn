import { leaves, split, type BspNode } from "./bsp";
import { caStep } from "./ca";
import type { Grid } from "./grid";
import { evenOut, hierholzer, type Edge } from "./graph";
import { fbm } from "./noise";
import { mulberry32 } from "./rng";
import { runWfc, type Tile } from "./wfc";

/**
 * 第 07 章的整條管線：一顆種子 → 地形 → 森林 → 據點 → 道路 → 巡迴路線 → 城鎮街道。
 * 每一層只用前面幾章的函式，而且各層用自己的亂數流（種子分流，見第 01 章）。
 */
export const WW = 40;
export const WH = 28;
export const SEA = 0.4;
export const ROCK = 0.78;

export type World = ReturnType<typeof buildWorld>;

const STREET_TILES: (Tile & { glyph: string })[] = [
  { name: "空地", glyph: "·", sockets: [0, 0, 0, 0], weight: 2.2 },
  { name: "直", glyph: "│", sockets: [1, 0, 1, 0], weight: 1.4 },
  { name: "橫", glyph: "─", sockets: [0, 1, 0, 1], weight: 1.4 },
  { name: "彎", glyph: "└", sockets: [1, 1, 0, 0], weight: 0.8 },
  { name: "彎", glyph: "┌", sockets: [0, 1, 1, 0], weight: 0.8 },
  { name: "彎", glyph: "┐", sockets: [0, 0, 1, 1], weight: 0.8 },
  { name: "彎", glyph: "┘", sockets: [1, 0, 0, 1], weight: 0.8 },
  { name: "丁", glyph: "┬", sockets: [0, 1, 1, 1], weight: 0.6 },
  { name: "丁", glyph: "┤", sockets: [1, 0, 1, 1], weight: 0.6 },
  { name: "丁", glyph: "┴", sockets: [1, 1, 0, 1], weight: 0.6 },
  { name: "丁", glyph: "├", sockets: [1, 1, 1, 0], weight: 0.6 },
  { name: "十", glyph: "┼", sockets: [1, 1, 1, 1], weight: 0.4 },
  { name: "端", glyph: "╵", sockets: [1, 0, 0, 0], weight: 0.25 },
  { name: "端", glyph: "╶", sockets: [0, 1, 0, 0], weight: 0.25 },
  { name: "端", glyph: "╷", sockets: [0, 0, 1, 0], weight: 0.25 },
  { name: "端", glyph: "╴", sockets: [0, 0, 0, 1], weight: 0.25 },
];
/** 街道拼塊包含全部 16 種接口組合（含十字與盡頭），所以永遠不會矛盾 */
export { STREET_TILES };

export function buildWorld(seed: number) {
  const N = WW * WH;
  const xOf = (i: number) => i % WW;
  const yOf = (i: number) => Math.floor(i / WW);

  /* 1. 地形：fBm + 島嶼遮罩（第 03 章） */
  const raw = Array.from({ length: N }, (_, i) => {
    const x = xOf(i);
    const y = yOf(i);
    const e = fbm((x + 0.5) / 9, (y + 0.5) / 9, seed, 4);
    const nx = (2 * (x + 0.5)) / WW - 1;
    const ny = (2 * (y + 0.5)) / WH - 1;
    const d = 1 - (1 - nx * nx) * (1 - ny * ny);
    return e * 0.5 + (1 - d) * 0.5;
  });
  const lo = Math.min(...raw);
  const hi = Math.max(...raw);
  const elev = raw.map((v) => (v - lo) / (hi - lo));
  const land = elev.map((e) => e >= SEA);
  const grass = elev.map((e) => e >= 0.47 && e < ROCK);

  /* 2. 森林：草地上撒 55% 的樹，跑 3 輪 4-5 規則（第 02 章），只在草地上生效 */
  const forestRng = mulberry32(seed ^ 0x1f123bb5);
  let f: Grid = { w: WW, h: WH, cells: grass.map((g) => (g && forestRng() < 0.55 ? 1 : 0)) };
  for (let k = 0; k < 3; k++) {
    const n = caStep(f);
    f = { ...n, cells: n.cells.map((v, i) => (grass[i] ? v : 0)) };
  }
  const forest = f.cells.map((v) => v === 1);

  /* 3. 據點：BSP 分區（第 04 章），每片葉子挑最靠近中心的空曠陸地 */
  const bspRng = mulberry32(seed ^ 0x5bd1e995);
  const root: BspNode = { id: "", depth: 0, x: 0, y: 0, w: WW, h: WH };
  split(root, bspRng, { minLeaf: 8, maxDepth: 3 });
  const zones = leaves(root);
  const towns: { cell: number; zone: number }[] = [];
  zones.forEach((z, k) => {
    const cx = z.x + z.w / 2;
    const cy = z.y + z.h / 2;
    let best = -1;
    let bestD = Infinity;
    for (let y = z.y + 1; y < z.y + z.h - 1; y++) for (let x = z.x + 1; x < z.x + z.w - 1; x++) {
      const i = y * WW + x;
      if (!land[i] || forest[i] || elev[i] > ROCK) continue;
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) towns.push({ cell: best, zone: k });
  });
  const pos = towns.map((t) => [xOf(t.cell) + 0.5, yOf(t.cell) + 0.5]);
  const dist = (a: number, b: number) => Math.hypot(pos[a][0] - pos[b][0], pos[a][1] - pos[b][1]);

  /* 4. 道路：最小生成樹（Prim）+ 2 條最短的額外邊造環（第 05 章） */
  const T = towns.length;
  const inTree = new Set([0]);
  const roads: Edge[] = [];
  while (inTree.size < T) {
    let best: [number, number] | null = null;
    for (const a of inTree) for (let b = 0; b < T; b++) {
      if (inTree.has(b)) continue;
      if (!best || dist(a, b) < dist(best[0], best[1])) best = [a, b];
    }
    roads.push({ a: best![0], b: best![1], w: dist(best![0], best![1]), kind: "tree" });
    inTree.add(best![1]);
  }
  const has = (a: number, b: number) => roads.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const extra: [number, number][] = [];
  for (let a = 0; a < T; a++) for (let b = a + 1; b < T; b++) if (!has(a, b)) extra.push([a, b]);
  extra.sort((p, q) => dist(p[0], p[1]) - dist(q[0], q[1]));
  for (const [a, b] of extra.slice(0, 2)) roads.push({ a, b, w: dist(a, b), kind: "loop" });

  /* 5. 巡迴路線：奇點配對 + Hierholzer（第 05 章） */
  const even = evenOut(T, roads);
  const allRoads = [...roads, ...even.dups];
  /* 首都：周圍 7 × 5 格裡陸地最多的據點 */
  const SW = 7;
  const SH = 5;
  const windowOf = (cell: number) => {
    const sx = Math.max(0, Math.min(WW - SW, xOf(cell) - 3));
    const sy = Math.max(0, Math.min(WH - SH, yOf(cell) - 2));
    return { sx, sy };
  };
  const landIn = (cell: number) => {
    const { sx, sy } = windowOf(cell);
    let n = 0;
    for (let y = sy; y < sy + SH; y++) for (let x = sx; x < sx + SW; x++) n += land[y * WW + x] && elev[y * WW + x] <= ROCK ? 1 : 0;
    return n;
  };
  const capital = towns.reduce((best, t, k) => (landIn(t.cell) > landIn(towns[best].cell) ? k : best), 0);
  const tour = hierholzer(T, allRoads, capital);

  /* 6. 城鎮街道：首都周圍 7 × 5 格跑 WFC（第 06 章）；海和岩山的格子預先限定為空地 */
  const { sx, sy } = windowOf(towns[capital].cell);
  const buildable = (k: number) => {
    const i = (sy + Math.floor(k / SW)) * WW + sx + (k % SW);
    return land[i] && elev[i] <= ROCK;
  };
  let streets: number[] = [];
  for (let attempt = 0; attempt < 20 && !streets.length; attempt++) {
    const r = runWfc(SW, SH, STREET_TILES, mulberry32((seed ^ 0x2545f491) + attempt), (k) => (buildable(k) ? undefined : [0]));
    if (r.ok) streets = r.history[r.history.length - 1].domains.map((d) => d[0]);
  }
  const streetCells = streets.map((_, k) => (sy + Math.floor(k / SW)) * WW + sx + (k % SW));

  return { seed, elev, land, forest, zones, towns, roads, dups: even.dups, allRoads, tour, capital, streets, streetCells, street: { sx, sy, SW, SH } };
}
