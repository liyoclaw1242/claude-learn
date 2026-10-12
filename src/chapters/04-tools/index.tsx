import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { steps } from "./steps";

function Block({ role, color, text, isNew }: { role: string; color: string; text: string; isNew?: boolean }) {
  return (
    <div className={`msg${isNew ? " new" : ""}`}>
      <span className="role" style={{ color }}>{role}</span>
      {"\n"}{text}
    </div>
  );
}

export default function ToolsChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
        panelTitle="模型看到的 / 送出的 / 拿回來的"
        panelMeta={(step) => (step.focus ? step.focus.join(" · ") : "")}
        panel={(step) => (
          <>
            <Block role="工具定義（tools）" color="#5ec8f2" text={step.panelDef} />
            {step.panelCall && <Block role="tool_use" color="#f2b84b" text={step.panelCall} isNew />}
            {step.panelResult && <Block role="tool_result" color="#6ee7a8" text={step.panelResult} isNew />}
          </>
        )}
        article={<Article />}
      />
    </>
  );
}
