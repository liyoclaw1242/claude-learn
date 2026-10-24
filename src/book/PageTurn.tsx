import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { bookPath, courses } from "../components/chapters";

/** 全站的頁序：書桌 → 每本書的目錄 → 各課 */
const ORDER = ["/", ...courses.flatMap((c) => [bookPath(c), ...c.chapters.flatMap((ch) => (ch.path ? [ch.path] : []))])];
const coverOf = (path: string) => courses.find((c) => c.chapters.some((ch) => ch.path === path) || bookPath(c) === path)?.cover.color;

type Turn = { key: number; dir: 1 | -1; cover?: string };

/**
 * 換頁時蓋在書上的一張紙，繞著書脊翻過去。
 * 新的一頁已經畫好在底下，紙翻開就露出來；從書桌打開一本書時，翻起的是封面。
 */
export default function PageTurn() {
  const { pathname } = useLocation();
  const last = useRef(pathname);
  const [turn, setTurn] = useState<Turn | null>(null);

  useEffect(() => {
    const from = last.current;
    last.current = pathname;
    if (from === pathname || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const a = ORDER.indexOf(from), b = ORDER.indexOf(pathname);
    if (a < 0 || b < 0 || pathname === "/") return;
    const dir = b > a ? 1 : -1;
    setTurn({ key: Date.now(), dir, cover: from === "/" ? coverOf(pathname) : undefined });
  }, [pathname]);

  if (!turn) return null;
  return (
    <div className="turn-layer" aria-hidden key={turn.key}>
      <div className="turn-book">
        <div
          className={`leaf ${turn.dir > 0 ? "fwd" : "back"}${turn.cover ? " is-cover" : ""}`}
          style={turn.cover ? ({ "--cover": turn.cover } as React.CSSProperties) : undefined}
          onAnimationEnd={() => setTurn(null)}
        >
          <span className="leaf-front" />
          <span className="leaf-back" />
        </div>
      </div>
    </div>
  );
}
