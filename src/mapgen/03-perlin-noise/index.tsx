import ChapterStage from "../../components/ChapterStage";
import { GridText, Stats } from "../shared/Panel";
import NoiseFigure from "./figure/Figure";
import Article from "./Article";
import { H, S, SEED, W, biomeOf } from "./model";
import { steps, type Step } from "./steps";

const CHAR = { water: "~", sand: ".", grass: '"', rock: "^" } as const;
const CLS = { water: "blue", sand: "amber", grass: "green", rock: "wall" } as const;

function StatePanel({ step }: { step: Step }) {
  const rows = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      const e = step.heights[y * W + x];
      return step.biomes ? CHAR[biomeOf(e)] : String(Math.min(9, Math.floor(e * 10)));
    }).join(""));
  const onLattice = (x: number, y: number) => x % S === 0 && y % S === 0;
  const mark = (x: number, y: number) => {
    const e = step.heights[y * W + x];
    if (step.biomes) return CLS[biomeOf(e)];
    if (step.lattice && onLattice(x, y)) return "hl";
    return e > 0.66 ? "wall" : e < 0.33 ? "floor" : undefined;
  };
  const items: [string, string][] = [["種子", String(SEED)], ["晶格間距", `${S} 格`], ["八度", String(step.octaves)]];
  if (step.biomes) {
    const count = (b: string) => step.heights.filter((e) => biomeOf(e) === b).length;
    items.push(["水 / 沙 / 草 / 岩", ["water", "sand", "grass", "rock"].map(count).join(" / ")]);
  }
  return (
    <>
      <Stats items={items} />
      <GridText rows={rows} mark={mark} />
      <pre className="msg" style={{ whiteSpace: "pre" }}>{step.code}</pre>
    </>
  );
}

export default function PerlinChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><NoiseFigure steps={steps} index={i} /></div>}
      panelTitle="高度場（文字版）"
      panelMeta={(step) => (step.biomes ? "~ 水 · . 沙 · \" 草 · ^ 岩" : "數字 = 高度 × 10")}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
