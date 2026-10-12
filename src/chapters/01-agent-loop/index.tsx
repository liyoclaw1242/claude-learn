import { useEffect, useRef } from "react";
import ChapterStage from "../../components/ChapterStage";
import AgentLoopFigure from "./figure/Figure";
import Article from "./Article";
import { steps, type MsgKind, type Step } from "./steps";

const ROLE_CSS: Record<MsgKind, string> = {
  system: "#8a92a6",
  user: "var(--user)",
  assistant: "var(--model)",
  tool_result: "var(--tool)",
};

function MessageList({ step }: { step: Step }) {
  const lastMsgRef = useRef<HTMLDivElement>(null);
  useEffect(() => { lastMsgRef.current?.scrollIntoView({ block: "nearest" }); }, [step]);
  return (
    <>
      {step.msgs.map((m, k) => (
        <div
          key={k}
          ref={k === step.msgs.length - 1 ? lastMsgRef : undefined}
          className={`msg ${k >= step.newFrom ? "new" : ""} ${m.kind === "system" ? "sys" : ""}`}
        >
          <span className="role" style={{ color: ROLE_CSS[m.kind] }}>{m.role}</span>
          {`  ~${m.tok * 10} tok\n${m.text}`}
        </div>
      ))}
    </>
  );
}

export default function AgentLoop() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(_, i) => <div className="ch01-fig-wrap"><AgentLoopFigure steps={steps} index={i} /></div>}
        panelTitle="messages[]（Harness 手上的整份對話）"
        panelMeta={(step) => `≈ ${step.msgs.reduce((a, m) => a + m.tok * 10, 0).toLocaleString()} tokens`}
        panel={(step) => <MessageList step={step} />}
        article={<Article />}
      />
    </>
  );
}
