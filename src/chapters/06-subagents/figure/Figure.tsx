import { useEffect, useMemo, useRef } from "react";
import { translateAlong, type Plan } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import { LiveSolid, setSolid } from "../../../iso/react/LiveSolid";
import "../../../iso/iso.css";
import "./figure.css";
import type { Block, BlockKind, Step } from "../steps";
import {
  BASE_ART, CARD_Z, FILES_ART, MAIN_CAB_ART, RAIL_ART, SLED_ART, WALL_ART, cardArt, drawerArt, rackArt, unitCabArt,
} from "./geometry";
import { HEIGHT, K, MAIN, P, PARK, UNIT_X, UNITS_R, WIDTH } from "./view";

const LABEL =
  "主片場與三個第二攝製組的工作台。左邊是主代理：模型機櫃和一座較高的卡架（主對話的 context，一張卡一則訊息，卡厚代表份量）。" +
  "中間一道隔板，右邊三個攝製組工位各有自己的小機櫃與小卡架，看不到主卡架。前方導軌上三台滑台：" +
  "派遣時把一張薄薄的任務單送到工位，工位從右邊的劇本檔案櫃讀全文，完成後只把一張報告卡送回主卡架。";

const TONE: Record<BlockKind, "lo" | "mid" | "hi"> = {
  system: "lo", history: "mid", user: "hi", assistant: "mid", tool_result: "mid", brief: "hi", report: "hi",
};

/** 每一步三台滑台停在哪裡、載著什麼 */
type SledPose = { where: "main" | "unit"; cargo: "brief" | "report" | null };
const SLEDS: SledPose[] = [
  { where: "main", cargo: null }, { where: "main", cargo: null }, { where: "unit", cargo: "brief" },
  { where: "unit", cargo: null }, { where: "unit", cargo: null }, { where: "main", cargo: "report" },
  { where: "main", cargo: null }, { where: "main", cargo: null }, { where: "main", cargo: null },
];
const PHASE = ["主視窗很重", "Agent × 3", "派出任務單", "子視窗從零開始", "各組讀全文", "只交回報告", "子視窗丟棄", "交接有損", "自己做比較快"];

type Anim = { z: number; dz: number; op: number };

/** 依順序疊卡：每張卡的底面高度 */
function stack(blocks: Block[]) {
  let z = CARD_Z;
  const out = new Map<string, number>();
  for (const b of blocks) { out.set(b.id, z); z += b.h * K; }
  return out;
}

