import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { bookPath, courses, type Course } from "../components/chapters";
import { useTheme } from "./theme";

/* 線條圖示（24×24，stroke = currentColor） */
const I = {
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  prev: <path d="M15 6l-6 6 6 6" />,
  next: <path d="M9 6l6 6-6 6" />,
  play: <path d="M8 5l11 7-11 7z" fill="currentColor" stroke="none" />,
  pause: <path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" stroke="none" />,
  text: <path d="M6 4h9l3 3v13H6zM9 10h6M9 14h6M9 18h4" />,
  plate: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  theme: <><circle cx="12" cy="12" r="8" /><path d="M12 4a8 8 0 000 16z" fill="currentColor" /></>,
};

export const Icon = ({ name }: { name: keyof typeof I }) => <svg viewBox="0 0 24 24" aria-hidden>{I[name]}</svg>;

export type ToolButton = { icon: keyof typeof I; label: string; onClick: () => void; pressed?: boolean; mobileHidden?: boolean };

type Props = {
  course?: Course;
  caption: ReactNode;
  dots?: { count: number; cur: number; go: (i: number) => void };
  onPrev?: () => void;
  onNext?: () => void;
  playing?: boolean;
  onPlay?: () => void;
  extra?: ToolButton[];
};

/** 畫面底部的膠囊工具列：目錄、上一步、播放、標題 + 進度點、下一步、附加按鈕、日夜 */
export default function Toolbar({ course, caption, dots, onPrev, onNext, playing, onPlay, extra = [] }: Props) {
  const [menu, setMenu] = useState(false);
  const { toggle, theme } = useTheme();
  const { pathname } = useLocation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMenu(false); }, [pathname]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    addEventListener("pointerdown", close);
    addEventListener("keydown", esc);
    return () => { removeEventListener("pointerdown", close); removeEventListener("keydown", esc); };
  }, [menu]);

  return (
    <div className="tb-root" ref={ref}>
      <nav className={`tb-menu${menu ? " open" : ""}`} aria-hidden={!menu}>
        <Link to="/" className={pathname === "/" ? "cur" : ""}><small>書架</small>回到書桌</Link>
        {course && (
          <>
            <Link to={bookPath(course)} className={pathname === bookPath(course) ? "cur" : ""}><small>{course.cover.vol}</small>{course.title} · 目錄</Link>
            {course.chapters.map((c) => c.path && (
              <Link key={c.no} to={c.path} className={pathname === c.path ? "cur" : ""}><small>第 {c.no} 課</small>{c.title.split("：")[0]}</Link>
            ))}
          </>
        )}
        {courses.filter((c) => c !== course).map((c) => (
          <Link key={c.id} to={bookPath(c)} className="other"><small>{c.cover.vol}</small>另一本：{c.title}</Link>
        ))}
      </nav>

      <div className="tb-bar">
        <button title="目錄" aria-label="目錄" aria-pressed={menu} onClick={() => setMenu((m) => !m)}><Icon name="menu" /></button>
        {onPrev && <button title="上一步（←）" aria-label="上一步" onClick={onPrev}><Icon name="prev" /></button>}
        {onPlay && <button title="自動播放（空白鍵）" aria-label="自動播放" aria-pressed={playing} onClick={onPlay}><Icon name={playing ? "pause" : "play"} /></button>}
        <div className="tb-cap">
          <span className="t">{caption}</span>
          {dots && (
            <span className="tb-dots">
              {Array.from({ length: dots.count }, (_, i) => (
                <i key={i} className={i === dots.cur ? "on" : i < dots.cur ? "done" : ""} onClick={() => dots.go(i)} />
              ))}
            </span>
          )}
        </div>
        {onNext && <button title="下一步（→）" aria-label="下一步" onClick={onNext}><Icon name="next" /></button>}
        {extra.length > 0 && <span className="tb-sep" />}
        {extra.map((b) => (
          <button key={b.label} className={b.mobileHidden ? "opt" : ""} title={b.label} aria-label={b.label} aria-pressed={b.pressed} onClick={b.onClick}><Icon name={b.icon} /></button>
        ))}
        <button title={theme === "day" ? "夜間" : "日間"} aria-label="切換日夜" onClick={toggle}><Icon name="theme" /></button>
      </div>
    </div>
  );
}
