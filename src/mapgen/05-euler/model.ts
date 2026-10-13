import { evenOut, hierholzer, oddNodes, degrees, type Edge } from "../lib/graph";
import { halls, leafList, tiles, W, H } from "../04-bsp/model";

export { W, H };
/** 第 04 章完成的地牢（含牆） */
export const dungeon = tiles(true, 0, true);

/** 節點 = 房間中心（格座標） */
export const rooms = leafList.map((l) => l.room!);
export const nodes = rooms.map((r) => [r.x + r.w / 2, r.y + r.h / 2] as [number, number]);
const N = nodes.length;
const idOf = (r: (typeof rooms)[number]) => rooms.indexOf(r);
const dist = (a: number, b: number) => Math.abs(nodes[a][0] - nodes[b][0]) + Math.abs(nodes[a][1] - nodes[b][1]);

/** 樹邊 = BSP 的走廊 */
export const treeEdges: Edge[] = halls.map((h) => {
  const a = idOf(h.from);
  const b = idOf(h.to);
  return { a, b, w: dist(a, b), kind: "tree" };
});

/* 補環路：由近到遠挑還沒相連的房間對，線段不能和既有的邊交叉、也不能太貼近別的房間 */
const cross = (p: number[], q: number[], r: number[], s: number[]) => {
  const o = (a: number[], b: number[], c: number[]) => Math.sign((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
  return o(p, q, r) * o(p, q, s) < 0 && o(r, s, p) * o(r, s, q) < 0;
};
const nearSeg = (p: number[], a: number[], b: number[]) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]);
};
const LOOPS = 4;
export const loopEdges: Edge[] = [];
{
  const has = (a: number, b: number, list: Edge[]) => list.some((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const pairs: [number, number][] = [];
  for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) pairs.push([a, b]);
  pairs.sort((p, q) => dist(p[0], p[1]) - dist(q[0], q[1]));
  for (const [a, b] of pairs) {
    if (loopEdges.length >= LOOPS) break;
    const all = [...treeEdges, ...loopEdges];
    if (has(a, b, all)) continue;
    const blocked = all.some((e) => e.a !== a && e.a !== b && e.b !== a && e.b !== b && cross(nodes[a], nodes[b], nodes[e.a], nodes[e.b]));
    const tooClose = nodes.some((p, k) => k !== a && k !== b && nearSeg(p, nodes[a], nodes[b]) < 3);
    if (!blocked && !tooClose) loopEdges.push({ a, b, w: dist(a, b), kind: "loop" });
  }
}

export const graphEdges = [...treeEdges, ...loopEdges];
export const odd = oddNodes(N, graphEdges);
export const even = evenOut(N, graphEdges);
export const fullEdges = [...graphEdges, ...even.dups];
export const START = 1;
export const euler = hierholzer(N, fullEdges, START);
export const degOf = (edges: Edge[]) => degrees(N, edges);
export const totalLength = (edges: Edge[]) => edges.reduce((a, e) => a + e.w, 0);
