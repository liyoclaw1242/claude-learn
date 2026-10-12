import ChapterStage from "../../components/ChapterStage";
import PrototypeFigure from "./figure/Figure";
import Article from "./Article";
import { FLOORS, steps } from "./steps";

export default function PrototypeChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(_, i) => <div className="ch10-fig-wrap"><PrototypeFigure steps={steps} index={i} /></div>}
        panelTitle="claude_film.py（對應片段）"
        panelMeta={(step) => {
          const f = FLOORS.find((x) => x.id === step.focus);
          return f ? `第 ${f.ch} 章` : "";
        }}
        panel={(step) => (
          <pre className="msg" style={{ whiteSpace: "pre", overflowX: "auto", wordBreak: "normal", fontSize: 11 }}>
            {step.snippet}
          </pre>
        )}
        article={<Article />}
      />
    </>
  );
}
