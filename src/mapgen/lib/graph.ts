/** 無向多重圖：同一對節點之間可以有好幾條邊（重走的走廊就是複製一條邊） */
export type Edge = { a: number; b: number; w: number; kind: "tree" | "loop" | "dup" };

export const other = (e: Edge, n: number) => (e.a === n ? e.b : e.a);

export function degrees(n: number, edges: Edge[]) {
  const d = new Array<number>(n).fill(0);
  for (const e of edges) { d[e.a]++; d[e.b]++; }
  return d;
}

export const oddNodes = (n: number, edges: Edge[]) => degrees(n, edges).flatMap((d, i) => (d % 2 ? [i] : []));

/** Dijkstra：回傳 s → t 的最短路（邊索引）與距離 */
export function shortestPath(n: number, edges: Edge[], s: number, t: number) {
  const dist = new Array<number>(n).fill(Infinity);
  const via = new Array<number>(n).fill(-1);
  const done = new Array<boolean>(n).fill(false);
  dist[s] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break;
    done[u] = true;
    edges.forEach((e, k) => {
      if (e.a !== u && e.b !== u) return;
      const v = other(e, u);
      if (dist[u] + e.w < dist[v]) { dist[v] = dist[u] + e.w; via[v] = k; }
    });
  }
  const path: number[] = [];
  for (let v = t; v !== s; ) {
    const k = via[v];
    if (k < 0) break;
    path.unshift(k);
    v = other(edges[k], v);
  }
  return { path, dist: dist[t] };
}

/**
 * 中國郵差問題的簡化版：奇數度節點兩兩配對（貪婪：每次挑最近的一對），
 * 把配對之間的最短路複製一份。之後每個節點都是偶數度。
 */
export function evenOut(n: number, edges: Edge[]) {
  const odd = new Set(oddNodes(n, edges));
  const pairs: { s: number; t: number; path: number[] }[] = [];
  while (odd.size) {
    let best: { s: number; t: number; path: number[]; dist: number } | null = null;
    const list = [...odd];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const r = shortestPath(n, edges, list[i], list[j]);
      if (!best || r.dist < best.dist) best = { s: list[i], t: list[j], ...r };
    }
    pairs.push(best!);
    odd.delete(best!.s);
    odd.delete(best!.t);
  }
  const dups: Edge[] = pairs.flatMap((p) => p.path.map((k) => ({ ...edges[k], kind: "dup" as const })));
  return { pairs, dups };
}

/**
 * Hierholzer：從起點一路走到卡住（在偶數度的圖裡，只會卡在起點），得到一個迴圈；
 * 再從迴圈上還有未走邊的節點出發繞一圈，把小迴圈接進大迴圈；重複到邊用完。
 * 走的時候每次挑最短的未走邊；挑哪條都正確，只影響繞圈的順序。
 * 回傳每一圈（依發現順序）與最後的完整回路（節點序列 + 邊序列）。
 */
export function hierholzer(n: number, edges: Edge[], start: number) {
  const used = new Array<boolean>(edges.length).fill(false);
  const adj: number[][] = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => { adj[e.a].push(k); adj[e.b].push(k); });
  const nextUnused = (v: number) => {
    let best: number | undefined;
    for (const k of adj[v]) if (!used[k] && (best === undefined || edges[k].w < edges[best].w)) best = k;
    return best;
  };

  const walk = (from: number) => {
    const nodes = [from];
    const es: number[] = [];
    let cur = from;
    for (let k = nextUnused(cur); k !== undefined; k = nextUnused(cur)) {
      used[k] = true;
      es.push(k);
      cur = other(edges[k], cur);
      nodes.push(cur);
    }
    return { nodes, edges: es };
  };

  const loops: { from: number; edges: number[]; nodes: number[] }[] = [];
  const first = walk(start);
  loops.push({ from: start, ...first });
  let nodes = first.nodes;
  let es = first.edges;
  for (;;) {
    const p = nodes.findIndex((v) => nextUnused(v) !== undefined);
    if (p < 0) break;
    const sub = walk(nodes[p]);
    loops.push({ from: nodes[p], ...sub });
    nodes = [...nodes.slice(0, p), ...sub.nodes, ...nodes.slice(p + 1)];
    es = [...es.slice(0, p), ...sub.edges, ...es.slice(p)];
  }
  return { loops, nodes, edges: es };
}
