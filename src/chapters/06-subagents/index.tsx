import ChapterStage from "../../components/ChapterStage";
import SubagentsFigure from "./figure/Figure";
import Article from "./Article";
import { KIND_COLOR, KIND_NAME, UNITS, steps, type Block } from "./steps";

function BlockList({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((x) => (
        <div
          key={x.id}
          className={`msg${x.hot ? " new" : ""}`}
          style={{ padding: "5px 10px", borderColor: x.warn ? "var(--ctx)" : undefined }}
        >
          <span className="role" style={{ color: x.warn ? "var(--ctx)" : KIND_COLOR[x.kind] }}>{KIND_NAME[x.kind]}</span>
          {"  "}{x.text ?? x.label}
        </div>
      ))}
    </>
  );
}

const Heading = ({ children }: { children: string }) => (
  <div className="msgs-title" style={{ padding: "10px 0 0" }}><span>{children}</span></div>
);

export default function SubagentsChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(_, i) => <div className="ch06-fig-wrap"><SubagentsFigure steps={steps} index={i} /></div>}
        panelTitle="各視窗的內容（示意）"
        panelMeta={(step) => `子代理 ${step.units.filter(Boolean).length} 個`}
        panel={(step) => (
          <>
            <Heading>主代理 messages</Heading>
            <BlockList blocks={step.main} />
            {step.units.map((blocks, i) => blocks && (
              <div key={i}>
                <Heading>{`${UNITS[i].name}：${UNITS[i].role}（獨立視窗）`}</Heading>
                <BlockList blocks={blocks} />
              </div>
            ))}
          </>
        )}
        article={<Article />}
      />
    </>
  );
}
