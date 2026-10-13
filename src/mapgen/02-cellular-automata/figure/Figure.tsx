import { useEffect, useMemo, useRef } from "react";
import { cylinder, insetPlan, lineOnTop, planOutline, rise, sideMatrix, slabOf, translateAlong, type Plan } from "../../../iso/iso-kit";
import { Dots, FaceText, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import ColumnField from "../../shared/ColumnField";
import { boardPlans, drawOrder } from "../../shared/board";
import { W } from "../model";
import type { Step } from "../steps";
import { BOARD, COUNTER, COUNTER_H, FLOOR_H, HEIGHT, LENS_Z, P, PLATE, WALL_H, WIDTH, at } from "./view";

const LABEL =
  "一塊 30 乘 20 的洞穴棋盤，牆是高柱、地板是矮柱。棋盤上方懸著一個 3 乘 3 的放大鏡，示範每一格怎麼數周圍的牆；" +
  "右側的計數器顯示目前跑到第幾輪。每一輪，所有格子依規則同時更新。";

const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const C = BOARD.cell;

/* 放大鏡：以 (0, 0) 為中心格的 3×3 框，畫在原點，再整組平移到目標格 */
const LENS_OUTER: Plan = { x: -1.5 * C, y: -1.5 * C, w: 3 * C, d: 3 * C, r: 0.6 };
const BAR = 1.6;
const bars: Plan[] = [
  { x: LENS_OUTER.x, y: LENS_OUTER.y, w: LENS_OUTER.w, d: BAR, r: 0 },
  { x: LENS_OUTER.x, y: LENS_OUTER.y, w: BAR, d: LENS_OUTER.d, r: 0 },
  { x: LENS_OUTER.x + LENS_OUTER.w - BAR, y: LENS_OUTER.y, w: BAR, d: LENS_OUTER.d, r: 0 },
  { x: LENS_OUTER.x, y: LENS_OUTER.y + LENS_OUTER.d - BAR, w: LENS_OUTER.w, d: BAR, r: 0 },
];
const LENS = {
  bars: bars.map((b) => slabOf(b, LENS_Z, 1.6, P, 1)),
  grid: [-0.5, 0.5].flatMap((k) => [
    lineOnTop([k * C, LENS_OUTER.y + BAR], [k * C, LENS_OUTER.y + LENS_OUTER.d - BAR], LENS_Z + 0.4, P),
    lineOnTop([LENS_OUTER.x + BAR, k * C], [LENS_OUTER.x + LENS_OUTER.w - BAR, k * C], LENS_Z + 0.4, P),
  ]).join(""),
  center: planOutline({ x: -C / 2 + 0.8, y: -C / 2 + 0.8, w: C - 1.6, d: C - 1.6, r: 0 }, LENS_Z + 0.4, P),
  drops: [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]].map(([u, v]) => rise([u * C, v * C], WALL_H + 1, LENS_Z, P)).join(""),
  post: slabOf({ x: 1.5 * C - 1.2, y: -0.6, w: 2.4, d: 1.2, r: 0 }, LENS_Z + 1.6, 6, P, 1),
  knob: cylinder(1.5 * C, 0, 2.2, LENS_Z + 7.6, 2, P, 18),
};
const lensOffset = (i: number) => [BOARD.x0 + ((i % W) + 0.5) * C, BOARD.y0 + (Math.floor(i / W) + 0.5) * C] as const;

const CTR_TOP = COUNTER_H + 2;
const CTR = {
  plinth: slabOf(insetPlan(COUNTER, -2), 0, 2, P, 6, 0.5),
  body: slabOf(COUNTER, 2, COUNTER_H, P, 6, 1),
  window: planOutline(insetPlan(COUNTER, 4), CTR_TOP, P),
  label: sideMatrix([COUNTER.x + COUNTER.w, COUNTER.y + COUNTER.d - 5], 6.5, P, "right"),
  digit: sideMatrix([COUNTER.x + COUNTER.w, COUNTER.y + COUNTER.d - 5], 14.5, P, "right"),
  lampBase: cylinder(COUNTER.x + COUNTER.w / 2, COUNTER.y + 10, 3.4, CTR_TOP, 1.4, P, 20),
  lamp: cylinder(COUNTER.x + COUNTER.w / 2, COUNTER.y + 10, 2.2, CTR_TOP + 1.4, 1.4, P, 20),
};