export default function SubagentsFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const sledPose = SLEDS[index];
  const drawerOpen = index === 4 ? 14 : 0;
  const targets = useMemo(() => {
    const m = stack(step.main);
    step.units.forEach((blocks) => blocks && stack(blocks).forEach((z, id) => m.set(id, z)));
    return m;
  }, [step]);
  const unitIds = useMemo(() => new Set(step.units.flatMap((b) => b?.map((x) => x.id) ?? [])), [step]);

  // 這一步亮起的零件（同一個概念的一組）
  const isLit = (b: Block) => {
    if (index === 2) return b.kind === "brief";
    if (index === 3) return false;
    if (index === 4) return b.id.endsWith("read");
    return Boolean(b.hot) && !unitIds.has(b.id);
  };

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const sledEls = useRef<(SVGGElement | null)[]>([]);
  const cargoEls = useRef<(SVGGElement | null)[]>([]);
  const drawerBox = useRef<SVGGElement>(null);
  const drawerFront = useRef<SVGGElement>(null);

  const sledTarget = (i: number) => (sledPose.where === "main" ? PARK[i] : UNIT_X[i]);
  const state = useRef<{ cards: Map<string, Anim>; sleds: number[]; open: number; mounted: boolean }>(null!);
  if (!state.current) {
    state.current = { cards: new Map(), sleds: [0, 1, 2].map(sledTarget), open: drawerOpen, mounted: false };
  }
  const cards = state.current.cards;
  for (const [id, z] of targets) {
    if (!cards.has(id)) cards.set(id, state.current.mounted ? { z, dz: 16, op: 0 } : { z, dz: 0, op: 1 });
  }
  for (const id of [...cards.keys()]) if (!targets.has(id)) cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    const arrived = [0, 1, 2].map((i) => {
      const t = sledTarget(i);
      s.sleds[i] = follow(s.sleds[i], t, dt, 0.4, calm);
      busy ||= s.sleds[i] !== t;
      sledEls.current[i]?.setAttribute("transform", translateAlong(P, [s.sleds[i], 0, 0]));
      const moving = Math.abs(s.sleds[i] - t) > 0.5;
      // 任務單只在運送途中看得到（到站就進了工位卡架）；報告卡留在滑台上
      const showCargo = sledPose.cargo === "report" || (sledPose.cargo === "brief" && moving);
      cargoEls.current[i]?.setAttribute("visibility", showCargo ? "visible" : "hidden");
      return !moving;
    });

    s.open = follow(s.open, drawerOpen, dt, 0.25, calm);
    busy ||= s.open !== drawerOpen;
    setSolid(drawerBox.current, drawerArt(0, s.open).box);
    drawerBox.current?.setAttribute("visibility", s.open > 0.3 ? "visible" : "hidden");
    drawerFront.current?.setAttribute("transform", translateAlong(P, [0, s.open, 0]));

    s.cards.forEach((c, id) => {
      const z = targets.get(id)!;
      // 工位裡的新卡等滑台到站才落下
      const unit = step.units.findIndex((blocks) => blocks?.some((b) => b.id === id));
      const ready = unit < 0 || arrived[unit];
      c.z = follow(c.z, z, dt, 0.25, calm);
      if (ready) {
        c.dz = follow(c.dz, 0, dt, 0.22, calm);
        c.op = follow(c.op, 1, dt, 0.16, calm);
      }
      busy ||= c.z !== z || c.dz !== 0 || c.op !== 1;
      const el = cardEls.current.get(id);
      el?.setAttribute("transform", translateAlong(P, [0, 0, c.z + c.dz]));
      el?.setAttribute("opacity", String(Math.round(c.op * 100) / 100));
    });

    say(readout);
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  const active = step.units.filter(Boolean).length;
  const readout = `${PHASE[index]} · 主視窗 ${step.main.length} 張卡 · 子代理 ${active} 個`;

  const cardNode = (b: Block, plan: Plan) => {
    const c = cards.get(b.id)!;
    const art = cardArt(plan, b.h * K);
    return (
      <g key={b.id} ref={(el) => { cardEls.current.set(b.id, el); }} transform={translateAlong(P, [0, 0, c.z + c.dz])} opacity={c.op}>
        <Solid paths={art.paths} tone={TONE[b.kind]} lit={isLit(b)} inner={<Line d={art.layers} tone="faint" />} />
        {b.warn && <Line d={art.paths.outline} tone="red" />}
      </g>
    );
  };

  const rack = (art: ReturnType<typeof rackArt>, blocks: Block[], plan: Plan, live: boolean) => (
    <>
      <path className="iso-halo" d={art.halo} />
      <Solid paths={art.plinth} tone="lo" />
      <Dots points={art.plinthScrews} size={0.45} tone="mid" />
      <Solid paths={art.tray} tone="lo" crease="none" />
      {art.backPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={live ? "mid" : "lo"} crease="none" /></g>)}
      {blocks.map((b) => cardNode(b, plan))}
      {art.frontPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={live ? "mid" : "lo"} crease="none" /></g>)}
      <Solid paths={art.head} tone="mid" inner={<Line d={art.headSeam} tone="faint" />} />
      <Dots points={art.headScrews} size={0.45} tone="mid" />
    </>
  );

  const cabinet = (art: typeof MAIN_CAB_ART, tone: "hi" | "mid", lampOn: boolean) => (
    <>
      <path className="iso-halo" d={art.halo} />
      <Solid paths={art.plinth} tone="lo" />
      <Solid paths={art.body} tone={tone} inner={<Line d={art.seams} tone="faint" />} />
      <Line d={art.vents} tone="lo" />
      <Dots points={art.rivets} size={0.4} tone="mid" />
      <Solid paths={art.cap} tone="mid" />
      <Dots points={art.capScrews} size={0.45} tone="mid" />
      <Solid paths={art.lampBase} tone="mid" />
      <Solid paths={art.lamp} tone={lampOn ? "hi" : "lo"} />
    </>
  );

  const drawer = drawerArt(0, 0);
  const upper = drawerArt(1, 0);

  return (
    <div className="iso ch06-fig">
      <Plate
        fig="Fig 6"
        title="Subagents · 第二攝製組"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步的重點" },
          { mark: "raised", label: "一座卡架 = 一個獨立的 context" },
          { mark: "red", label: "交接遺漏造成的錯誤建議" },
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
              <Solid paths={BASE_ART.label} tone="lo" crease="none" />
              <Line d={BASE_ART.labelLine} tone="faint" />
              <Line d={BASE_ART.labelRule} tone="lo" free />
              <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
            </g>

            {/* 主代理：機櫃 → 卡架 */}
            <g key="main-cab">{cabinet(MAIN_CAB_ART, "hi", index !== 8)}</g>
            <g key="main-rack">{rack(rackArt(MAIN), step.main, MAIN.card, true)}</g>

            {/* 隔板：子代理看不到主對話 */}
            <g key="wall">
              {WALL_ART.feet.map((f, i) => <Solid key={i} paths={f} tone="lo" />)}
              <Solid paths={WALL_ART.panel} tone="mid" lit={index === 3} inner={<Line d={WALL_ART.seams} tone="faint" />} />
              <Dots points={WALL_ART.rivets} size={0.4} tone="mid" />
              <Solid paths={WALL_ART.cap} tone="mid" />
            </g>

            {/* 三個攝製組工位：機櫃在後、卡架在前 */}
            {UNIT_X.map((cx, i) => {
              const cab = unitCabArt(cx);
              const on = Boolean(step.units[i]);
              return (
                <g key={`unit-${i}`}>
                  {rack(rackArt(UNITS_R[i]), step.units[i] ?? [], UNITS_R[i].card, on)}
                  <Solid paths={cab.body} tone={on ? "hi" : "mid"} inner={<Line d={cab.seam} tone="faint" />} />
                  <Line d={cab.vents} tone="lo" />
                  <Dots points={cab.rivets} size={0.4} tone="mid" />
                  <Solid paths={cab.lampBase} tone="mid" />
                  <Solid paths={cab.lamp} tone={on ? "hi" : "lo"} />
                </g>
              );
            })}

            {/* 劇本檔案櫃 */}
            <g key="files">
              <path className="iso-halo" d={FILES_ART.halo} />
              <Solid paths={FILES_ART.plinth} tone="lo" />
              <Solid paths={FILES_ART.body} tone="mid" />
              <Line d={FILES_ART.bays} tone="lo" />
              <Solid paths={FILES_ART.top} tone="mid" />
              <Dots points={FILES_ART.topScrews} size={0.45} tone="mid" />
              <Solid paths={upper.front} tone="lo" />
              <Solid paths={upper.pull} tone="mid" />
              <Line d={upper.holder} tone="faint" />
              <LiveSolid ref={drawerBox} paths={drawerArt(0, state.current.open).box} tone="lo" />
              <g ref={drawerFront} transform={translateAlong(P, [0, state.current.open, 0])}>
                <Solid paths={drawer.front} tone="hi" />
                <Solid paths={drawer.pull} tone="mid" />
                <Line d={drawer.holder} tone="mid" />
                <Dots points={drawer.rivets} size={0.4} tone="mid" />
              </g>
            </g>

            {/* 導軌與三台滑台 */}
            <g key="rail">
              {RAIL_ART.stops.map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
              <Solid paths={RAIL_ART.rail} tone="mid" />
              <Line d={RAIL_ART.minor} tone="lo" />
              <Line d={RAIL_ART.major} tone="mid" />
              <Dots points={RAIL_ART.screws} size={0.45} tone="mid" />
              {[0, 1, 2].map((i) => (
                <g key={i} ref={(el) => { sledEls.current[i] = el; }} transform={translateAlong(P, [state.current.sleds[i], 0, 0])}>
                  <Solid paths={SLED_ART.plate} tone="mid" inner={<Line d={SLED_ART.seam} tone="faint" />} />
                  <Dots points={SLED_ART.rivets} size={0.4} tone="lo" />
                  <Solid paths={SLED_ART.knob} tone="mid" />
                  <Line d={SLED_ART.knobKnurl} tone="lo" />
                  <g
                    ref={(el) => { cargoEls.current[i] = el; }}
                    visibility={sledPose.cargo === "report" ? "visible" : "hidden"}
                  >
                    <Solid paths={SLED_ART.cargo} tone="hi" lit={index === 5} />
                  </g>
                </g>
              ))}
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
