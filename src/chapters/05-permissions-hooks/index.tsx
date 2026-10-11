import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { COLORS, steps, type LogLine } from "./steps";

const WHO: Record<LogLine["who"], { name: string; color: string }> = {
  model: { name: "model", color: COLORS.model },
  hook: { name: "hook", color: COLORS.harness },
  rules: { name: "權限", color: COLORS.user },
  user: { name: "導演", color: COLORS.user },
  tool: { name: "tool", color: COLORS.tool },
  result: { name: "結果", color: "#d8dce6" },
  mode: { name: "模式", color: "#8a92a6" },
};

const TONE_COLOR: Record<NonNullable<LogLine["tone"]>, string> = {
  ok: COLORS.pass,
  bad: COLORS.block,
  ask: COLORS.ask,
  warn: COLORS.warn,
};

/** 右側面板：Harness 處理這次工具呼叫的紀錄 */
function HarnessLog({ log }: { log: LogLine[] }) {
  return (
    <>
      {log.map((line, i) => (
        <div
          key={i}
          className="msg"
          style={line.tone ? { borderColor: TONE_COLOR[line.tone], padding: "6px 10px" } : { padding: "6px 10px" }}
        >
          <span className="role" style={{ color: WHO[line.who].color }}>{WHO[line.who].name}</span>
          {"  "}{line.text}
        </div>
      ))}
    </>
  );
}

export default function PermissionsHooksChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
        panelTitle="Harness 處理紀錄（示意）"
        panelMeta={(step) => (step.mode ? `模式：${step.mode}` : "")}
        panel={(step) => <HarnessLog log={step.log} />}
      />
      <Article />
    </>
  );
}
