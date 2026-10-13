import { useEffect, useMemo, useRef } from "react";
import { cylinder, depthOf, extrude, planOutline, rise, translateAlong, type Plane } from "../../../iso/iso-kit";
import { IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import ColumnField from "../../shared/ColumnField";
import { boardPlan, boardPlans, cellCenter, drawOrder } from "../../shared/board";
import { tileArt } from "../../06-wfc/figure/tileArt";
import { ROCK, SEA, STREET_TILES, type World } from "../../lib/world";
import { W } from "../model";
import type { Step } from "../steps";
import { BOARD, HEIGHT, LAYER_Z, P, PLATE, WIDTH } from "./view";

const LABEL =
  "一座由種子生成的島。地面是地形與森林；上方浮著一層透明圖層，畫著 BSP 分區框線、據點柱、道路橫條與巡迴路線，" +
  "據點用虛線垂到地面上的位置。首都周圍的 7 乘 5 格鋪著波函數塌縮生成的街道。";

const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const C = BOARD.cell;
const GLASS = boardPlan(BOARD, 2, 2);

function terrainOf(w: World, layers: string[]) {
  const on = (k: string) => layers.includes(k);
  const streets = new Set(on("streets") ? w.streetCells.filter((_, k) => w.streets[k] > 0) : []);
  const heights = w.elev.map((e, i) => {
    if (!on("terrain")) return 0.3;
    if (!w.land[i]) return 0.8;
    if (streets.has(i)) return 1.2;
    return 1.4 + (e - SEA) * 15 + (on("forest") && w.forest[i] ? 2.2 : 0);
  });
  const tones = w.elev.map((e, i) => (!on("terrain") ? "lo" : !w.land[i] ? "mid" : e > ROCK ? "hi" : "mid") as "lo" | "mid" | "hi");
  const cls = w.elev.map((_, i) => {
    if (!on("terrain")) return "mg-dim";
    if (!w.land[i]) return "mg-water";
    if (on("forest") && w.forest[i]) return "mg-green";
    return undefined;
  });
  return { heights, tones, cls, streets };
}

function graphArt(w: World) {
  const at2 = (t: number): Plane => {
    const cell = w.towns[t].cell;
    return cellCenter(BOARD, cell % W, Math.floor(cell / W));
  };
  const seen = new Map<string, number>();
  const bars = w.allRoads.map((e, k) => {
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    const lane = e.kind === "dup" ? (seen.get(key) ?? 0) + 1 : 0;
    if (e.kind === "dup") seen.set(key, lane);
    const [ax, ay] = at2(e.a);
    const [bx, by] = at2(e.b);
    const len = Math.hypot(bx - ax, by - ay);
    const [nx, ny] = [-(by - ay) / len, (bx - ax) / len];
    const off = lane * 2.4;
    const half = 0.8;
    const ring: Plane[] = [
      [ax + nx * (off - half), ay + ny * (off - half)],
      [bx + nx * (off - half), by + ny * (off - half)],
      [bx + nx * (off + half), by + ny * (off + half)],
      [ax + nx * (off + half), ay + ny * (off + half)],
    ];
    return { k, kind: e.kind, paths: extrude(ring, LAYER_Z, 1, P), depth: depthOf([(ax + bx) / 2, (ay + by) / 2, 0], P) };
  }).sort((a, b) => a.depth - b.depth);
  const towns = w.towns.map((t, k) => {
    const [x, y] = at2(k);
    const top = 1.4 + (w.elev[t.cell] - SEA) * 15;
    return { k, x, y, drop: rise([x, y], top, LAYER_Z, P), body: cylinder(x, y, k === w.capital ? 3.4 : 2.6, LAYER_Z - 0.4, k === w.capital ? 4 : 2.8, P, 22, 0.4), depth: depthOf([x, y, 0], P) };
  }).sort((a, b) => a.depth - b.depth);
  const zones = w.zones.map((z) => planOutline({ x: BOARD.x0 + z.x * C + 1, y: BOARD.y0 + z.y * C + 1, w: z.w * C - 2, d: z.h * C - 2, r: 1 }, LAYER_Z, P)).join("");
  const streetTiles = w.streetCells.map((cell, k) => {
    const [cx, cy] = cellCenter(BOARD, cell % W, Math.floor(cell / W));
    return { cell, depth: depthOf([cx, cy, 0], P), parts: w.streets[k] > 0 ? tileArt(cx, cy, C, STREET_TILES[w.streets[k]].sockets, 1.2, P).slice(1) : [] };
  }).sort((a, b) => a.depth - b.depth);
  const node = (t: number) => at2(t);
  return { bars, towns, zones, streetTiles, node };
}

const TOKEN = cylinder(0, 0, 1.8, LAYER_Z + 1, 2, P, 18, 0.3);
const SEG_T = 0.55;

export function readoutOf(step: Step) {
  return step.tag;
}

export default function PipelineFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const w = step.world;
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const on = (k: string) => step.layers.includes(k as never);

  const terrain = useMemo(() => terrainOf(w, step.layers), [w, step.layers]);
  const lit = useMemo(() => w.elev.map((_, i) => step.focus === "forest" && w.forest[i]), [w, step.focus]);
  const delays = useMemo(() => w.elev.map((_, i) => ((i % BOARD.cols) + Math.floor(i / BOARD.cols)) * 0.012), [w]);
  const art = useMemo(() => graphArt(w), [w]);

  // 巡迴路線：小圓塊沿著回路一段一段走，走完停在首都
  const token = useRef<SVGGElement>(null);
  const t = useRef(0);
  const total = SEG_T * w.tour.edges.length;
  const posAt = (time: number): Plane => {
    const seg = Math.min(w.tour.nodes.length - 2, Math.floor(time / SEG_T));
    const f = Math.min(1, time / SEG_T - seg);
    const [ax, ay] = art.node(w.tour.nodes[seg]);
    const [bx, by] = art.node(w.tour.nodes[seg + 1]);
    return [ax + (bx - ax) * f, ay + (by - ay) * f];
  };
  const kick = useLoop((dt, calm) => {
    if (!on("tour")) return false;
    t.current = calm ? total : Math.min(total, t.current + dt);
    const [x, y] = posAt(t.current);
    token.current?.setAttribute("transform", translateAlong(P, [x, y, 0]));
    return t.current < total;
  }, visible);
  useEffect(() => {
    t.current = step.focus === "tour" ? 0 : total;
    kick();
    say(readoutOf(step));
  }, [index, kick, say, step, total]);

  const [tx, ty] = posAt(t.current);

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.73 } as React.CSSProperties}>
      <Plate
        fig="Fig 7"
        title="總成 · 一顆種子的島"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "lit", label: "這一步新加的圖層" },
          { mark: "blue", label: "海 · 重走的道路" },
          { mark: "green", label: "森林" },
          { mark: "dashed", label: "據點垂到地面的位置" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />
            <ColumnField
              P={P}
              plans={PLANS}
              order={ORDER}
              heights={terrain.heights}
              tones={terrain.tones}
              cls={terrain.cls}
              lit={lit}
              delays={delays}
              stepKey={index}
              active={visible}
            />

            {on("streets") && art.streetTiles.map((s) => (
              <g key={`st${s.cell}`}>
                {s.parts.map((p, j) => <Solid key={j} paths={p.paths} tone="hi" crease="none" lit={step.focus === "streets"} />)}
              </g>
            ))}

            {on("towns") && (
              <g key={`layer${w.seed}`}>
                <Line d={planOutline(GLASS, LAYER_Z, P)} tone="faint" dashed />
                <Line d={art.zones} tone={step.focus === "towns" ? "mid" : "faint"} />
                {art.towns.map((t) => <Line key={`drop${t.k}`} d={t.drop} tone="lo" dashed />)}
                {on("roads") && art.bars.map((b) => (b.kind === "dup" && !on("tour") ? null : (
                  <Solid key={`bar${b.k}`} paths={b.paths} tone="mid" crease="none" className={b.kind === "dup" ? "mg-blue" : undefined} lit={step.focus === "roads" && b.kind !== "dup"} />
                )))}
                {art.towns.map((t) => (
                  <Solid key={`town${t.k}`} paths={t.body} tone="hi" lit={step.focus === "towns" || (t.k === w.capital && (step.focus === "streets" || step.focus === "tour"))} />
                ))}
                {on("tour") && (
                  <g ref={token} transform={translateAlong(P, [tx, ty, 0])}>
                    <Solid paths={TOKEN} tone="hi" lit />
                  </g>
                )}
              </g>
            )}
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
