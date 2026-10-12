import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "./figure.css";
import { FLOORS, type FloorId, type Spot, type Step } from "../steps";
import {
  BASE_ART, CAB_ART, CARD_ART, DESK_ART, FILES_ART, LIFT_ART, RAIL_ART, SLED_ART, SUB_ART, TOWER_ART, trayArt,
} from "./geometry";
import {
  CARD_Z, HEIGHT, LIFT_X, LINES, OPEN, P, RAIL_Y, SPOT_X, TOTAL_LINES, WIDTH, floorZ, isFloor,
} from "./view";

const LABEL =
  "一座抽屜塔，代表 claude_film.py：由下往上八層托盤，各是一章的機制，托盤高度跟那段程式碼的行數成正比，第 07 層是空的虛線托盤。" +
  "塔前方一條導軌，滑台把一張卡送到各站：左邊導演的終端台、series 檔案櫃，右邊模型機櫃與子代理小卡架；塔右前方的升降梯把卡送上各層。";

const ORDER: FloorId[] = ["f01", "f02", "f03", "f04", "f05", "f06", "f07", "f08"];
const SPEED = 110;
const DWELL = 0.7;
/** 卡在升降叉上時比在滑台上高一點（叉子的厚度） */
const FORK = 1.6;

const SPOT_NAME: Record<string, string> = { director: "導演", disk: "series/", model: "模型", sub: "子代理" };
const nameOf = (spot: Spot) => (isFloor(spot) ? `第 ${spot.slice(1)} 層` : SPOT_NAME[spot]);

type Point = { x: number; z: number; spot?: Spot };
const posOf = (spot: Spot): Point => (isFloor(spot) ? { x: LIFT_X, z: floorZ(spot), spot } : { x: SPOT_X[spot], z: CARD_Z, spot });

/** 把一串站點展開成卡實際走的折線：樓層之間只走升降梯，進出升降梯一定經過導軌上的升降點 */
function routeOf(flow: Spot[]): Point[] {
  const out: Point[] = [];
  const lift: Point = { x: LIFT_X, z: CARD_Z + FORK };
  flow.forEach((spot, i) => {
    const next = posOf(spot);
    if (i > 0) {
      const prev = flow[i - 1];
      if (isFloor(prev) !== isFloor(next.spot!)) out.push({ ...lift });
    }
    out.push(next);
  });
  // 回到起點，形成循環
  if (flow.length > 1 && flow[0] !== flow[flow.length - 1]) {
    const first = posOf(flow[0]);
    if (isFloor(flow[flow.length - 1]) !== isFloor(flow[0])) out.push({ ...lift });
    out.push(first);
  }
  return out;
}

/** 時間制的路徑：每段依長度花時間，在真正的站點停一下 */
function timeline(route: Point[]) {
  const legs: { a: Point; b: Point; t0: number; t1: number }[] = [];
  let t = 0;
  for (let i = 0; i < route.length; i++) {
    const p = route[i];
    if (p.spot) { legs.push({ a: p, b: p, t0: t, t1: t + DWELL }); t += DWELL; }
    const q = route[i + 1];
    if (!q) break;
    const len = Math.hypot(q.x - p.x, q.z - p.z);
    legs.push({ a: p, b: q, t0: t, t1: t + len / SPEED });
    t += len / SPEED;
  }
  return { legs, total: Math.max(t, 0.001) };
}

function sample(legs: ReturnType<typeof timeline>["legs"], t: number) {
  const leg = legs.find((l) => t <= l.t1) ?? legs[legs.length - 1];
  const k = leg.t1 > leg.t0 ? Math.min(1, Math.max(0, (t - leg.t0) / (leg.t1 - leg.t0))) : 1;
  const e = k * k * (3 - 2 * k);
  return { x: leg.a.x + (leg.b.x - leg.a.x) * e, z: leg.a.z + (leg.b.z - leg.a.z) * e, dwell: leg.a === leg.b ? leg.a.spot : undefined };
}

