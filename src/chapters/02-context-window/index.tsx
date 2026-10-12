import ChapterStage from "../../components/ChapterStage";
import ContextFigure from "./figure/Figure";
import Article from "./Article";
import { KIND_COLOR, KIND_NAME, THRESHOLD, steps, type Block } from "./steps";

const used = (blocks: Block[]) => blocks.reduce((a, x) => a + x.pct, 0);

/** 橫向堆疊的用量條，紅色刻度是自動壓縮門檻 */
function Meter({ blocks, label }: { blocks: Block[]; label: string }) {
  const visible = blocks.filter((x) => x.pct > 0);
  return (
    <div className="meter">
      <div className="meter-head">
        <span>{label}</span>
        <span style={{ color: used(blocks) > THRESHOLD ? "var(--ctx)" : undefined }}>{used(blocks)}%</span>
      </div>
      <div className="meter-bar">
        {visible.map((x) => (
          <div
            key={x.id}
            title={x.label}
            style={{ width: `${x.pct}%`, background: KIND_COLOR[x.kind], opacity: x.dim ? 0.3 : 1 }}
          />
        ))}
        <div className="meter-threshold" style={{ left: `${THRESHOLD}%` }} />
      </div>
    </div>
  );
}

function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.filter((x) => x.pct > 0).map((x) => (
        <div key={x.id} className="msg" style={{ opacity: x.dim ? 0.45 : 1, padding: "5px 10px" }}>
          <span className="role" style={{ color: KIND_COLOR[x.kind] }}>{KIND_NAME[x.kind]}</span>
          {`  ${x.pct}%  ${x.label}`}
        </div>
      ))}
    </>
  );
}

export default function ContextWindowChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(_, i) => <div className="ch02-fig-wrap"><ContextFigure steps={steps} index={i} /></div>}
        panelTitle="context 用量（比例示意，非實測）"
        panel={(step) => (
          <>
            <Meter blocks={step.main} label="主對話" />
            {step.sub && <Meter blocks={step.sub} label="子代理" />}
            <BlockList blocks={step.main} />
          </>
        )}
        article={<Article />}
      />
    </>
  );
}
