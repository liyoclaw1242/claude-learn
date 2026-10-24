import { Link } from "react-router-dom";
import Toolbar from "../book/Toolbar";
import { bookPath, courses } from "../components/chapters";

/** 書桌：兩本闔起來的書，點封面打開到目錄頁 */
export default function Home() {
  return (
    <div className="desk home">
      <header className="home-intro">
        <h1>等角機器圖 · 互動原理筆記</h1>
        <p>兩本立體書。每一課先讀、先猜，再看圖上的機器一步一步動。</p>
      </header>
      <div className="shelf">
        {courses.map((c) => (
          <Link key={c.id} to={bookPath(c)} className="cover-book" style={{ "--cover": c.cover.color } as React.CSSProperties}>
            <span className="cover">
              <span className="cover-frame">
                <span className="cover-kicker">非官方 · 互動原理筆記</span>
                <span className="cover-title">{c.cover.lines.map((l) => <span key={l}>{l}</span>)}</span>
                <span className="cover-tag">{c.cover.tagline}</span>
                <CoverArt id={c.id} />
                <span className="cover-foot"><span>{c.cover.vol}　·　{c.chapters.length} 課</span><span>{c.cover.topics}</span></span>
              </span>
            </span>
            <span className="cover-pages" aria-hidden />
            <span className="cover-hint">打開這本 →</span>
          </Link>
        ))}
      </div>
      <Toolbar caption="點一本書的封面打開" />
    </div>
  );
}

/** 封面上的小插圖：Claude 書是一疊卡片 + 機櫃，地圖書是一片高低不同的方柱 */
function CoverArt({ id }: { id: string }) {
  if (id === "map") {
    const hs = [1, 2, 3, 2, 1, 2, 4, 5, 3, 1, 3, 5, 6, 4, 2, 2, 3, 4, 3, 1];
    return (
      <svg className="cover-art" viewBox="0 0 220 120" aria-hidden>
        {hs.map((h, i) => {
          const x = i % 5, y = Math.floor(i / 5);
          const cx = 110 + (x - y) * 20, cy = 40 + (x + y) * 10;
          const t = h * 6;
          return (
            <g key={i}>
              <path d={`M${cx} ${cy - t}l20 10l-20 10l-20 -10z`} className="ca-top" />
              <path d={`M${cx - 20} ${cy + 10 - t}v${t}l20 10v${-t}z`} className="ca-l" />
              <path d={`M${cx + 20} ${cy + 10 - t}v${t}l-20 10v${-t}z`} className="ca-r" />
            </g>
          );
        })}
      </svg>
    );
  }
  return (
    <svg className="cover-art" viewBox="0 0 220 120" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => {
        const y = 92 - i * 9;
        return (
          <g key={i}>
            <path d={`M60 ${y}l40 -20l40 20l-40 20z`} className="ca-top" />
            <path d={`M20 ${y + 0}v0`} />
            <path d={`M60 ${y}v5l40 20v-5z`} className="ca-l" />
            <path d={`M140 ${y}v5l-40 20v-5z`} className="ca-r" />
          </g>
        );
      })}
      <path d="M150 40l30 -15l30 15l-30 15z" className="ca-top" />
      <path d="M150 40v45l30 15v-45z" className="ca-l" />
      <path d="M210 40v45l-30 15v-45z" className="ca-r" />
    </svg>
  );
}
