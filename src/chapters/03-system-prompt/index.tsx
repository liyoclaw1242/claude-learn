import ChapterStage from "../../components/ChapterStage";
import Scene from "./Scene";
import Article from "./Article";
import { KIND_COLOR, LAYERS, steps, type Section, type Step } from "./steps";

const SECTIONS: Section[] = ["tools", "system", "messages"];

/** 右側面板：把目前組好的請求按三格列出來 */
function RequestView({ step }: { step: Step }) {
  const visible = new Set(step.layers);
  const hot = new Set(step.hot ?? []);
  if (!visible.size) {
    return <div className="msg sys">{"{ tools: [], system: \"\", messages: [] }"}</div>;
  }
  return (
    <>
      {SECTIONS.map((s) => {
        const layers = LAYERS.filter((l) => l.section === s && visible.has(l.id));
        if (!layers.length) return null;
        return (
          <div key={s}>
            <div className="msgs-title" style={{ padding: "8px 0 0" }}><span>{s}</span></div>
            {layers.map((l) => (
              <div
                key={l.id}
                className={`msg${hot.has(l.id) || step.changed === l.id ? " new" : ""}`}
                style={{ opacity: step.cache === "miss" && step.changed !== l.id ? 0.6 : 1 }}
              >
                <span className="role" style={{ color: KIND_COLOR[l.kind] }}>{l.label}</span>
                {"\n"}{l.preview}
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

const CACHE_TEXT = { hit: "快取：命中", miss: "快取：失效" } as const;

export default function SystemPromptChapter() {
  return (
    <>
      <ChapterStage
        steps={steps}
        scene={(step, i) => <Scene step={step} stepIndex={i} />}
        panelTitle="實際送出的請求（內容為示意）"
        panelMeta={(step) => (step.cache ? CACHE_TEXT[step.cache] : `${step.layers.length} 層`)}
        panel={(step) => <RequestView step={step} />}
        article={<Article />}
      />
    </>
  );
}
