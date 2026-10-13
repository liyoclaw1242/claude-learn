import { Link } from "react-router-dom";
import ChapterStage from "../../components/ChapterStage";
import { Stats } from "../shared/Panel";
import PipelineFigure from "./figure/Figure";
import Article from "./Article";
import { LAYERS } from "./model";
import { steps, type Step } from "./steps";

function StatePanel({ step }: { step: Step }) {
  const w = step.world;
  return (
    <>
      <Stats items={[
        ["種子", String(w.seed)],
        ["陸地", `${Math.round((w.land.filter(Boolean).length / w.land.length) * 100)}%`],
        ["據點 / 道路", `${w.towns.length} / ${w.roads.length}`],
      ]} />
      <pre className="mg-grid" style={{ whiteSpace: "pre-wrap" }}>
        {LAYERS.map((l, k) => {
          const on = step.layers.includes(l.key);
          return (
            <div key={l.key} className={step.focus === l.key ? "hl" : on ? undefined : "floor"}>
              {`${on ? "■" : "□"} 第 ${k + 1} 層 ${l.name}　← `}<Link to={l.path}>{l.chapter}</Link>
            </div>
          );
        })}
      </pre>
      <pre className="msg" style={{ whiteSpace: "pre" }}>{step.code}</pre>
    </>
  );
}

export default function PipelineChapter() {
  return (
    <ChapterStage
      steps={steps}
      scene={(_, i) => <div className="mg-fig-wrap"><PipelineFigure steps={steps} index={i} /></div>}
      panelTitle="管線：每一層由哪一章負責"
      panelMeta={(step) => step.tag}
      panel={(step) => <StatePanel step={step} />}
      article={<Article />}
    />
  );
}
