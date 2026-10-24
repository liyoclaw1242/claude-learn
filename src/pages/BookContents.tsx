import { Link, useParams } from "react-router-dom";
import Toolbar from "../book/Toolbar";
import { lessonFor } from "../book/lessons";
import { courses } from "../components/chapters";
import { useIsMobile } from "../components/useIsMobile";

/** 書的第一個跨頁：左頁目錄，右頁「這本書怎麼讀」 */
export default function BookContents() {
  const { id } = useParams();
  const course = courses.find((c) => c.id === id) ?? courses[0];
  const mobile = useIsMobile();
  const first = course.chapters.find((c) => c.path);

  const contents = (
    <div className="pg pg-left">
      <div className="pg-run"><span>{course.title}</span><span>目錄</span></div>
      <div className="pg-body">
        <div className="kicker">{course.cover.vol} · 目錄</div>
        <h1 className="lesson-title">{course.title}</h1>
        <p className="lesson-sub">{course.intro}</p>
        <ol className="toc">
          {course.chapters.map((c) => {
            const [t, sub] = c.title.split("：");
            const fig = c.path ? lessonFor(c.path)?.fig : undefined;
            return (
              <li key={c.no}>
                <Link to={c.path ?? "#"}>
                  <span className="toc-no">{c.no}</span>
                  <span className="toc-t">{t}<small>{sub}</small>{fig && <em>圖 {c.no}　{fig}</em>}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
      <div className="pg-no">2</div>
    </div>
  );

  const howto = (
    <div className="pg pg-right">
      <div className="pg-run"><span>怎麼讀這本書</span><span>{course.cover.vol}</span></div>
      <div className="pg-body">
        <div className="kicker">怎麼讀</div>
        <h2 className="howto-h">每一課是一個跨頁</h2>
        <ol className="howto">
          <li><b>左頁是課文。</b>先讀兩段導言、一條核心公式和幾個關鍵詞。</li>
          <li><b>先猜猜看。</b>勾一個答案，再掀開紙片對答案。猜錯的那一題通常最記得住。</li>
          <li><b>右頁是圖版。</b>一台等角機器，一個機構對應一個概念。按 ▶ 或方向鍵，看它一步一步動。</li>
          <li><b>現場狀態</b>是圖版背後的真實資料；<b>全文筆記</b>是夾在書裡的附錄，原理、陷阱與程式碼都在那裡。</li>
        </ol>
        <p className="howto-keys">← → 換步驟（走到底會翻頁）　空白鍵 自動播放　Esc 闔上附錄</p>
        {first?.path && <Link className="start" to={first.path}>從第 {first.no} 課開始 →</Link>}
      </div>
      <div className="pg-no">3</div>
    </div>
  );

  return (
    <div className="desk" style={{ "--cover": course.cover.color } as React.CSSProperties}>
      {mobile ? <div className="book single">{contents}{howto}</div> : <div className="book spread">{contents}<div className="spine" aria-hidden />{howto}</div>}
      <Toolbar course={course} caption={<><b>{course.cover.vol}</b>　{course.title} · 目錄</>} />
    </div>
  );
}
