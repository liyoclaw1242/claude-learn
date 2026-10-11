import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { KIND_COLOR, KIND_NAME, SKILLS, steps, type Step } from "./steps";

/** 右側面板：技能狀態 + context 內容 */
function Panel({ step }: { step: Step }) {
  const hot = new Set(step.hot ?? []);
  return (
    <>
      <div className="msg sys" style={{ padding: "6px 10px" }}>
        {SKILLS.map((s) => {
          const loaded = step.loaded?.includes(s.id);
          const listed = step.listed && !s.manual;
          const state = loaded ? "全文已載入" : listed ? "名片在清單" : s.manual ? "只能手動" : "只在磁碟";
          return (
            <div key={s.id} style={{ color: loaded ? KIND_COLOR.skill : listed ? "#d9a3c9" : undefined }}>
              {`${s.name}：${state}`}
            </div>
          );
        })}
      </div>
      {step.ctx.map((blk) => (
        <div
          key={blk.id}
          className={`msg${hot.has(blk.id) || step.warn === blk.id ? " new" : ""}`}
          style={{ padding: "5px 10px" }}
        >
          <span className="role" style={{ color: KIND_COLOR[blk.kind] }}>{KIND_NAME[blk.kind]}</span>
          {`  ${blk.label}`}
        </div>
      ))}
    </>
  );
}

export default function SkillsMcpChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
        panelTitle="技能狀態與 context 內容（示意）"
        panelMeta={(step) => `${step.ctx.length} 塊`}
        panel={(step) => <Panel step={step} />}
      />
      <Article />
    </>
  );
}
