import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { chapterByPath } from "./chapters";
import { useIsMobile } from "./useIsMobile";

export type BaseStep = { title: string; desc: ReactNode };

type Props<S extends BaseStep> = {
  steps: S[];
  scene: (step: S, index: number) => ReactNode;
  panel: (step: S, index: number) => ReactNode;
  panelTitle: ReactNode;
  panelMeta?: (step: S, index: number) => ReactNode;
  /** 文字筆記：桌面版接在舞台下方，手機版收進「全文」抽屜 */
  article?: ReactNode;
};

/**
 * 每章的互動舞台：3D 場景 + 步驟說明 + 播放控制 + 章節自訂的狀態區塊。
 * 步驟狀態、自動播放、鍵盤操作都在這裡處理；版面依螢幕寬度切換桌面版與手機版。
 */
export default function ChapterStage<S extends BaseStep>(props: Props<S>) {
  const { steps } = props;
  // 網址可以直接指定步驟，例如 #/01-agent-loop?s=5（從 1 起算）
  const [cur, setCur] = useState(() => {
    const n = Number(new URLSearchParams(location.hash.split("?")[1] ?? "").get("s"));
    return n >= 1 ? Math.min(steps.length, Math.floor(n)) - 1 : 0;
  });
  const [playing, setPlaying] = useState(false);
  const go = useCallback((i: number) => setCur(Math.max(0, Math.min(steps.length - 1, i))), [steps.length]);

  useEffect(() => {
    if (!playing) return;
    if (cur >= steps.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => go(cur + 1), 3200);
    return () => clearTimeout(id);
  }, [playing, cur, go, steps.length]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && cur >= steps.length - 1) setCur(0);
      return !p;
    });
  }, [cur, steps.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(cur + 1);
      if (e.key === "ArrowLeft") go(cur - 1);
      if (e.key === " " && e.target === document.body) { e.preventDefault(); togglePlay(); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [cur, go, togglePlay]);

  const mobile = useIsMobile();
  const ctl = { cur, playing, go, togglePlay };
  return mobile ? <MobileStage {...props} {...ctl} /> : <DesktopStage {...props} {...ctl} />;
}

type Ctl = { cur: number; playing: boolean; go: (i: number) => void; togglePlay: () => void };

function Controls({ cur, playing, go, togglePlay }: Ctl) {
  return (
    <div className="controls">
      <button onClick={() => go(cur - 1)}>← 上一步</button>
      <button onClick={togglePlay}>{playing ? "❚❚ 暫停" : "▶ 自動"}</button>
      <button onClick={() => go(cur + 1)}>下一步 →</button>
    </div>
  );
}

/* ---------- 桌面版：左 3D、右面板，文章接在下方 ---------- */

function DesktopStage<S extends BaseStep>({ steps, scene, panel, panelTitle, panelMeta, article, ...ctl }: Props<S> & Ctl) {
  const { cur } = ctl;
  const step = steps[cur];
  return (
    <>
      <section className="stage">
        <div className="canvas-wrap">
          <div className="hud">
            <Link to="/">← 目錄</Link>　← → 切換步驟 · 空白鍵自動播放
          </div>
          {scene(step, cur)}
        </div>

        <aside className="panel">
          <header>
            <div className="stepno">STEP {cur + 1} / {steps.length}</div>
            <h3>{step.title}</h3>
          </header>
          <div className="desc">{step.desc}</div>
          <Controls {...ctl} />
          <div className="msgs-title">
            <span>{panelTitle}</span>
            <span>{panelMeta?.(step, cur)}</span>
          </div>
          <div className="msgs">{panel(step, cur)}</div>
        </aside>
      </section>
      {article}
    </>
  );
}

/* ---------- 手機版：上半是圖、下半是步驟卡，左右滑動換步驟，全文收進抽屜 ---------- */

function MobileStage<S extends BaseStep>({ steps, scene, panel, panelTitle, panelMeta, article, ...ctl }: Props<S> & Ctl) {
  const { cur, go } = ctl;
  const step = steps[cur];
  const [tab, setTab] = useState<"desc" | "state">("desc");
  const [sheet, setSheet] = useState(false);
  const { pathname } = useLocation();
  const chapter = chapterByPath(pathname);
  const bodyRef = useRef<HTMLDivElement>(null);

  // 換步驟時，卡片內容回到頂端
  useEffect(() => { bodyRef.current?.scrollTo(0, 0); }, [cur, tab]);

  // 水平滑動 > 50px 且大於垂直位移才算換頁，避免和卡片內的上下捲動衝突
  const start = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    start.current = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const s = start.current;
    start.current = null;
    if (!s) return;
    const dx = e.changedTouches[0].clientX - s.x;
    const dy = e.changedTouches[0].clientY - s.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
  };

  return (
    <div className="m-stage">
      <div className="m-figure" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div className="m-hud">
          <Link to="/" aria-label="回目錄">←</Link>
          <span className="m-chapter">{chapter ? `${chapter.no} · ${chapter.title.split("：")[0]}` : ""}</span>
          {article && <button onClick={() => setSheet(true)}>全文</button>}
        </div>
        {scene(step, cur)}
      </div>

      <section className="m-card" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <header>
          <div className="m-card-top">
            <span className="stepno">STEP {cur + 1} / {steps.length}</span>
            <div className="m-tabs" role="tablist">
              <button role="tab" aria-selected={tab === "desc"} className={tab === "desc" ? "on" : ""} onClick={() => setTab("desc")}>說明</button>
              <button role="tab" aria-selected={tab === "state"} className={tab === "state" ? "on" : ""} onClick={() => setTab("state")}>狀態</button>
            </div>
          </div>
          <h3>{step.title}</h3>
        </header>

        <div className="m-card-body" ref={bodyRef}>
          {tab === "desc" ? (
            <div className="desc">{step.desc}</div>
          ) : (
            <>
              <div className="msgs-title">
                <span>{panelTitle}</span>
                <span>{panelMeta?.(step, cur)}</span>
              </div>
              <div className="m-state">{panel(step, cur)}</div>
            </>
          )}
        </div>

        <div className="m-dots" aria-hidden>
          {steps.map((_, i) => (
            <span key={i} className={i === cur ? "on" : i < cur ? "done" : ""} onClick={() => go(i)} />
          ))}
        </div>
        <Controls {...ctl} />
      </section>

      {article && (
        <div className={`m-sheet${sheet ? " open" : ""}`} aria-hidden={!sheet}>
          <div className="m-sheet-bar">
            <span>{chapter ? `${chapter.no} · 全文筆記` : "全文筆記"}</span>
            <button onClick={() => setSheet(false)}>關閉 ✕</button>
          </div>
          <div className="m-sheet-body">{article}</div>
        </div>
      )}
    </div>
  );
}
