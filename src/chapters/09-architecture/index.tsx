import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { MODULES, OWNER_COLOR, steps, type Step } from "./steps";

function ModuleList({ step }: { step: Step }) {
  if (step.trace) {
    return (
      <>
        {step.trace.map((line, i) => (
          <div key={i} className="msg" style={{ padding: "6px 10px" }}>
            <span className="role" style={{ color: "#f2b84b" }}>{String(i + 1).padStart(2, "0")}</span>
            {"  "}{line}
          </div>
        ))}
      </>
    );
  }
  return (
    <>
      {step.visible.map((k) => {
        const m = MODULES[k];
        const color = step.ownership ? OWNER_COLOR[m.owner] : m.color;
        return (
          <div key={k} className={`msg${step.focus === k ? " new" : ""}`} style={{ opacity: step.focus && step.focus !== k ? 0.6 : 1 }}>
            <span className="role" style={{ color }}>{m.ch === "—" ? "" : `${m.ch} `}{m.name}</span>
            {"\n"}{step.ownership ? m.ownerNote : m.design}
          </div>
        );
      })}
    </>
  );
}

export default function ArchitectureChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
        panelTitle="Claude Film 架構（設計提案）"
        panelMeta={(step) => (step.trace ? "請求走查" : `${step.visible.length} 個元件`)}
        panel={(step) => <ModuleList step={step} />}
        article={<Article />}
      />
    </>
  );
}
