import { Link } from "react-router-dom";
import { courses } from "../components/chapters";
import { useIsMobile } from "../components/useIsMobile";

export default function Home() {
  const mobile = useIsMobile();
  return (
    <article>
      <h1>等角機器圖 · 互動原理筆記</h1>
      <p>每章 = 一張會動的等角圖（一個機構對應一個概念）+ 逐步說明 + 一份文字筆記。</p>
      {courses.map((course) => (
        <section key={course.id}>
          <h2>{course.title}</h2>
          <p className="course-intro">{course.intro}</p>
          <ol className="chapters">
            {course.chapters.map((c) => (
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
        </section>
      ))}
    </article>
  );
}
