/** 地圖 = 一維陣列 + 寬高，第 (x, y) 格在 cells[y * w + x] */
export type Grid = { w: number; h: number; cells: number[] };

export const makeGrid = (w: number, h: number, fill: (x: number, y: number) => number): Grid => ({
  w,
  h,
  cells: Array.from({ length: w * h }, (_, i) => fill(i % w, Math.floor(i / w))),
});

export const inside = (g: Grid, x: number, y: number) => x >= 0 && y >= 0 && x < g.w && y < g.h;
export const get = (g: Grid, x: number, y: number, outside = 1) => (inside(g, x, y) ? g.cells[y * g.w + x] : outside);

export const N4: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const N8: [number, number][] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

/**
 * 把值等於 want 的格子依 4 鄰連通分成區塊（flood fill / BFS）。
 * 回傳每格所屬區塊編號（-1 = 不屬於任何區塊）與各區塊的格子清單。
 */
export function regions(g: Grid, want: number) {
  const label = new Array<number>(g.cells.length).fill(-1);
  const list: number[][] = [];
  for (let start = 0; start < g.cells.length; start++) {
    if (g.cells[start] !== want || label[start] >= 0) continue;
    const id = list.length;
    const cells: number[] = [];
    const queue = [start];
    label[start] = id;
    while (queue.length) {
      const i = queue.shift()!;
      cells.push(i);
      const x = i % g.w;
      const y = Math.floor(i / g.w);
      for (const [dx, dy] of N4) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(g, nx, ny)) continue;
        const j = ny * g.w + nx;
        if (g.cells[j] === want && label[j] < 0) {
          label[j] = id;
          queue.push(j);
        }
      }
    }
    list.push(cells);
  }
  return { label, list };
}

/** 文字版地圖（狀態面板用） */
export const toRows = (g: Grid, char: (v: number, x: number, y: number) => string) =>
  Array.from({ length: g.h }, (_, y) => Array.from({ length: g.w }, (_, x) => char(g.cells[y * g.w + x], x, y)).join(""));
