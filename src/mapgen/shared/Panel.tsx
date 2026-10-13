import type { ReactNode } from "react";

/** 文字版地圖：mark(x, y) 回傳 class 名稱就會上色 */
export function GridText({ rows, mark }: { rows: string[]; mark?: (x: number, y: number) => string | undefined }) {
  return (
    <pre className="mg-grid">
      {rows.map((row, y) => {
        const out: ReactNode[] = [];
        let run = "";
        let runCls: string | undefined;
        const flush = (key: number) => {
          if (!run) return;
          out.push(runCls ? <span key={key} className={runCls}>{run}</span> : run);
          run = "";
        };
        [...row].forEach((ch, x) => {
          const cls = mark?.(x, y);
          if (cls !== runCls) { flush(x); runCls = cls; }
          run += ch;
        });
        flush(row.length);
        return <div key={y}>{out}</div>;
      })}
    </pre>
  );
}

/** 參數 / 統計清單 */
export function Stats({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="mg-kv">
      {items.map(([k, v]) => [<dt key={`k${k}`}>{k}</dt>, <dd key={`v${k}`}>{v}</dd>])}
    </dl>
  );
}
