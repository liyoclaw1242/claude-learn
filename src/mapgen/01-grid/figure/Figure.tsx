import { useEffect, useMemo, useRef } from "react";
import { cylinder, insetPlan, pathOf, radialTicks, ring, sideMatrix, slabOf, topMatrix } from "../../../iso/iso-kit";
import { Dots, FaceText, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import ColumnField from "../../shared/ColumnField";
import { baseArt, boardPlans, cellCenter, drawOrder } from "../../shared/board";
import { H, W } from "../model";
import { CENTER, type Step } from "../steps";
import { AZIMUTH, BOARD, CONSOLE, CONSOLE_H, DIAL, FLOOR_H, HEIGHT, LAMP, P, PEAK_H, PLATE, WALL_H, WIDTH, at } from "./view";

const LABEL =
  "一塊 16 乘 12 的棋盤，每一格是一根方柱，柱子的高度就是那格的數值：地板低、牆高。" +
  "右側控制台上有種子轉盤和種子數字；換種子，整張棋盤跟著重新生成。";

const BASE = baseArt(PLATE, P, 9, 4);
const TOP = CONSOLE_H + 3;
const CON = {
  plinth: slabOf(insetPlan(CONSOLE, -2), 0, 3, P, 6, 0.5),
  body: slabOf(CONSOLE, 3, CONSOLE_H, P, 6, 1),
  dial: cylinder(DIAL.x, DIAL.y, DIAL.r, TOP, DIAL.h, P, 48, 0.6),
  bezel: ring(DIAL.x, DIAL.y, DIAL.r - 1.8, TOP + DIAL.h, P, 48),
  ticks: radialTicks(DIAL.x, DIAL.y, DIAL.r - 2.6, 20, 5, TOP + DIAL.h, [1, 2.2], P),
  hub: ring(DIAL.x, DIAL.y, 1.2, TOP + DIAL.h, P, 14),
  lampBase: cylinder(LAMP.x, LAMP.y, 3.6, TOP, 1.6, P, 20),
  lamp: cylinder(LAMP.x, LAMP.y, 2.4, TOP + 1.6, 1.6, P, 20),
  text: sideMatrix([CONSOLE.x + CONSOLE.w, CONSOLE.y + CONSOLE.d - 5], 10, P, "right"),
  label: sideMatrix([CONSOLE.x + CONSOLE.w, CONSOLE.y + CONSOLE.d - 5], 15.5, P, "right"),
};
const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const ROW_Y = BOARD.y0 + H * BOARD.cell + 6;
const COL_X = BOARD.x0 - 6;

const needleAt = (turn: number) => {
  const a = turn * Math.PI * 2 - Math.PI / 2;
  const z = TOP + DIAL.h;
  return pathOf([at([DIAL.x, DIAL.y, z]), at([DIAL.x + Math.cos(a) * (DIAL.r - 3), DIAL.y + Math.sin(a) * (DIAL.r - 3), z])]);
};
const turnOf = (seed: Step["seed"], index: number) =>
  seed === null ? 0 : seed === "random" ? 0.37 + index * 0.11 : (seed % 100) / 100;

function heightsOf(step: Step) {
  if (step.mode === "height") return step.grid.cells.map((v) => FLOOR_H + v * (PEAK_H - FLOOR_H));
  if (step.mode === "neighbors") {
    return step.grid.cells.map((_, i) => {
      const dx = Math.abs((i % W) - CENTER[0]);
      const dy = Math.abs(Math.floor(i / W) - CENTER[1]);
      if (!dx && !dy) return 11;
      if (dx + dy === 1) return 7;
      if (dx <= 1 && dy <= 1) return 3.6;
      return FLOOR_H;
    });
  }
  return step.grid.cells.map((v) => (v ? WALL_H : FLOOR_H));
}

export function readoutOf(step: Step) {
  const seed = step.seed === null ? "" : step.seed === "random" ? "seed —（Math.random）" : `seed ${step.seed}`;
  if (step.mode === "height") return `${seed} · 高度 0–1`;
  if (step.mode === "neighbors") return `中心 (${CENTER[0]}, ${CENTER[1]}) · 8 鄰`;
  const walls = step.grid.cells.filter((v) => v === 1).length;
  return [seed, `牆 ${walls} / ${W * H}`, step.same ? "與 STEP 5 逐格相同" : ""].filter(Boolean).join(" · ");
}

export default function GridFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const heights = useMemo(() => heightsOf(step), [step]);
  const lit = useMemo(() => step.grid.cells.map((_, i) => !!step.lit?.includes(i)), [step]);
  const cls = useMemo(() => step.grid.cells.map((_, i) => (step.red?.has(i) ? "mg-red" : undefined)), [step]);
  const tones = useMemo(() => heights.map((h) => (h > FLOOR_H + 0.1 ? "hi" : "lo") as "hi" | "lo"), [heights]);
  // 用種子生成的步驟：依「先列後行」的生成順序一格一格長出來
  const generated = step.seed !== null && step.mode === "walls" && !step.same;
  const delays = useMemo(() => (generated ? step.grid.cells.map((_, i) => i * 0.0045) : undefined), [generated, step]);

  const needle = useRef<SVGPathElement>(null);
  const turn = useRef(turnOf(step.seed, index));
  const target = turnOf(step.seed, index);
  const kick = useLoop((dt, calm) => {
    turn.current = follow(turn.current, target, dt, 0.3, calm);
    needle.current?.setAttribute("d", needleAt(turn.current));
    return turn.current !== target;
  }, visible);
  useEffect(() => { kick(); say(readoutOf(step)); }, [index, kick, say, step]);

  const [fx, fy] = step.lit?.length ? [step.lit[0] % W, Math.floor(step.lit[0] / W)] : [-1, -1];

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.88 } as React.CSSProperties}>
      <Plate
        fig="Fig 1"
        title="網格 · 種子控制台"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "一根方柱 = 一格，高度 = 數值" },
          { mark: "lit", label: "這一步關注的格子" },
          { mark: "red", label: "和鄰格落差過大" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <path className="iso-halo" d={BASE.halo} />
            {BASE.feet.map((parts, i) => <g key={i}>{parts.map((p, k) => <Solid key={k} paths={p} tone={k ? "mid" : "lo"} />)}</g>)}
            <Solid paths={BASE.slab} tone="mid" />
            <Line d={BASE.groove} tone="lo" />
            <Line d={BASE.screws} tone="lo" />

            {/* 座標刻度：x 沿前緣、y 沿左緣 */}
            {Array.from({ length: W }, (_, x) => (
              <FaceText key={`x${x}`} transform={topMatrix([cellCenter(BOARD, x, 0)[0], ROW_Y], 0, P, "x")} size={3.6} anchor="middle" tone={x === fx ? "hi" : "lo"}>
                {x}
              </FaceText>
            ))}
            {Array.from({ length: H }, (_, y) => (
              <FaceText key={`y${y}`} transform={topMatrix([COL_X, cellCenter(BOARD, 0, y)[1] + 1.3], 0, P, "x")} size={3.6} anchor="middle" tone={y === fy ? "hi" : "lo"}>
                {y}
              </FaceText>
            ))}

            <ColumnField P={P} plans={PLANS} order={ORDER} heights={heights} tones={tones} lit={lit} cls={cls} delays={delays} stepKey={index} active={visible} />

            {/* 種子控制台 */}
            <g key="console">
              <Solid paths={CON.plinth} tone="lo" />
              <Solid paths={CON.body} tone="mid" />
              <FaceText transform={CON.label} size={3.4} tone="lo">SEED</FaceText>
              <FaceText transform={CON.text} size={6.4} tone={step.seed === null ? "faint" : "hi"}>
                {step.seed === null ? "----" : step.seed === "random" ? "????" : String(step.seed).padStart(4, "0")}
              </FaceText>
              <Solid paths={CON.dial} tone="hi" crease="lo" lit={generated} />
              <Line d={CON.bezel} tone="lo" />
              <Line d={CON.ticks.minor} tone="lo" />
              <Line d={CON.ticks.major} tone="mid" />
              <path ref={needle} className="iso-line" data-tone="hi" strokeWidth={1.1} d={needleAt(turn.current)} />
              <Line d={CON.hub} tone="mid" />
              <Solid paths={CON.lampBase} tone="mid" />
              <Solid paths={CON.lamp} tone={step.same ? "hi" : "lo"} lit={!!step.same} />
              <Dots points={[at([CONSOLE.x + 4, CONSOLE.y + 4, TOP]), at([CONSOLE.x + CONSOLE.w - 4, CONSOLE.y + 4, TOP])]} size={0.45} tone="mid" />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}

export { AZIMUTH };
