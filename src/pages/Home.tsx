import { Link } from "react-router-dom";
import { chapters } from "../components/chapters";
import { useIsMobile } from "../components/useIsMobile";

export default function Home() {
  const mobile = useIsMobile();
  return (
    <article>
      <h1>Claude Code 原理筆記</h1>
      <p>
        目標：理解 Claude Code 的核心機制，最後映射成一套給影視編劇用的 <b>Claude Film</b>。<br />
        每章 = 一個 three.js 互動場景 + 一份文字筆記 + 「對 Claude Film 的設計啟示」。
      </p>
      <ol className="chapters">
        {chapters.map((c) => (
          <li key={c.no} className={c.path ? "" : "todo"}>
            {mobile && c.path ? (
              // 手機版：整張卡片都是連結，方便點擊
              <Link to={c.path}>
                <span className="no">{c.no}</span>
                <span className="t">{c.title}</span>
                {c.film && <span className="film">{c.film}</span>}
              </Link>
            ) : (
              <>
                <span className="no">{c.no}</span>
                {c.path ? <Link to={c.path}>{c.title}</Link> : c.title}
                {c.film && <span className="film">{c.film}</span>}
              </>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
