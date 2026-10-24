import { useState } from "react";
import type { Chapter, Course } from "../components/chapters";
import type { Lesson } from "../components/lesson";
import Rich from "./Rich";

const ABC = "ABC";
const q = (k: string) => new URLSearchParams(location.hash.split("?")[1] ?? "").get(k);

/**
 * 左頁：導言 → 核心公式 → 關鍵詞 → 先猜猜看 → 掀開答案。
 * 答案藏在一片可以掀起的紙片下；先勾選再掀開，對錯才會標出來。
 */
type Props = { course: Course; chapter: Chapter; lesson?: Lesson; page: number; onSeeFigure?: () => void };

export default function LessonPage({ course, chapter, lesson, page, onSeeFigure }: Props) {
  // 截圖用的初始狀態：?pick=1&flap=1
  const [pick, setPick] = useState<number | null>(() => (q("pick") ? Number(q("pick")) : null));
  const [flap, setFlap] = useState(() => q("flap") === "1");
  const [title, sub] = chapter.title.split("：");

  return (
    <div className="pg pg-left">
      <div className="pg-run"><span>{course.title}</span><span>LESSON {chapter.no}</span></div>
      <div className="pg-body">
        <div className="kicker">第 {chapter.no} 課</div>
        <h1 className="lesson-title">{title}</h1>
        {sub && <p className="lesson-sub">{sub}</p>}

        {lesson ? (
          <>
            <div className="lesson-intro">
              {lesson.intro.map((p, i) => <p key={i}><Rich text={p} /></p>)}
            </div>

            <section className="eq-box">
              <div className="label">核心公式</div>
              <div className="eq"><Rich text={lesson.eq} /></div>
              {lesson.eqNotes.map((n, i) => <p key={i}><Rich text={n} /></p>)}
            </section>

            <section className="keys">
              <div className="label">關鍵詞</div>
              <dl>
                {lesson.keys.map(([k, d]) => (
                  <div key={k}><dt><Rich text={k} /></dt><dd><Rich text={d} /></dd></div>
                ))}
              </dl>
            </section>

          </>
        ) : (
          <p className="lesson-intro">{chapter.film}</p>
        )}
      </div>
      {lesson && (
        <div className="pg-quiz">
          <section className="predict">
            <div className="label">先猜猜看</div>
            <p className="q"><Rich text={lesson.predict.q} /></p>
            <ul>
              {lesson.predict.a.map((a, i) => {
                const verdict = flap && pick !== null ? (i === lesson.predict.ok ? "right" : i === pick ? "wrong" : "") : "";
                return (
                  <li key={i}>
                    <button className={`opt-btn ${pick === i ? "picked" : ""} ${verdict}`} onClick={() => setPick(i)} aria-pressed={pick === i}>
                      <span className="box">{pick === i ? "✓" : ""}</span>
                      <span className="abc">{ABC[i]}</span>
                      <span><Rich text={a} /></span>
                      {verdict === "right" && <span className="mark">正解</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={`why${flap ? " open" : ""}`}>
            <div className="why-under">
              <div className="label">為什麼？</div>
              <p><Rich text={lesson.why} /></p>
            </div>
            <button className="flap" onClick={() => setFlap((f) => !f)} aria-expanded={flap}>
              <span className="label">為什麼？</span>
              <span className="flap-h">掀開看答案</span>
              <span className="flap-s">{pick === null ? "先勾一個選項再掀，比較有感覺" : `你選了 ${ABC[pick]}，掀開對答案`}</span>
              <span className="flap-hint">掀這裡 ↗</span>
            </button>
            {flap && <button className="flap-close" onClick={() => setFlap(false)}>蓋回去</button>}
          </section>
        </div>
      )}
      {onSeeFigure && <button className="see-fig" onClick={onSeeFigure}>翻到圖版，一步一步看 →</button>}
      <div className="pg-no">{page}</div>
    </div>
  );
}
