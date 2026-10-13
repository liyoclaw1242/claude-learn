import { useEffect, useMemo, useRef } from "react";
import { cylinder, depthOf, extrude, topMatrix, translateAlong, type Plane } from "../../../iso/iso-kit";
import { FaceText, IsoFigure, Plate, Solid } from "../../../iso/react/draw";
import { useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import ColumnField from "../../shared/ColumnField";
import { boardPlans, drawOrder } from "../../shared/board";
import { START, degOf, dungeon, euler, fullEdges, graphEdges, nodes, odd } from "../model";
import type { Step } from "../steps";
import { BAR_H, BAR_Z, BOARD, HEIGHT, P, PED_H, PED_R, PLATE, WIDTH } from "./view";

const LABEL =
  "第 04 章的地牢被抽象成一張圖：每間房中央立一根柱子（節點），柱子上的數字是度數；柱子之間的橫條是走廊（邊），" +
  "藍邊的橫條是需要重走的走廊。最後一個小圓塊沿著歐拉回路走遍每條邊、回到起點。";

const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const C = BOARD.cell;
const world = (n: number): Plane => [BOARD.x0 + nodes[n][0] * C, BOARD.y0 + nodes[n][1] * C];

/* 邊：沿兩節點連線的細長方塊；重走的邊往旁邊平移，和原本的邊並排 */
const seen = new Map<string, number>();
const BARS = fullEdges.map((e, k) => {
  const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
  const lane = e.kind === "dup" ? (seen.get(key) ?? 0) + 1 : 0;
  if (e.kind === "dup") seen.set(key, lane);
  const [ax, ay] = world(e.a);
  const [bx, by] = world(e.b);
  const len = Math.hypot(bx - ax, by - ay);
  const [ux, uy] = [(bx - ax) / len, (by - ay) / len];
  const [nx, ny] = [-uy, ux];
  const off = lane * 3;
  const half = 1.1;
  const ring: Plane[] = [
    [ax + nx * (off - half), ay + ny * (off - half)],
    [bx + nx * (off - half), by + ny * (off - half)],
    [bx + nx * (off + half), by + ny * (off + half)],
    [ax + nx * (off + half), ay + ny * (off + half)],
  ];
  const mid: [number, number, number] = [(ax + bx) / 2 + nx * off, (ay + by) / 2 + ny * off, 0];
  return { k, paths: extrude(ring, BAR_Z, BAR_H, P), depth: depthOf(mid, P) };
});
const BAR_ORDER = [...BARS].sort((a, b) => a.depth - b.depth).map((b) => b.k);

const PEDS = nodes.map((_, n) => {
  const [x, y] = world(n);
  return {
    n,
    body: cylinder(x, y, PED_R, 0, PED_H, P, 28, 0.5),
    text: topMatrix([x + 0.6, y + 2.2], PED_H, P, "x"),
    depth: depthOf([x, y, 0], P),
  };
}).sort((a, b) => a.depth - b.depth);

const TOKEN = cylinder(0, 0, 2.4, PED_H + 0.4, 2.2, P, 22, 0.4);
const SEG_T = 0.42;
const tokenAt = (t: number): Plane => {
  const seg = Math.min(euler.nodes.length - 2, Math.floor(t / SEG_T));
  const f = Math.min(1, t / SEG_T - seg);
  const [ax, ay] = world(euler.nodes[seg]);
  const [bx, by] = world(euler.nodes[seg + 1]);
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
};
const RUN_T = SEG_T * euler.edges.length;
/** 每條邊在回路裡第一次被走到的時間 */
const passAt = new Map<number, number>();
euler.edges.forEach((k, i) => passAt.set(k, (i + 1) * SEG_T));

const HEIGHT_OF = [0.6, 3.4, 2.2, 5.5];

function edgeState(step: Step, k: number) {
  const e = fullEdges[k];
  const visible = e.kind === "tree" || (e.kind === "loop" && step.edges !== "tree") || (e.kind === "dup" && step.edges === "dup");
  let lit = step.litKind === e.kind;
  let done = false;
  if (typeof step.loops === "number" && step.loops > 0) {
    const cur = euler.loops[step.loops - 1].edges;
    lit = cur.includes(k);
    done = euler.loops.slice(0, step.loops - 1).some((l) => l.edges.includes(k));
  }
  return { visible, lit, done };
}

export function readoutOf(step: Step) {
  return step.tag;
}

export default function EulerFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const heights = useMemo(() => dungeon.map((t) => (step.dungeon ? HEIGHT_OF[t] : 0.35)), [step]);
  const tones = useMemo(() => dungeon.map((t) => (step.dungeon ? (["lo", "hi", "mid", "mid"] as const)[t] : "lo")), [step]);
  const cls = useMemo(() => dungeon.map((t) => (!step.dungeon || t === 0 ? "mg-dim" : undefined)), [step]);
  const deg = useMemo(() => degOf(step.edges === "dup" ? fullEdges : graphEdges), [step]);
  const oddSet = useMemo(() => new Set(step.markOdd ? odd : []), [step]);

  const bars = useRef<(SVGGElement | null)[]>([]);
  const token = useRef<SVGGElement>(null);
  const t = useRef(step.loops === "run" ? RUN_T : 0);
  const kick = useLoop((dt, calm) => {
    if (step.loops !== "run") return false;
    t.current = calm ? RUN_T : Math.min(RUN_T, t.current + dt);
    const [x, y] = tokenAt(t.current);
    token.current?.setAttribute("transform", translateAlong(P, [x, y, 0]));
    passAt.forEach((when, k) => {
      const el = bars.current[k];
      if (!el) return;
      if (t.current >= when) el.setAttribute("data-lit", "");
      else el.removeAttribute("data-lit");
    });
    return t.current < RUN_T;
  }, visible);
  useEffect(() => {
    t.current = 0;
    kick();
    say(readoutOf(step));
  }, [index, kick, say, step]);

  const [sx, sy] = step.loops === "run" ? tokenAt(t.current) : world(START);
  const showToken = step.loops !== 0;

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.83 } as React.CSSProperties}>
      <Plate
        fig="Fig 5"
        title="圖 · 歐拉回路"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "柱子 = 房間（數字 = 度數）· 橫條 = 走廊" },
          { mark: "lit", label: "這一步新增／正在走的邊" },
          { mark: "blue", label: "重走的走廊" },
          { mark: "red", label: "奇數度節點" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />
            <ColumnField P={P} plans={PLANS} order={ORDER} heights={heights} tones={tones} cls={cls} stepKey={index} active={visible} seconds={0.3} />

            {BAR_ORDER.map((k) => {
              const s = edgeState(step, k);
              if (!s.visible) return null;
              const kind = fullEdges[k].kind;
              const className = s.done ? "mg-green" : kind === "dup" ? "mg-blue" : undefined;
              return (
                <g key={`bar${k}-${index}`} ref={(el) => { bars.current[k] = el; }}>
                  <Solid paths={BARS[k].paths} tone="mid" lit={step.loops === "run" ? false : s.lit} className={className} />
                </g>
              );
            })}

            {PEDS.map((p) => (
              <g key={`ped${p.n}`}>
                <Solid paths={p.body} tone="hi" lit={showToken && p.n === START} className={oddSet.has(p.n) ? "mg-red" : undefined} />
                {!step.degrees && <FaceText transform={p.text} size={3.6} tone="mid" anchor="middle">{`R${p.n}`}</FaceText>}
                {step.degrees && (
                  <FaceText transform={p.text} size={5.6} tone="hi" anchor="middle">{String(deg[p.n])}</FaceText>
                )}
              </g>
            ))}

            {showToken && (
              <g ref={token} key="token" transform={translateAlong(P, [sx, sy, 0])}>
                <Solid paths={TOKEN} tone="hi" lit />
              </g>
            )}
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
