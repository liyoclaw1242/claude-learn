import { corridors, internals, leaves, placeRooms, split, type BspNode } from "../lib/bsp";
import { mulberry32 } from "../lib/rng";

export const W = 40;
export const H = 28;
export const SEED = 3;
export const MIN_LEAF = 7;
export const MAX_DEPTH = 4;
export const MIN_ROOM = 4;

const rng = mulberry32(SEED);
export const root: BspNode = { id: "", depth: 0, x: 0, y: 0, w: W, h: H };
split(root, rng, { minLeaf: MIN_LEAF, maxDepth: MAX_DEPTH });
placeRooms(root, rng, MIN_ROOM);
export const halls = corridors(root, rng);
export const cuts = internals(root);
export const leafList = leaves(root);

export const ROCK = 0;
export const ROOM = 1;
export const HALL = 2;
export const WALL = 3;

/** 依進度組出地圖：rooms = 是否放房間；hallDepth = 接到哪一層（內部節點深度 ≥ 這個值的走廊才接） */
export function tiles(rooms: boolean, hallDepth: number | null, walls: boolean) {
  const t = new Array<number>(W * H).fill(ROCK);
  if (hallDepth !== null) {
    for (const hall of halls) if (hall.node.depth >= hallDepth) for (const [x, y] of hall.cells) t[y * W + x] = HALL;
  }
  if (rooms) {
    for (const leaf of leafList) {
      const r = leaf.room!;
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) t[y * W + x] = ROOM;
    }
  }
  if (walls) {
    const floor = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && (t[y * W + x] === ROOM || t[y * W + x] === HALL);
    for (let i = 0; i < t.length; i++) {
      if (t[i] !== ROCK) continue;
      const x = i % W;
      const y = Math.floor(i / W);
      let touch = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) touch ||= floor(x + dx, y + dy);
      if (touch) t[i] = WALL;
    }
  }
  return t;
}

/** 某一層新接上的走廊格 */
export const hallCells = (depths: number[]) => {
  const set = new Set<number>();
  for (const hall of halls) if (depths.includes(hall.node.depth)) for (const [x, y] of hall.cells) set.add(y * W + x);
  return set;
};
