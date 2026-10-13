import type { Plan, Projection } from "../../iso/iso-kit";
import { Line, Solid } from "../../iso/react/draw";
import { baseArt } from "./board";

const cache = new Map<string, ReturnType<typeof baseArt>>();

/** 棋盤底座（四腳 + 厚板 + 溝線），同一組參數只算一次 */
export default function BaseSlab({ plan, P, thick = 9, foot = 4 }: { plan: Plan; P: Projection; thick?: number; foot?: number }) {
  const key = `${plan.x},${plan.y},${plan.w},${plan.d},${P.scale},${P.azimuth},${thick}`;
  let art = cache.get(key);
  if (!art) { art = baseArt(plan, P, thick, foot); cache.set(key, art); }
  return (
    <g key="base">
      <path className="iso-halo" d={art.halo} />
      {art.feet.map((parts, i) => <g key={i}>{parts.map((p, k) => <Solid key={k} paths={p} tone={k ? "mid" : "lo"} />)}</g>)}
      <Solid paths={art.slab} tone="mid" />
      <Line d={art.groove} tone="lo" />
      <Line d={art.screws} tone="lo" />
    </g>
  );
}
