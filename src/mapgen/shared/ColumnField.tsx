import { useEffect, useMemo, useRef } from "react";
import type { Plan, Projection, SolidPaths, Tone } from "../../iso/iso-kit";
import { follow, useLoop } from "../../iso/react/live";
import { columnPaths } from "./board";

type Props = {
  P: Projection;
  plans: Plan[];
  order: number[];
  /** 每格的目標高度；換步驟時從目前高度平滑長到目標 */
  heights: number[];
  /** 每格的底面高度（預設 0） */
  base?: number[];
  tones?: Tone[];
  lit?: boolean[];
  /** 額外 class，例如 mg-water（藍邊）、mg-red（紅邊）、mg-ghost（只畫線） */
  cls?: (string | undefined)[];
  /** 換步驟後每格延遲幾秒才開始動，用來呈現「掃描順序」或「波紋傳播」 */
  delays?: number[];
  seconds?: number;
  /** 不畫高度為 0 以下的格子 */
  hideBelow?: number;
  stepKey: number;
  active: boolean;
};

const PARTS = ["fill", "s0", "s1", "s2", "s3", "top", "outline"] as const;
const dOf = (p: SolidPaths) => [p.fill, p.shades[0] ?? "", p.shades[1] ?? "", p.shades[2] ?? "", p.shades[3] ?? "", p.top, p.outline];

/**
 * 一整片方柱。高度變化在 requestAnimationFrame 裡直接改 path 的 d，不經過 React，
 * 數百格同時長高也不會卡。第一次掛載（含網址直接指定步驟）直接停在目標高度。
 */
export default function ColumnField({
  P, plans, order, heights, base, tones, lit, cls, delays, seconds = 0.28, hideBelow, stepKey, active,
}: Props) {
  const cur = useRef<number[]>(null!);
  if (!cur.current || cur.current.length !== heights.length) cur.current = [...heights];
  const els = useRef<(SVGGElement | null)[]>([]);
  const since = useRef(0);

  const kick = useLoop((dt, calm) => {
    since.current += dt;
    let busy = false;
    const h = cur.current;
    for (let i = 0; i < h.length; i++) {
      if (h[i] === heights[i]) continue;
      busy = true;
      if (delays && since.current < delays[i] && !calm) continue;
      h[i] = follow(h[i], heights[i], dt, seconds, calm);
      const g = els.current[i];
      if (!g) continue;
      const d = dOf(columnPaths(plans[i], base?.[i] ?? 0, h[i], P));
      for (let k = 0; k < PARTS.length; k++) g.children[k]?.setAttribute("d", d[k]);
      if (hideBelow !== undefined) g.style.display = h[i] <= hideBelow ? "none" : "";
    }
    return busy;
  }, active);

  useEffect(() => {
    since.current = 0;
    kick();
  }, [stepKey, kick]);

  // React 只在 tone / lit / class 變動時重畫；d 用當下的動畫高度算，避免跳格
  const initial = useMemo(
    () => cur.current.map((h, i) => dOf(columnPaths(plans[i], base?.[i] ?? 0, h, P))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plans, P],
  );

  return (
    <g className="mg-field">
      {order.map((i) => {
        const d = initial[i];
        const hidden = hideBelow !== undefined && cur.current[i] <= hideBelow;
        return (
          <g
            key={i}
            ref={(el) => { els.current[i] = el; }}
            className={cls?.[i] ? `iso-solid ${cls[i]}` : "iso-solid"}
            data-lit={lit?.[i] ? "" : undefined}
            style={hidden ? { display: "none" } : undefined}
          >
            <path className="iso-fill" d={d[0]} />
            {[0, 1, 2, 3].map((s) => <path key={s} className="iso-shade" data-shade={s} d={d[1 + s]} />)}
            <path className="iso-top" d={d[5]} />
            <path className="iso-line iso-edge" data-tone={tones?.[i] ?? "mid"} d={d[6]} />
          </g>
        );
      })}
    </g>
  );
}
