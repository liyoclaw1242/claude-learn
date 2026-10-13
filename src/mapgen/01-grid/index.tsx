import ChapterStage from "../../components/ChapterStage";
import { GridText, Stats } from "../shared/Panel";
import { toRows } from "../lib/grid";
import GridFigure from "./figure/Figure";
import Article from "./Article";
import { H, W } from "./model";
import { CENTER, steps, type Step } from "./steps";

const MULBERRY = `function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}`;

const CODE: Record<number, string> = {
  0: `const cells = new Array(W * H).fill(0);
const at = (x, y) => cells[y * W + x];`,
  1: `cells[y * W + x] = 1;   // 放一道牆`,
  2: `const N4 = [[1,0],[-1,0],[0,1],[0,-1]];
const N8 = [...N4, [1,1],[1,-1],[-1,1],[-1,-1]];`,
  3: `for (let i = 0; i < W * H; i++)
  cells[i] = Math.random() < 0.45 ? 1 : 0;`,
  4: `${MULBERRY}

const rand = mulberry32(42);
for (let i = 0; i < W * H; i++)
  cells[i] = rand() < 0.45 ? 1 : 0;`,
  5: `const rand = mulberry32(1337);   // 只改種子`,
  6: `const a = gen(42), b = gen(42);
a.every((v, i) => v === b[i]);  // true`,
  7: `const rand = mulberry32(42);
for (let i = 0; i < W * H; i++)
  height[i] = rand();          // 0 ≤ h < 1`,
  8: `// 右鄰、下鄰的落差
Math.abs(h[i] - h[i + 1]) > 0.6
Math.abs(h[i] - h[i + W]) > 0.6`,
};

function rowsOf(step: Step) {
  if (step.mode === "height") return toRows(step.grid, (v) => String(Math.min(9, Math.floor(v * 10))));
  if (step.mode === "neighbors") {
    return toRows(step.grid, (_, x, y) => {
      const dx = Math.abs(x - CENTER[0]);
      const dy = Math.abs(y - CENTER[1]);
      if (!dx && !dy) return "@";
      if (dx + dy === 1) return "4";
      if (dx <= 1 && dy <= 1) return "8";
      return "·";
    });
  }
  return toRows(step.grid, (v) => (v ? "#" : "·"));
}

function StatePanel({ step }: { step: Step }) {
  const rows = rowsOf(step);
  const mark = (x: number, y: number) => {
    const i = y * W + x;
    if (step.lit?.includes(i)) return "hl";
    if (step.red?.has(i)) return "red";
    if (step.mode === "neighbors") return rows[y][x] === "·" ? "floor" : "amber";
    if (step.mode === "walls") return step.grid.cells[i] ? "wall" : "floor";
    return undefined;
  };
  const walls = step.grid.cells.filter((v) => v === 1).length;
  const items: [string, string][] = [["尺寸", `${W} × ${H} = ${W * H} 格`]];
  if (step.seed !== null) items.push(["種子", step.seed === "random" ? "無（Math.random）" : String(step.seed)]);
  if (step.mode === "walls") items.push(["牆", `${walls} 格（${Math.round((walls / (W * H)) * 100)}%）`]);
  if (step.red) items.push(["落差 > 0.6", `${step.red.size} 格`]);
  return (
    <>
      <Stats items={items} />
      <GridText rows={rows} mark={mark} />
      <pre className="msg" style={{ whiteSpace: "pre" }}>{CODE[steps.indexOf(step)]}</pre>
    </>
  );
}

export default function GridChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><GridFigure steps={steps} index={i} /></div>}
      panelTitle="cells[]（文字版地圖）"
      panelMeta={(step) => (step.mode === "height" ? "數字 = 高度 × 10" : step.mode === "neighbors" ? "@ 中心 · 4 / 8 鄰" : "# 牆 · 地板")}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
