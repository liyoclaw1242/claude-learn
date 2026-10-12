import * as React from "react";
import type { SolidPaths, Tone } from "../iso-kit";

/**
 * 形狀會逐幀改變的實體（例如拉開中的抽屜）。結構跟 <Solid> 一樣，
 * 但四個側面都固定渲染，好讓 setSolid() 直接改 d，不必重新渲染 React。
 */
export const LiveSolid = React.forwardRef<SVGGElement, { paths: SolidPaths; tone?: Tone; crease?: Tone | "none"; lit?: boolean }>(
  function LiveSolid({ paths, tone = "hi", crease = "faint", lit = false }, ref) {
    return (
      <g ref={ref} className="iso-solid" data-lit={lit ? "" : undefined}>
        <path className="iso-fill" data-part="fill" d={paths.fill} />
        {[0, 1, 2, 3].map((shade) => (
          <path key={shade} className="iso-shade" data-shade={shade} data-part={`shade${shade}`} d={paths.shades[shade] ?? ""} />
        ))}
        <path className="iso-top" data-part="top" d={paths.top} />
        {crease === "none" ? null : <path className="iso-line iso-crease" data-tone={crease} data-part="crease" d={paths.crease} />}
        <path className="iso-line iso-edge" data-tone={tone} data-part="outline" d={paths.outline} />
      </g>
    );
  },
);

export function setSolid(group: SVGGElement | null, paths: SolidPaths) {
  if (!group) return;
  const set = (part: string, d: string | undefined) => group.querySelector(`[data-part="${part}"]`)?.setAttribute("d", d ?? "");
  set("fill", paths.fill);
  paths.shades.forEach((d, shade) => set(`shade${shade}`, d));
  set("top", paths.top);
  set("crease", paths.crease);
  set("outline", paths.outline);
}
