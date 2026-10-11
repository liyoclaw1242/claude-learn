import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

export type BaseStep = { title: string; desc: ReactNode };

/**
 * 每章上半頁：左邊 3D 場景、右邊步驟面板（標題、說明、播放控制 + 章節自訂的下方區塊）。
 * 步驟狀態、自動播放、鍵盤操作都在這裡處理。
 */
export default function ChapterStage<S extends BaseStep>({
  steps, scene, panel, panelTitle, panelMeta,
}: {
  steps: S[];
  scene: (step: S, index: number) => ReactNode;
  panel: (step: S, index: number) => ReactNode;
  panelTitle: ReactNode;
  panelMeta?: (step: S, index: number) => ReactNode;
}) {
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const go = useCallback((i: number) => setCur(Math.max(0, Math.min(steps.length - 1, i))), [steps.length]);
  const step = steps[cur];

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

  return (
    <section className="stage">
      <div className="canvas-wrap">
        <div className="hud">
          <Link to="/">← 目錄</Link>　拖曳旋轉 · 滾輪縮放 · ← → 切換步驟 · 空白鍵自動播放
        </div>
        {scene(step, cur)}
      </div>

      <aside className="panel">
        <header>
          <div className="stepno">STEP {cur + 1} / {steps.length}</div>
          <h3>{step.title}</h3>
        </header>
        <div className="desc">{step.desc}</div>
        <div className="controls">
          <button onClick={() => go(cur - 1)}>← 上一步</button>
          <button onClick={togglePlay}>{playing ? "❚❚ 暫停" : "▶ 自動"}</button>
          <button onClick={() => go(cur + 1)}>下一步 →</button>
        </div>
        <div className="msgs-title">
          <span>{panelTitle}</span>
          <span>{panelMeta?.(step, cur)}</span>
        </div>
        <div className="msgs">{panel(step, cur)}</div>
      </aside>
    </section>
  );
}
