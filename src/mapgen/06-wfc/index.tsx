import ChapterStage from "../../components/ChapterStage";
import { GridText, Stats } from "../shared/Panel";
import WfcFigure from "./figure/Figure";
import Article from "./Article";
import { H, TILES, W, collapsedCount } from "./model";
import { steps, type Step } from "./steps";

/** 已確定的格子顯示拼塊符號；未確定的顯示候選數（10 以上用 +），矛盾顯示 X */
function StatePanel({ step }: { step: Step }) {
  const d = step.snap.domains;
  const rows = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const dom = d[y * W + x];
      if (!dom.length) return "X";
      if (dom.length === 1 && step.stacks) return TILES[dom[0]].glyph;
      return dom.length > 9 ? "+" : String(dom.length);
    }).join(""));
  const ripple = new Set(step.focus === "ripple" ? step.snap.ripple : []);
  const mark = (x: number, y: number) => {
    const i = y * W + x;
    const dom = d[i];
    if (!dom.length) return "red";
    if (i === step.snap.collapsed && step.focus) return "hl";
    if (ripple.has(i)) return "amber";
    if (dom.length === 1 && step.stacks) return TILES[dom[0]].sockets.includes(2) ? "blue" : "wall";
    return "floor";
  };
  return (
    <>
      <Stats items={[["種子", String(step.seed)], ["已確定", `${collapsedCount(step.snap)} / ${W * H}`], ["拼塊種類", String(TILES.length)]]} />
      {step.stacks ? (
        <GridText rows={rows} mark={mark} />
      ) : (
        <pre className="mg-grid">
          {TILES.map((t, k) => (
            <div key={k}>{`${t.glyph}  ${t.name.padEnd(4, "　")}  接口 ${t.sockets.join("")}  權重 ${t.weight}`}</div>
          ))}
        </pre>
      )}
      <pre className="msg" style={{ whiteSpace: "pre" }}>{step.code}</pre>
    </>
  );
}

export default function WfcChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><WfcFigure steps={steps} index={i} /></div>}
      panelTitle="候選數 / 拼塊（文字版）"
      panelMeta={(step) => (step.stacks ? "數字 = 剩幾種 · + = 10 種以上" : "接口：上右下左")}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