export function readoutOf(step: Step) {
  const walls = step.grid.cells.filter((v) => v).length;
  return `${step.tag} · 牆 ${walls} / ${step.grid.cells.length}`;
}

export default function CaveFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const heights = useMemo(() => step.grid.cells.map((v) => (v ? WALL_H : FLOOR_H)), [step]);
  const lit = useMemo(() => {
    const set = new Set(step.lit ?? []);
    return step.grid.cells.map((_, i) => set.has(i));
  }, [step]);
  const cls = useMemo(() => {
    const set = new Set(step.red ?? []);
    return step.grid.cells.map((_, i) => (set.has(i) ? "mg-red" : undefined));
  }, [step]);
  const tones = useMemo(() => heights.map((h) => (h > FLOOR_H ? "hi" : "lo") as "hi" | "lo"), [heights]);
  const delays = useMemo(() => (step.sweep ? step.grid.cells.map((_, i) => i * 0.0022) : undefined), [step]);

  // 放大鏡平移到目標格
  const lensEl = useRef<SVGGElement>(null);
  const lensAt = useRef<[number, number]>(step.lens !== undefined ? [...lensOffset(step.lens)] : [0, 0]);
  const kick = useLoop((dt, calm) => {
    if (step.lens === undefined) return false;
    const [tx, ty] = lensOffset(step.lens);
    const p = lensAt.current;
    p[0] = follow(p[0], tx, dt, 0.25, calm);
    p[1] = follow(p[1], ty, dt, 0.25, calm);
    lensEl.current?.setAttribute("transform", translateAlong(P, [p[0], p[1], 0]));
    return p[0] !== tx || p[1] !== ty;
  }, visible);
  if (step.lens !== undefined && lensAt.current[0] === 0 && lensAt.current[1] === 0) lensAt.current = [...lensOffset(step.lens)];
  useEffect(() => { kick(); say(readoutOf(step)); }, [index, kick, say, step]);

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.88 } as React.CSSProperties}>
      <Plate
        fig="Fig 2"
        title="元胞自動機 · 洞穴棋盤"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "高柱 = 牆，矮柱 = 地板" },
          { mark: "lit", label: "這一步改變／被計數的格子" },
          { mark: "red", label: "錯誤或走不到的格子" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />
            <ColumnField P={P} plans={PLANS} order={ORDER} heights={heights} tones={tones} lit={lit} cls={cls} delays={delays} stepKey={index} active={visible} />

            {/* 輪數計數器 */}
            <g key="counter">
              <Solid paths={CTR.plinth} tone="lo" />
              <Solid paths={CTR.body} tone="mid" />
              <Line d={CTR.window} tone="lo" />
              <FaceText transform={CTR.label} size={3.2} tone="lo">ROUND</FaceText>
              <FaceText transform={CTR.digit} size={7} tone={step.round ? "hi" : "lo"}>{String(step.round ?? 0)}</FaceText>
              <Solid paths={CTR.lampBase} tone="mid" />
              <Solid paths={CTR.lamp} tone={step.sweep ? "hi" : "lo"} lit={!!step.sweep} />
              <Dots points={[at([COUNTER.x + 4, COUNTER.y + COUNTER.d - 4, CTR_TOP]), at([COUNTER.x + COUNTER.w - 4, COUNTER.y + COUNTER.d - 4, CTR_TOP])]} size={0.45} tone="mid" />
            </g>

            {/* 3×3 放大鏡 */}
            {step.lens !== undefined && (
              <g ref={lensEl} key="lens" transform={translateAlong(P, [lensAt.current[0], lensAt.current[1], 0])}>
                <Line d={LENS.drops} tone="faint" dashed />
                {LENS.bars.map((b, k) => <Solid key={k} paths={b} tone="hi" />)}
                <Line d={LENS.grid} tone="mid" />
                <Line d={LENS.center} tone="lit" />
                <Solid paths={LENS.post} tone="mid" />
                <Solid paths={LENS.knob} tone="hi" lit />
              </g>
            )}
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
