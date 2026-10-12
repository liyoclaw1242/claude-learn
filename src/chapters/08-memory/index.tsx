import ChapterStage from "../../components/ChapterStage";
import MemoryFigure from "./figure/Figure";
import Article from "./Article";
import { CARDS, CARD_COLOR, KIND_COLOR, KIND_NAME, SESSION_NAME, steps, type SessionId, type Step } from "./steps";

const STATE_NOTE = { hot: "讀寫中", stale: "過時 → 更新", rejected: "不記" } as const;

function Panel({ step }: { step: Step }) {
  const activeId = (Object.keys(step.sessions) as SessionId[]).find((id) => step.sessions[id].state === "active");
  const blocks = activeId ? step.sessions[activeId].blocks.filter((x) => x.h > 0) : [];
  const cards = CARDS.filter((c) => (step.cards[c.id] ?? "hidden") !== "hidden");

  return (
    <>
      <div className="msgs-title" style={{ padding: "8px 0 0" }}>
        <span>context（{activeId ? SESSION_NAME[activeId] : "無"}）</span>
      </div>
      {blocks.map((x) => (
        <div key={x.id} className="msg" style={{ padding: "5px 10px" }}>
          <span className="role" style={{ color: KIND_COLOR[x.kind] }}>{KIND_NAME[x.kind]}</span>
          {`  ${x.label}`}
        </div>
      ))}

      <div className="msgs-title" style={{ padding: "12px 0 0" }}>
        <span>記憶目錄</span>
        <span>{cards.filter((c) => step.cards[c.id] !== "rejected").length} 個檔案</span>
      </div>
      {cards.length === 0 && <div className="msg sys">（還是空的）</div>}
      {cards.map((c) => {
        const state = step.cards[c.id]!;
        const note = state in STATE_NOTE ? STATE_NOTE[state as keyof typeof STATE_NOTE] : "";
        return (
          <div
            key={c.id}
            className={`msg${state === "hot" || state === "stale" ? " new" : ""}`}
            style={{ opacity: state === "rejected" ? 0.55 : 1, textDecoration: state === "rejected" ? "line-through" : undefined }}
          >
            <span className="role" style={{ color: CARD_COLOR[state] }}>{c.file}</span>
            {note && <span style={{ color: CARD_COLOR[state] }}>{`  · ${note}`}</span>}
            {`\ntype: ${c.type}\n${step.cardContent?.[c.id] ?? c.content}`}
          </div>
        );
      })}
    </>
  );
}

export default function MemoryChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(_, i) => <div className="ch08-fig-wrap"><MemoryFigure steps={steps} index={i} /></div>}
        panelTitle="context 與記憶目錄（內容為示意）"
        panel={(step) => <Panel step={step} />}
        article={<Article />}
      />
    </>
  );
}
