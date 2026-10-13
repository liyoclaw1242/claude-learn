import { useEffect, useMemo, useRef } from "react";
import { cylinder, insetPlan, lineOnTop, pathOf, sideMatrix, slabOf, topMatrix, translateAlong } from "../../../iso/iso-kit";
import { FaceText, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import ColumnField from "../../shared/ColumnField";
import { boardPlans, drawOrder } from "../../shared/board";
import { LX, LY, S, SEA, biomeOf, grads, lattice } from "../model";
import type { Step } from "../steps";
import { BASE_H, BOARD, HEIGHT, MAX_H, MIXER, MIXER_H, P, PLATE, SLOT_LEN, SLOT_X0, SLOT_Y, WIDTH, at } from "./view";

const LABEL =
  "一塊 28 乘 21 的高度場棋盤，每根方柱的高度是那格的噪聲值。晶格點上會出現細柱（數值）或箭頭（梯度）。" +
  "右側的混音台有 4 根推桿，代表疊加的 4 個八度，推起的推桿越多，地形細節越多。";

const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const SPAN = S * BOARD.cell;
const latticeAt = (i: number): [number, number] => [BOARD.x0 + (i % LX) * SPAN, BOARD.y0 + Math.floor(i / LX) * SPAN];
const LAT = Array.from({ length: LX * LY }, (_, i) => i).sort((a, b) => {
  const [ax, ay] = latticeAt(a);
  const [bx, by] = latticeAt(b);
  return ax + ay - (bx + by);
});

/* 晶格點上的細柱（value noise） */
const POSTS = LAT.map((i) => {
  const [x, y] = latticeAt(i);
  const h = BASE_H + lattice[i] * MAX_H;
  return { i, rod: cylinder(x, y, 0.9, 0, h, P, 12), cap: cylinder(x, y, 1.9, h, 1.2, P, 16) };
});

/* 晶格點上的梯度箭頭 */
const ARROW_Z = BASE_H + 1.2;
const ARROWS = LAT.map((i) => {
  const [x, y] = latticeAt(i);
  const [gx, gy] = grads[i];
  const len = SPAN * 0.42;
  const tip: [number, number] = [x + gx * len, y + gy * len];
  const back = (side: number): [number, number] => [tip[0] - gx * 4 + -gy * 2.4 * side, tip[1] - gy * 4 + gx * 2.4 * side];
  return {
    i,
    pivot: cylinder(x, y, 2, BASE_H, 1.2, P, 18),
    shaft: lineOnTop([x, y], tip, ARROW_Z, P),
    head: pathOf([back(1), tip, back(-1)].map(([u, v]) => at([u, v, ARROW_Z]))),
  };
});

/* 混音台 */
const MIX_TOP = MIXER_H + 2;
const MIX = {
  plinth: slabOf(insetPlan(MIXER, -2), 0, 2, P, 6, 0.5),
  body: slabOf(MIXER, 2, MIXER_H, P, 6, 1),
  slots: SLOT_Y.map((y) => slabOf({ x: SLOT_X0 - 1, y: y - 1, w: SLOT_LEN + 2, d: 2, r: 1 }, MIX_TOP - 0.4, 0.4, P, 4)),
  ticks: SLOT_Y.map((y) => [0, 0.25, 0.5, 1].map((t) => lineOnTop([SLOT_X0 + t * SLOT_LEN, y + 2.2], [SLOT_X0 + t * SLOT_LEN, y + 3.4], MIX_TOP, P)).join("")).join(""),
  labels: SLOT_Y.map((y) => topMatrix([MIXER.x + MIXER.w - 3, y + 1.3], MIX_TOP, P, "x")),
  side: sideMatrix([MIXER.x + MIXER.w, MIXER.y + MIXER.d - 6], 7, P, "right"),
};
const KNOB = { x: -2, y: -2.6, w: 4, d: 5.2, r: 0.8 };
const knobPaths = slabOf(KNOB, MIX_TOP, 3, P, 4, 0.4);
const AMPS = ["1", "½", "¼", "⅛"];
const knobTarget = (k: number, octaves: number) => (k < octaves ? 1 / 2 ** k : 0);

function heightsOf(step: Step) {
  if (!step.biomes) return step.heights.map((e) => BASE_H + e * MAX_H);
  return step.heights.map((e) => BASE_H + Math.max(e, SEA) * MAX_H);
}

export function readoutOf(step: Step) {
  if (step.biomes) {
    const water = step.heights.filter((e) => e < SEA).length;
    return `${step.tag} · 水 ${Math.round((water / step.heights.length) * 100)}%`;
  }
  return step.tag;
}

export default function NoiseFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const heights = useMemo(() => heightsOf(step), [step]);
  const cls = useMemo(() => (step.biomes ? step.heights.map((e) => (e < SEA ? "mg-water" : undefined)) : undefined), [step]);
  const tones = useMemo(
    () => step.heights.map((e) => {
      if (!step.biomes) return "mid";
      const b = biomeOf(e);
      return b === "rock" ? "hi" : b === "grass" ? "mid" : "lo";
    }) as ("hi" | "mid" | "lo")[],
    [step],
  );
  // 從遠到近依對角線推進，像一道掃過棋盤的波
  const delays = useMemo(() => step.heights.map((_, i) => ((i % BOARD.cols) + Math.floor(i / BOARD.cols)) * 0.018), [step]);

  const knobs = useRef<(SVGGElement | null)[]>([]);
  const amp = useRef<number[]>(SLOT_Y.map((_, k) => knobTarget(k, step.octaves)));
  const kick = useLoop((dt, calm) => {
    let busy = false;
    amp.current.forEach((a, k) => {
      const t = knobTarget(k, step.octaves);
      amp.current[k] = follow(a, t, dt, 0.25, calm);
      busy ||= amp.current[k] !== t;
      knobs.current[k]?.setAttribute("transform", translateAlong(P, [SLOT_X0 + amp.current[k] * SLOT_LEN, SLOT_Y[k], 0]));
    });
    return busy;
  }, visible);
  useEffect(() => { kick(); say(readoutOf(step)); }, [index, kick, say, step]);

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.78 } as React.CSSProperties}>
      <Plate
        fig="Fig 3"
        title="柏林噪聲 · 高度場與八度混音台"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "方柱高度 = 噪聲值" },
          { mark: "lit", label: "晶格點：數值或梯度" },
          { mark: "blue", label: "海平面以下" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />
            <ColumnField P={P} plans={PLANS} order={ORDER} heights={heights} tones={tones} cls={cls} delays={delays} stepKey={index} active={visible} />

            {step.lattice === "values" && POSTS.map((p) => (
              <g key={`post${p.i}`}>
                <Solid paths={p.rod} tone="mid" crease="none" />
                <Solid paths={p.cap} tone="hi" lit />
              </g>
            ))}
            {step.lattice === "gradients" && ARROWS.map((a) => (
              <g key={`arrow${a.i}`}>
                <Solid paths={a.pivot} tone="hi" />
                <Line d={a.shaft} tone="lit" />
                <Line d={a.head} tone="lit" />
              </g>
            ))}

            {/* 八度混音台 */}
            <g key="mixer">
              <Solid paths={MIX.plinth} tone="lo" />
              <Solid paths={MIX.body} tone="mid" />
              <FaceText transform={MIX.side} size={3.6} tone="lo">OCTAVES</FaceText>
              {MIX.slots.map((s, k) => <Solid key={k} paths={s} tone="lo" crease="none" />)}
              <Line d={MIX.ticks} tone="lo" />
              {MIX.labels.map((m, k) => <FaceText key={k} transform={m} size={3.4} tone={k < step.octaves ? "hi" : "lo"} anchor="middle">{AMPS[k]}</FaceText>)}
              {SLOT_Y.map((y, k) => (
                <g key={`knob${k}`} ref={(el) => { knobs.current[k] = el; }} transform={translateAlong(P, [SLOT_X0 + amp.current[k] * SLOT_LEN, y, 0])}>
                  <Solid paths={knobPaths} tone={k < step.octaves ? "hi" : "lo"} lit={k < step.octaves} />
                </g>
              ))}
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
