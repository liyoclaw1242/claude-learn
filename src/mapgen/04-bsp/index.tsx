import ChapterStage from "../../components/ChapterStage";
import type { BspNode } from "../lib/bsp";
import { GridText, Stats } from "../shared/Panel";
import BspFigure from "./figure/Figure";
import Article from "./Article";
import { H, HALL, ROOM, SEED, W, WALL, halls, leafList, root } from "./model";
import { steps, type Step } from "./steps";

/** 樹的文字版：├─ └─ 縮排，標出切法與房間 */
function treeLines(step: Step) {
  const out: { text: string; lit: boolean }[] = [];
  const walk = (n: BspNode, prefix: string, last: boolean, isRoot: boolean) => {
    const name = isRoot ? "根" : n.id;
    const cut = n.split && n.depth < step.treeDepth ? (n.split.dir === "v" ? ` ┃ x=${n.split.at}` : ` ━ y=${n.split.at}`) : "";
    const leaf = !n.kids || n.depth >= step.treeDepth;
    const room = leaf && step.rooms && n.room ? ` ▣ ${n.room.w}×${n.room.h}` : "";
    out.push({ text: `${prefix}${isRoot ? "" : last ? "└─ " : "├─ "}${name} ${n.w}×${n.h}${cut}${room}`, lit: step.litDepth === n.depth && !!cut });
    if (leaf) return;
    const next = prefix + (isRoot ? "" : last ? "   " : "│  ");
    walk(n.kids![0], next, false, false);
    walk(n.kids![1], next, true, false);
  };
  walk(root, "", true, true);
  return out;
}

const CHAR = ["·", "#", "+", "█"];

function StatePanel({ step }: { step: Step }) {
  const lines = treeLines(step);
  const rows = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => CHAR[step.tiles[y * W + x]]).join(""));
  const mark = (x: number, y: number) => {
    const t = step.tiles[y * W + x];
    if (step.lit?.has(y * W + x)) return "amber";
    return t === ROOM ? "wall" : t === HALL ? "green" : t === WALL ? undefined : "floor";
  };
  return (
    <>
      <Stats items={[["種子", String(SEED)], ["葉子 / 房間", `${leafList.length}`], ["走廊", step.rooms ? `${halls.length} 條` : "—"]]} />
      <pre className="mg-grid">
        {lines.map((l, i) => <div key={i} className={l.lit ? "hl" : undefined}>{l.text}</div>)}
      </pre>
      <GridText rows={rows} mark={mark} />
      <pre className="msg" style={{ whiteSpace: "pre" }}>{step.code}</pre>
    </>
  );
}

export default function BspChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><BspFigure steps={steps} index={i} /></div>}
      panelTitle="BSP 樹與地圖"
      panelMeta={() => "┃ 直刀 ━ 橫刀 ▣ 房間"}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
