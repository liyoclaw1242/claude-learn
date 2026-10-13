import ChapterStage from "../../components/ChapterStage";
import { Stats } from "../shared/Panel";
import EulerFigure from "./figure/Figure";
import Article from "./Article";
import { degOf, euler, fullEdges, graphEdges, nodes, totalLength, treeEdges } from "./model";
import { steps, type Step } from "./steps";

function StatePanel({ step }: { step: Step }) {
  const edges = step.edges === "tree" ? treeEdges : step.edges === "loop" ? graphEdges : fullEdges;
  const deg = degOf(step.edges === "dup" ? fullEdges : graphEdges);
  const odd = deg.filter((d) => d % 2).length;
  const items: [string, string][] = [
    ["節點 V", String(nodes.length)],
    ["邊 E", `${edges.length}（樹 ${treeEdges.length}${step.edges !== "tree" ? ` + 環 ${graphEdges.length - treeEdges.length}` : ""}${step.edges === "dup" ? ` + 重走 ${fullEdges.length - graphEdges.length}` : ""}）`],
    ["總長", `${Math.round(totalLength(edges))} 格`],
  ];
  if (step.degrees) items.push(["奇數度節點", String(step.edges === "dup" ? 0 : odd)]);
  const loops = step.loops === "run" ? euler.loops.length : step.loops;
  return (
    <>
      <Stats items={items} />
      {step.degrees && (
        <pre className="mg-grid">
          {nodes.map((_, n) => (
            <span key={n} className={deg[n] % 2 && step.markOdd ? "red" : undefined}>{`R${n}:${deg[n]}${n % 7 === 6 ? "\n" : "  "}`}</span>
          ))}
        </pre>
      )}
      {loops > 0 && (
        <pre className="mg-grid" style={{ whiteSpace: "pre-wrap" }}>
          {euler.loops.slice(0, loops).map((l, i) => (
            <div key={i} className={i === loops - 1 && step.loops !== "run" ? "hl" : undefined}>
              {`圈 ${i + 1}：${l.nodes.map((v) => `R${v}`).join("→")}`}
            </div>
          ))}
        </pre>
      )}
      <pre className="msg" style={{ whiteSpace: "pre" }}>{step.code}</pre>
    </>
  );
}

export default function EulerChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><EulerFigure steps={steps} index={i} /></div>}
      panelTitle="圖的狀態"
      panelMeta={(step) => step.tag}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
