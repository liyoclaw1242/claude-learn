import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { FLOORS, steps } from "./steps";

export default function PrototypeChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
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
