import { randInt, type Rng } from "./rng";

export type Rect = { x: number; y: number; w: number; h: number };
export type BspNode = Rect & {
  id: string;
  depth: number;
  /** 切割：v = 直刀（左右分），h = 橫刀（上下分）；at = 刀口的絕對座標 */
  split?: { dir: "v" | "h"; at: number };
  kids?: [BspNode, BspNode];
  room?: Rect;
};

export type BspOptions = { minLeaf: number; maxDepth: number };

/**
 * 遞迴切割：長邊明顯較長就沿長邊切，否則隨機；刀口落在 35%–65% 之間，
 * 兩邊都必須 ≥ minLeaf，切不下去就成為葉子。
 */
export function split(node: BspNode, rng: Rng, opt: BspOptions) {
  if (node.depth >= opt.maxDepth) return;
  const dir = node.w > node.h * 1.25 ? "v" : node.h > node.w * 1.25 ? "h" : rng() < 0.5 ? "v" : "h";
  const len = dir === "v" ? node.w : node.h;
  const lo = Math.max(opt.minLeaf, Math.ceil(len * 0.35));
  const hi = Math.min(len - opt.minLeaf, Math.floor(len * 0.65));
  if (lo > hi) return;
  const cut = randInt(rng, lo, hi + 1);
  const d = node.depth + 1;
  const a: BspNode = dir === "v"
    ? { id: node.id + "0", depth: d, x: node.x, y: node.y, w: cut, h: node.h }
    : { id: node.id + "0", depth: d, x: node.x, y: node.y, w: node.w, h: cut };
  const b: BspNode = dir === "v"
    ? { id: node.id + "1", depth: d, x: node.x + cut, y: node.y, w: node.w - cut, h: node.h }
    : { id: node.id + "1", depth: d, x: node.x, y: node.y + cut, w: node.w, h: node.h - cut };
  node.split = { dir, at: dir === "v" ? node.x + cut : node.y + cut };
  node.kids = [a, b];
  split(a, rng, opt);
  split(b, rng, opt);
}

export const leaves = (n: BspNode): BspNode[] => (n.kids ? [...leaves(n.kids[0]), ...leaves(n.kids[1])] : [n]);
export const internals = (n: BspNode): BspNode[] => (n.kids ? [n, ...internals(n.kids[0]), ...internals(n.kids[1])] : []);

/** 每片葉子裡放一間房：四周至少留 1 格，大小在 [minRoom, 可用空間] 之間隨機 */
export function placeRooms(root: BspNode, rng: Rng, minRoom: number) {
  for (const leaf of leaves(root)) {
    const maxW = leaf.w - 2;
    const maxH = leaf.h - 2;
    const w = randInt(rng, Math.min(minRoom, maxW), maxW + 1);
    const h = randInt(rng, Math.min(minRoom, maxH), maxH + 1);
    const x = leaf.x + 1 + randInt(rng, 0, maxW - w + 1);
    const y = leaf.y + 1 + randInt(rng, 0, maxH - h + 1);
    leaf.room = { x, y, w, h };
  }
}

const center = (r: Rect): [number, number] => [Math.floor(r.x + r.w / 2), Math.floor(r.y + r.h / 2)];

/**
 * 每個內部節點接一條走廊：從左子樹挑一間、右子樹挑一間（中心最近的一對），走 L 形。
 * 由下往上接完，整棵樹的房間必定全部連通，而且沒有環。
 */
export function corridors(root: BspNode, rng: Rng) {
  const out: { node: BspNode; cells: [number, number][]; from: Rect; to: Rect }[] = [];
  for (const node of internals(root)) {
    const [a, b] = node.kids!;
    let best: [Rect, Rect] | null = null;
    let bestD = Infinity;
    for (const la of leaves(a)) for (const lb of leaves(b)) {
      const [ax, ay] = center(la.room!);
      const [bx, by] = center(lb.room!);
      const d = Math.abs(ax - bx) + Math.abs(ay - by);
      if (d < bestD) { bestD = d; best = [la.room!, lb.room!]; }
    }
    const [ra, rb] = best!;
    const [ax, ay] = center(ra);
    const [bx, by] = center(rb);
    const cells: [number, number][] = [];
    const horizontalFirst = rng() < 0.5;
    const hLine = (y: number, x0: number, x1: number) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) cells.push([x, y]); };
    const vLine = (x: number, y0: number, y1: number) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) cells.push([x, y]); };
    if (horizontalFirst) { hLine(ay, ax, bx); vLine(bx, ay, by); } else { vLine(ax, ay, by); hLine(by, ax, bx); }
    out.push({ node, cells, from: ra, to: rb });
  }
  return out;
}