export default function PrototypeFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const built = useMemo(() => new Set(step.built), [step.built]);
  const route = useMemo(() => routeOf(step.flow ?? ["director"]), [step.flow]);
  const { legs, total } = useMemo(() => timeline(route), [route]);
  const running = Boolean(step.flow && step.flow.length > 1);
  const fullRun = !step.focus && running;

  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const trays = useRef(new Map<FloorId, SVGGElement | null>());
  const card = useRef<SVGGElement>(null);
  const sled = useRef<SVGGElement>(null);
  const car = useRef<SVGGElement>(null);

  // 第一次掛載直接停在這一步的定位；新蓋好的那層從前方滑進來
  const state = useRef<{ open: Map<FloorId, number>; clock: number; mounted: boolean }>(null!);
  if (!state.current) {
    state.current = { open: new Map(ORDER.map((id) => [id, id === step.focus ? OPEN : 0])), clock: 0, mounted: false };
  }
  const s0 = state.current;
  for (const id of ORDER) {
    if (!built.has(id)) s0.open.set(id, 0);
    else if (s0.mounted && s0.open.get(id) === 0 && id === step.focus && !trays.current.get(id)) s0.open.set(id, OPEN + 26);
  }
  useEffect(() => { state.current.mounted = true; });
  useEffect(() => { state.current.clock = 0; }, [index]);

  const readoutOf = (dwell?: Spot) => {
    if (fullRun) return dwell ? `完整一輪 · ${nameOf(dwell)}` : "完整一輪 · 移動中";
    const floor = FLOORS.find((f) => f.id === step.focus);
    if (!floor) return `claude_film.py · ${TOTAL_LINES} 行`;
    if (floor.ghost) return `第 ${floor.ch} 層 · 留給你加`;
    return `第 ${floor.ch} 層 · ${LINES[floor.id]} 行 / ${TOTAL_LINES}`;
  };

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    if (running && !calm) s.clock = (s.clock + dt) % total;
    const p = running && !calm ? sample(legs, s.clock) : { x: route[0].x, z: route[0].z, dwell: route[0].spot };

    card.current?.setAttribute("transform", translateAlong(P, [p.x, RAIL_Y, p.z]));
    // 滑台跟著卡走；卡被升降叉帶上去時，滑台停在升降點下方
    const onRail = p.z <= CARD_Z + FORK + 0.01;
    sled.current?.setAttribute("transform", translateAlong(P, [onRail ? p.x : LIFT_X, 0, 0]));
    const atLift = Math.abs(p.x - LIFT_X) < 0.5;
    car.current?.setAttribute("transform", translateAlong(P, [0, 0, atLift ? Math.max(CARD_Z, p.z - FORK) : CARD_Z]));

    let busy = running && !calm;
    for (const id of ORDER) {
      if (!built.has(id)) continue;
      const target = id === step.focus ? OPEN : fullRun && p.dwell === id ? 9 : 0;
      const now = follow(s.open.get(id) ?? 0, target, dt, 0.22, calm);
      s.open.set(id, now);
      busy ||= now !== target;
      trays.current.get(id)?.setAttribute("transform", translateAlong(P, [0, now, 0]));
    }
    say(readoutOf(p.dwell));
    return busy;
  }, visible);
  useEffect(() => { kick(); }, [index, kick]);

  const start = route[0];
  const focusFirst = [...ORDER].filter((id) => built.has(id)).sort((a, b) => (a === step.focus ? 1 : 0) - (b === step.focus ? 1 : 0));

  return (
    <div className="iso ch10-fig">
      <Plate
        fig="Fig 10"
        title="claude_film.py · 抽屜塔"
        hint="← → 切換步驟"
        readout={readoutOf(start.spot)}
        keys={[
          { mark: "lit", label: "這一步拉出的那一層" },
          { mark: "raised", label: "托盤高度 ∝ 那段程式碼的行數" },
          { mark: "dashed", label: "第 07 層：留給你加的 skills" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            {/* 底座 */}
            <g key="base">
              <path className="iso-halo" d={BASE_ART.halo} />
              {BASE_ART.feet.map((parts, i) => <g key={i}>{parts.map((p, k) => <Solid key={k} paths={p} tone={k ? "mid" : "lo"} />)}</g>)}
              <Solid paths={BASE_ART.slab} tone="mid" />
              <Line d={BASE_ART.groove} tone="lo" />
              <Line d={BASE_ART.screwRings} tone="lo" />
              <Dots points={BASE_ART.screws} size={0.5} tone="mid" />
            </g>

            {/* 導演的終端台 */}
            <g key="desk">
              <path className="iso-halo" d={DESK_ART.halo} />
              <Solid paths={DESK_ART.body} tone="mid" inner={<Line d={DESK_ART.seam} tone="faint" />} />
              <Solid paths={DESK_ART.stand} tone="mid" />
              <Solid paths={DESK_ART.screen} tone="hi" />
              <Line d={DESK_ART.glass} tone="lo" />
              <Line d={DESK_ART.prompt} tone="mid" free />
              <Solid paths={DESK_ART.keys} tone="mid" />
              <Dots points={DESK_ART.keyDots} size={0.5} tone="lo" />
            </g>

            {/* series/ 檔案櫃 */}
            <g key="files">
              <path className="iso-halo" d={FILES_ART.halo} />
              <Solid paths={FILES_ART.body} tone="mid" />
              {FILES_ART.drawers.map((d, i) => (
                <g key={i}><Solid paths={d.front} tone="hi" /><Solid paths={d.pull} tone="mid" /><Line d={d.holder} tone="lo" /></g>
              ))}
              <Solid paths={FILES_ART.top} tone="mid" />
              <Dots points={FILES_ART.topScrews} size={0.45} tone="mid" />
            </g>

            {/* 抽屜塔：座、背板、左側板 → 托盤（拉出的最後畫）→ 右側板、頂蓋 */}
            <g key="tower">
              <path className="iso-halo" d={TOWER_ART.halo} />
              <Solid paths={TOWER_ART.plinth} tone="lo" />
              <Dots points={TOWER_ART.plinthScrews} size={0.45} tone="mid" />
              <Solid paths={TOWER_ART.back} tone="lo" />
              <Solid paths={TOWER_ART.left} tone="mid" />
              {focusFirst.filter((id) => id !== step.focus).map((id) => <Tray key={id} id={id} open={s0.open.get(id) ?? 0} lit={false} refs={trays.current} />)}
              <Solid paths={TOWER_ART.right} tone="mid" />
              <Line d={TOWER_ART.rightLines} tone="faint" />
              <Dots points={TOWER_ART.rightScrews} size={0.42} tone="mid" />
              <Solid paths={TOWER_ART.cap} tone="mid" />
              <Dots points={TOWER_ART.capScrews} size={0.45} tone="mid" />
              <Solid paths={TOWER_ART.knob} tone="mid" />
              <Line d={TOWER_ART.knobKnurl} tone="lo" />
              {step.focus && built.has(step.focus) && (
                <Tray key={step.focus} id={step.focus} open={s0.open.get(step.focus) ?? OPEN} lit refs={trays.current} />
              )}
            </g>

            {/* 模型機櫃 */}
            <g key="cabinet">
              <path className="iso-halo" d={CAB_ART.halo} />
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="hi" inner={<Line d={CAB_ART.seams} tone="faint" />} />
              <Line d={CAB_ART.slot} tone="mid" />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <Solid paths={CAB_ART.cap} tone="mid" />
              <Dots points={CAB_ART.capScrews} size={0.5} tone="mid" />
              <Solid paths={CAB_ART.lampBase} tone="mid" />
              <Solid paths={CAB_ART.lamp} tone="lo" />
            </g>

            {/* 子代理的小卡架 */}
            <g key="sub">
              <path className="iso-halo" d={SUB_ART.halo} />
              <Solid paths={SUB_ART.plinth} tone="lo" />
              {SUB_ART.backPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
              {SUB_ART.cards.map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
              {SUB_ART.frontPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
              <Solid paths={SUB_ART.head} tone="mid" />
              <Dots points={SUB_ART.headScrews} size={0.42} tone="mid" />
            </g>

            {/* 升降梯 */}
            <g key="lift">
              <Solid paths={LIFT_ART.foot} tone="lo" />
              <Dots points={LIFT_ART.footScrews} size={0.42} tone="mid" />
              <Solid paths={LIFT_ART.mast} tone="mid" />
              <Line d={LIFT_ART.ticks} tone="lo" />
              <Solid paths={LIFT_ART.head} tone="mid" />
              <Line d={LIFT_ART.headKnurl} tone="lo" />
            </g>

            {/* 導軌、滑台、升降叉、卡 */}
            <g key="rail">
              {RAIL_ART.stops.map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
              <Solid paths={RAIL_ART.rail} tone="mid" />
              <Line d={RAIL_ART.ticks} tone="lo" />
            </g>
            <g ref={sled} transform={translateAlong(P, [start.z <= CARD_Z + FORK ? start.x : LIFT_X, 0, 0])}>
              <Solid paths={SLED_ART.plate} tone="mid" />
              <Dots points={SLED_ART.rivets} size={0.4} tone="lo" />
            </g>
            <g ref={car} transform={translateAlong(P, [0, 0, Math.abs(start.x - LIFT_X) < 0.5 ? Math.max(CARD_Z, start.z - FORK) : CARD_Z])}>
              <Solid paths={LIFT_ART.car.bracket} tone="mid" />
              <Solid paths={LIFT_ART.car.bar} tone="mid" />
              {LIFT_ART.car.tines.map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
            </g>
            <g ref={card} transform={translateAlong(P, [start.x, RAIL_Y, start.z])}>
              <Solid paths={CARD_ART.card} tone="hi" lit={fullRun} />
              <Line d={CARD_ART.rule} tone="lo" free />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}

/** 一層托盤：底板、三面矮牆、裡面的迷你機構，再蓋上正面板 */
function Tray({ id, open, lit, refs }: { id: FloorId; open: number; lit: boolean; refs: Map<FloorId, SVGGElement | null> }) {
  const art = useMemo(() => trayArt(id), [id]);
  return (
    <g ref={(el) => { refs.set(id, el); }} transform={translateAlong(P, [0, open, 0])}>
      <Solid paths={art.floor} tone="lo" />
      <Solid paths={art.back} tone="lo" />
      <Solid paths={art.left} tone="lo" />
      {art.contents.map((part, i) => <Solid key={i} paths={part.paths} tone={part.tone} crease={part.crease ?? "faint"} />)}
      <Solid paths={art.right} tone="lo" />
      <Solid paths={art.front} tone={id === "f07" ? "lo" : "mid"} lit={lit} />
      {art.ghostLine && <Line d={art.ghostLine} tone="mid" dashed />}
      <Solid paths={art.handle} tone="mid" />
      <Line d={art.holder} tone="lo" />
      <Dots points={art.rivets} size={0.4} tone="mid" />
    </g>
  );
}
