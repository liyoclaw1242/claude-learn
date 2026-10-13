import ChapterStage from "../../components/ChapterStage";
import { GridText, Stats } from "../shared/Panel";
import { toRows } from "../lib/grid";
import CaveFigure from "./figure/Figure";
import Article from "./Article";
import { W, countAt } from "./model";
import { steps, type Step } from "./steps";

const RULE = `const n = wallsAround(g, x, y);  // 3×3，含自己
next[i] = n >= 5 ? 1 : 0;`;

const CODE: string[] = [
  `const rand = mulberry32(3);
cells[i] = rand() < 0.45 ? 1 : 0;`,
  `function wallsAround(g, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      n += get(g, x + dx, y + dy, 1); // 界外 = 牆
  return n;
}`,
  RULE,
  `function caStep(g) {
  const next = new Array(g.cells.length);
  for (let i = 0; i < next.length; i++) {
    const n = wallsAround(g, i % g.w, (i / g.w) | 0);
    next[i] = n >= 5 ? 1 : 0;   // 讀 g，寫 next
  }
  return { ...g, cells: next };
}`,
  `for (let k = 0; k < 4; k++) g = caStep(g);`,
  `for (let k = 0; k < 4; k++) g = caStep(g);`,
  `// ✗ 邊讀邊寫：左鄰、上鄰已經是新值
for (let i = 0; i < g.cells.length; i++)
  g.cells[i] = wallsAround(g, i % W, (i / W) | 0) >= 5 ? 1 : 0;`,
  `randomFill(W, H, mulberry32(3), 0.52);`,
  `function floodFill(g, start, label, id) {
  const queue = [start];
  label[start] = id;
  while (queue.length) {
    const i = queue.shift();
    for (const j of neighbors4(i))
      if (g.cells[j] === 0 && label[j] < 0) {
        label[j] = id;
        queue.push(j);
      }
  }
}`,
  `const keep = new Set(largestRegion);
cells = cells.map((v, i) =>
  v === 0 && !keep.has(i) ? 1 : v);`,
];

function StatePanel({ step }: { step: Step }) {
  const i = steps.indexOf(step);
  const lit = new Set(step.lit ?? []);
  const red = new Set(step.red ?? []);
  const rows = toRows(step.grid, (v) => (v ? "#" : "·"));
  const mark = (x: number, y: number) => {
    const k = y * W + x;
    if (step.lens !== undefined) {
      const lx = step.lens % W;
      const ly = Math.floor(step.lens / W);
      if (Math.abs(x - lx) <= 1 && Math.abs(y - ly) <= 1) return "hl";
    }
    if (red.has(k)) return "red";
    if (lit.has(k)) return "amber";
    return step.grid.cells[k] ? "wall" : "floor";
  };
  const walls = step.grid.cells.filter((v) => v).length;
  const items: [string, string][] = [
    ["輪數", String(step.round ?? 0)],
    ["牆", `${walls} / ${step.grid.cells.length}（${Math.round((walls / step.grid.cells.length) * 100)}%）`],
  ];
  if (step.lens !== undefined) {
    const n = countAt(step.grid, step.lens);
    items.push(["3×3 牆數", `${n} → ${n >= 5 ? "牆" : "地板"}`]);
  } else if (step.lit) items.push(["亮起", `${step.lit.length} 格`]);
  if (step.red) items.push(["紅框", `${step.red.length} 格`]);
  return (
    <>
      <Stats items={items} />
      <GridText rows={rows} mark={mark} />
      <pre className="msg" style={{ whiteSpace: "pre" }}>{CODE[i]}</pre>
    </>
  );
}

export default function CellularChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><CaveFigure steps={steps} index={i} /></div>}
      panelTitle="cells[]（# 牆 · 地板）"
      panelMeta={(step) => step.tag}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
