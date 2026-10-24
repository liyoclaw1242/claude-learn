import { useCallback, useEffect, useRef, useState, type ReactNode, type TouchEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { lessonFor } from "../book/lessons";
import LessonPage from "../book/LessonPage";
import Toolbar, { type ToolButton } from "../book/Toolbar";
import { bookPath, locate } from "./chapters";
import { useIsMobile } from "./useIsMobile";

export type BaseStep = { title: string; desc: ReactNode };

type Props<S extends BaseStep> = {
  steps: S[];
  scene: (step: S, index: number) => ReactNode;
  panel: (step: S, index: number) => ReactNode;
  panelTitle: ReactNode;
  panelMeta?: (step: S, index: number) => ReactNode;
  /** 文字筆記：從工具列的「全文」打開，像夾在書裡的附錄 */
  article?: ReactNode;
};

/**
 * 每章 = 書裡的一個跨頁。
 * 左頁是課文（LessonPage），右頁是會動的圖版 + 這一步的圖說 / 現場狀態。
 * 步驟、自動播放、鍵盤都在這裡處理；走到最後一步再按「下一步」就翻到下一課。
 * 手機只攤開一頁，用頁首的「課文 / 圖版」切換。
 */
export default function ChapterStage<S extends BaseStep>({ steps, scene, panel, panelTitle, panelMeta, article }: Props<S>) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const loc = locate(pathname);
  const lesson = lessonFor(pathname);
  const mobile = useIsMobile();

  // 網址可以直接指定步驟，例如 #/01-agent-loop?s=5（從 1 起算）；?s=end 由「上一步」翻回來時使用
  const [cur, setCur] = useState(() => {
    const q = new URLSearchParams(location.hash.split("?")[1] ?? "").get("s");
    if (q === "end") return steps.length - 1;
    const n = Number(q);
    return n >= 1 ? Math.min(steps.length, Math.floor(n)) - 1 : 0;
  });
  const [playing, setPlaying] = useState(false);
  const [sheet, setSheet] = useState(() => location.hash.includes("text=1"));
  const [plate, setPlate] = useState(() => location.hash.includes("plate=1"));
  const [tab, setTab] = useState<"desc" | "state">(() => (location.hash.includes("tab=state") ? "state" : "desc"));
  const [side, setSide] = useState<"lesson" | "figure">(() => (location.hash.includes("?s=") ? "figure" : "lesson"));

  const turn = useCallback((dir: 1 | -1) => {
    const target = dir > 0 ? loc?.next : loc?.prev;
    if (target?.path) navigate(dir > 0 ? target.path : `${target.path}?s=end`);
    else if (loc) navigate(bookPath(loc.course));
  }, [loc, navigate]);

  const go = useCallback((i: number) => setCur(Math.max(0, Math.min(steps.length - 1, i))), [steps.length]);
  const next = useCallback(() => (cur >= steps.length - 1 ? turn(1) : go(cur + 1)), [cur, steps.length, go, turn]);
  const prev = useCallback(() => (cur <= 0 ? turn(-1) : go(cur - 1)), [cur, go, turn]);

  useEffect(() => {
    if (!playing) return;
    if (cur >= steps.length - 1) { setPlaying(false); return; }
    const id = setTimeout(() => go(cur + 1), 3200);
    return () => clearTimeout(id);
  }, [playing, cur, go, steps.length]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (!p && cur >= steps.length - 1) setCur(0);
      if (!p) setSide("figure");
      return !p;
    });
  }, [cur, steps.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " " && (e.target === document.body || e.target instanceof HTMLButtonElement)) { e.preventDefault(); togglePlay(); }
      if (e.key === "Escape") { setSheet(false); setPlate(false); }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [next, prev, togglePlay]);

  // 換步驟時，圖說回到頂端
  const capRef = useRef<HTMLDivElement>(null);
  useEffect(() => { capRef.current?.scrollTo(0, 0); }, [cur, tab]);

  // 手機：在圖上左右滑動換步驟
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

  if (!loc) return null;
  const { course, chapter, index } = loc;
  const step = steps[cur];
  const leftNo = 2 * index + 4;

  const figurePage = (
    <div className="pg pg-right">
      <div className="pg-run"><span>圖 {chapter.no}　{lesson?.fig ?? chapter.title.split("：")[0]}</span><span>{chapter.title.split("：")[0]}</span></div>
      <div className="pg-fig" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>{scene(step, cur)}</div>
      <div className="pg-cap">
        <div className="cap-head">
          <span className="kicker">STEP {cur + 1} / {steps.length}</span>
          <span className="cap-tabs" role="tablist">
            <button role="tab" aria-selected={tab === "desc"} className={tab === "desc" ? "on" : ""} onClick={() => setTab("desc")}>圖說</button>
            <button role="tab" aria-selected={tab === "state"} className={tab === "state" ? "on" : ""} onClick={() => setTab("state")}>現場狀態</button>
          </span>
        </div>
        <div className="cap-body" ref={capRef}>
          {tab === "desc" ? (
            <>
              <h3>{step.title}</h3>
              <div className="desc">{step.desc}</div>
            </>
          ) : (
            <>
              <div className="msgs-title"><span>{panelTitle}</span><span>{panelMeta?.(step, cur)}</span></div>
              <div className="state">{panel(step, cur)}</div>
            </>
          )}
        </div>
      </div>
      <div className="pg-no">{leftNo + 1}</div>
    </div>
  );

  const extra: ToolButton[] = [
    ...(article ? [{ icon: "text" as const, label: "全文筆記", onClick: () => setSheet(true) }] : []),
    ...(!mobile ? [{ icon: "plate" as const, label: plate ? "收回圖版" : "展開圖版", onClick: () => setPlate((p) => !p), pressed: plate }] : []),
  ];

  return (
    <div className="desk" style={{ "--cover": course.cover.color } as React.CSSProperties}>
      {mobile ? (
        <div className="book single">
          <div className="side-switch" role="tablist">
            <button role="tab" aria-selected={side === "lesson"} className={side === "lesson" ? "on" : ""} onClick={() => setSide("lesson")}>課文</button>
            <button role="tab" aria-selected={side === "figure"} className={side === "figure" ? "on" : ""} onClick={() => setSide("figure")}>圖版</button>
          </div>
          {side === "lesson" ? (
            <LessonPage key={pathname} course={course} chapter={chapter} lesson={lesson} page={leftNo} onSeeFigure={() => setSide("figure")} />
          ) : figurePage}
        </div>
      ) : (
        <div className={`book spread${plate ? " plate-open" : ""}`}>
          <LessonPage key={pathname} course={course} chapter={chapter} lesson={lesson} page={leftNo} />
          <div className="spine" aria-hidden />
          {figurePage}
        </div>
      )}

      <Toolbar
        course={course}
        caption={<><b>{chapter.no}</b>　{step.title}</>}
        dots={{ count: steps.length, cur, go: (i) => { go(i); setSide("figure"); } }}
        onPrev={prev}
        onNext={next}
        playing={playing}
        onPlay={togglePlay}
        extra={extra}
      />

      {article && (
        <div className={`sheet${sheet ? " open" : ""}`} aria-hidden={!sheet} onClick={(e) => { if (e.target === e.currentTarget) setSheet(false); }}>
          <div className="sheet-paper">
            <div className="sheet-bar">
              <span>附錄 · 第 {chapter.no} 課全文筆記</span>
              <button onClick={() => setSheet(false)}>闔上 ✕</button>
            </div>
            <div className="sheet-body">{article}</div>
          </div>
        </div>
      )}
    </div>
  );
}
