import { useEffect, useMemo, useRef } from "react";
import { translateAlong, type Plan } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import { LiveSolid, setSolid } from "../../../iso/react/LiveSolid";
import "../../../iso/iso.css";
import "./figure.css";
import type { Block, BlockKind, Step } from "../steps";
import {
  BASE_ART, BIN_ART, CABINET_ART, DIAL_ART, MAIN_ART, RULER_ART, SUB_ART, cardArt, drawerArt, needleAt,
} from "./geometry";
import { CARD_Z, EJECT_DX, HEIGHT, MAIN, P, SUB, THRESHOLD, UNIT, WIDTH } from "./view";

const LABEL =
  "一座固定高度的卡架，代表 context window：一張卡是一則訊息，卡的厚度是它佔的比例，側邊刻度尺從 0 到 100%，" +
  "85% 處拉著一條紅色細線，是自動壓縮門檻。壓縮時舊卡從側面被擠進廢卡箱，換成一張薄薄的摘要卡。" +
  "右邊較小的卡架是子代理自己的 context，左邊的檔案櫃是磁碟，抽屜拉開代表讀取那個檔案。前方的錶顯示主卡架的用量。";

/** 抽屜由下往上：劇本檔、角色設定、場次表、修訂紀錄 */
const DRAWERS = ["scenes/*.fountain", "characters.md", "scene_index.md", "revisions.md"];
/** 每一步各抽屜拉開多少（讀全文拉滿、只讀一場拉一點） */
const OPEN: number[][] = [
  [0, 0, 0, 0], [14, 0, 0, 0], [14, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
  [14, 0, 0, 0], [6, 0, 0, 0], [14, 0, 0, 0], [6, 7, 7, 0],
];

const TONE: Record<BlockKind, "lo" | "mid" | "hi"> = {
  system: "lo", tools: "lo", claudemd: "lo", user: "hi", assistant: "mid", tool_result: "mid", summary: "hi", report: "hi",
};

type CardState = { z: number; t: number; ex: number; op: number; dz: number; from: number };
const used = (blocks: Block[]) => blocks.reduce((a, b) => a + b.pct, 0);

/** 卡目前的位置與透明度：擠出時先往 +x 滑出卡架，再落進廢卡箱並淡出 */
function placeOf(c: CardState, kept: boolean) {
  const slide = Math.min(1, c.ex / 0.6);
  const fall = Math.max(0, (c.ex - 0.55) / 0.45) ** 2;
  const x = EJECT_DX * (slide * slide * (3 - 2 * slide));
  const z = kept ? c.z + c.dz : c.from + (3 - c.from) * fall;
  const op = kept ? c.op : c.ex < 0.7 ? 1 : Math.max(0, 1 - (c.ex - 0.7) / 0.3);
  return { transform: translateAlong(P, [x, 0, z]), opacity: String(Math.round(op * 100) / 100) };
}

/** 依順序把卡疊起來：每張卡的底面高度 */
function stacked(blocks: Block[]) {
  let z = CARD_Z;
  const out = new Map<string, number>();
  for (const b of blocks) if (b.pct > 0) { out.set(b.id, z); z += b.pct * UNIT; }
  return out;
}

export default function ContextFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const prev = index > 0 ? steps[index - 1] : null;
  const mainUsed = used(step.main);
  const subUsed = step.sub ? used(step.sub) : 0;
  const targets = useMemo(() => {
    const m = stacked(step.main);
    stacked(step.sub ?? []).forEach((z, id) => m.set(id, z));
    return m;
  }, [step]);

  // 這一步唯一亮起的卡：最後一張新加入的卡
  const lit = useMemo(() => {
    const before = new Set(prev?.main.map((b) => b.id) ?? []);
    const fresh = step.main.filter((b) => b.pct > 0 && !before.has(b.id));
    return fresh.length && prev ? fresh[fresh.length - 1].id : null;
  }, [step, prev]);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const drawerBoxes = useRef<(SVGGElement | null)[]>([]);
  const drawerFronts = useRef<(SVGGElement | null)[]>([]);
  const needle = useRef<SVGPathElement>(null);

  // 第一次掛載直接停在這一步；之後換步才有動畫
  const state = useRef<{ cards: Map<string, CardState>; open: number[]; needle: number; mounted: boolean }>(null!);
  if (!state.current) state.current = { cards: new Map(), open: [...OPEN[index]], needle: mainUsed / 100, mounted: false };
  const cards = state.current.cards;
  for (const b of [...step.main, ...(step.sub ?? [])]) {
    const known = cards.get(b.id);
    const z = targets.get(b.id);
    if (!known) {
      const first = !state.current.mounted;
      cards.set(b.id, b.pct > 0
        ? { z: z!, t: b.pct * UNIT, ex: 0, op: first ? 1 : 0, dz: first ? 0 : 18, from: z! }
        : { z: CARD_Z, t: UNIT, ex: 1, op: 0, dz: 0, from: CARD_Z });
    } else if (b.pct > 0) {
      known.t = b.pct * UNIT;
    } else if (known.ex === 0) {
      known.from = known.z; // 從目前高度開始被擠出去
    }
  }
  const shown = new Set([...step.main, ...(step.sub ?? [])].map((b) => b.id));
  for (const id of [...cards.keys()]) if (!shown.has(id)) cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  const blockOf = (id: string) => [...step.main, ...(step.sub ?? [])].find((b) => b.id === id)!;

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    s.cards.forEach((c, id) => {
      const b = blockOf(id);
      if (!b) return;
      if (b.pct > 0) {
        const z = targets.get(id)!;
        c.z = follow(c.z, z, dt, 0.25, calm);
        c.ex = follow(c.ex, 0, dt, 0.3, calm);
        c.dz = follow(c.dz, 0, dt, 0.22, calm);
        c.op = follow(c.op, 1, dt, 0.18, calm);
        busy ||= c.z !== z || c.ex !== 0 || c.dz !== 0 || c.op !== 1;
      } else {
        c.ex = follow(c.ex, 1, dt, 0.45, calm);
        busy ||= c.ex !== 1;
      }
      const el = cardEls.current.get(id);
      if (!el) return;
      const place = placeOf(c, b.pct > 0);
      el.setAttribute("transform", place.transform);
      el.setAttribute("opacity", place.opacity);
    });

    OPEN[index].forEach((target, i) => {
      const was = s.open[i];
      s.open[i] = follow(s.open[i], target, dt, 0.25, calm);
      busy ||= s.open[i] !== target;
      if (was !== s.open[i] || !drawerBoxes.current[i]?.dataset.ready) {
        setSolid(drawerBoxes.current[i], drawerArt(i, s.open[i]).box);
        drawerBoxes.current[i]?.setAttribute("data-ready", "");
        drawerBoxes.current[i]?.setAttribute("opacity", s.open[i] > 0.3 ? "1" : "0");
      }
      drawerFronts.current[i]?.setAttribute("transform", translateAlong(P, [0, s.open[i], 0]));
    });

    const share = mainUsed / 100;
    s.needle = follow(s.needle, share, dt, 0.4, calm);
    busy ||= s.needle !== share;
    needle.current?.setAttribute("d", needleAt(s.needle));

    say(readout);
    return busy;
  }, visible);
  useEffect(() => { kick(); }, [index, kick]);

  const over = mainUsed > THRESHOLD;
  const readout = `主視窗 ${mainUsed}% · ${over ? "超過門檻" : `門檻 ${THRESHOLD}%`}${step.sub ? ` · 子代理 ${subUsed}%` : ""}`;

  const files = new Set(["scenes/*.fountain", ...(step.disk ?? []).map((f) => f.name)]);
  const drawerOrder = [0, 1, 2, 3].sort((a, b) => OPEN[index][a] - OPEN[index][b] || a - b);

  const cardNode = (b: Block, plan: Plan) => {
    const c = cards.get(b.id)!;
    const place = placeOf(c, b.pct > 0);
    const art = cardArt(plan, 0, Math.max(c.t, 0.6));
    return (
      <g
        key={b.id}
        ref={(el) => { cardEls.current.set(b.id, el); }}
        transform={place.transform}
        opacity={place.opacity}
        className={b.dim ? "ch02-dim" : undefined}
      >
        <Solid paths={art.paths} tone={TONE[b.kind]} lit={b.id === lit} inner={<Line d={art.layers} tone="faint" />} />
      </g>
    );
  };

  const rack = (art: typeof MAIN_ART, blocks: Block[], plan: Plan, live: boolean) => (
    <>
      <path className="iso-halo" d={art.halo} />
      <Solid paths={art.plinth} tone="lo" />
      <Dots points={art.plinthScrews} size={0.45} tone="mid" />
      <Solid paths={art.tray} tone="lo" crease="none" />
      {art.backPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={live ? "mid" : "lo"} crease="none" /></g>)}
      {blocks.filter((b) => b.pct > 0).map((b) => cardNode(b, plan))}
      {art.frontPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={live ? "mid" : "lo"} crease="none" /></g>)}
      <Solid paths={art.throat} tone="lo" />
      <Line d={art.throatSlot} tone="faint" />
      <Solid paths={art.head} tone="mid" inner={<Line d={art.headSeam} tone="faint" />} />
      <Dots points={art.headScrews} size={0.45} tone="mid" />
      <Solid paths={art.knob} tone="mid" />
      <Line d={art.knobKnurl} tone="lo" />
    </>
  );

  return (
    <div className="iso ch02-fig">
      <Plate
        fig="Fig 2"
        title="Context window · 卡架"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步新加入的卡" },
          { mark: "red", label: "自動壓縮門檻（示意 85%）" },
          { mark: "dim", label: "注意力變弱的內容" },
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

            {/* 檔案櫃（磁碟）：拉得越開的抽屜越晚畫 */}
            <g key="cabinet">
              <path className="iso-halo" d={CABINET_ART.halo} />
              <Solid paths={CABINET_ART.plinth} tone="lo" />
              <Solid paths={CABINET_ART.body} tone="mid" />
              <Line d={CABINET_ART.bays} tone="lo" />
              <Solid paths={CABINET_ART.top} tone="mid" />
              <Dots points={CABINET_ART.topScrews} size={0.45} tone="mid" />
              {drawerOrder.map((i) => {
                const art = drawerArt(i, 0);
                const has = files.has(DRAWERS[i]);
                return (
                  <g key={i}>
                    <LiveSolid ref={(el) => { drawerBoxes.current[i] = el; }} paths={drawerArt(i, state.current.open[i]).box} tone="lo" />
                    <g ref={(el) => { drawerFronts.current[i] = el; }} transform={translateAlong(P, [0, state.current.open[i], 0])}>
                      <Solid paths={art.front} tone={has ? "hi" : "lo"} lit={index === 8 && i === 1} />
                      <Solid paths={art.pull} tone="mid" />
                      <Line d={art.holder} tone={has ? "mid" : "faint"} />
                      <Dots points={art.rivets} size={0.4} tone="mid" />
                    </g>
                  </g>
                );
              })}
            </g>

            {/* 用量錶 */}
            <g key="dial">
              <Solid paths={DIAL_ART.stand} tone="lo" />
              <Dots points={DIAL_ART.standScrews} size={0.45} tone="mid" />
              <Solid paths={DIAL_ART.post} tone="mid" />
              <Solid paths={DIAL_ART.puck} tone="hi" crease="lo" />
              <Line d={DIAL_ART.band} tone="faint" />
              <Line d={DIAL_ART.knurl} tone="faint" />
              <Line d={DIAL_ART.bezel} tone="lo" />
              <Line d={DIAL_ART.minor} tone="lo" />
              <Line d={DIAL_ART.major} tone="mid" />
              <Line d={DIAL_ART.threshold} tone="red" />
              <path ref={needle} className="iso-line" data-tone={over ? "red" : "hi"} strokeWidth={1.1} d={needleAt(state.current.needle)} />
              <Line d={DIAL_ART.hub} tone="mid" />
            </g>

            {/* 刻度尺 */}
            <g key="ruler">
              <Solid paths={RULER_ART.foot} tone="lo" />
              <Solid paths={RULER_ART.ruler} tone="mid" />
              <Line d={RULER_ART.minor} tone="lo" />
              <Line d={RULER_ART.major} tone="mid" />
              <Line d={RULER_ART.threshold} tone="red" />
            </g>

            {/* 主卡架 */}
            <g key="main">{rack(MAIN_ART, step.main, MAIN.card, true)}</g>
            <g key="wire">
              <Line d={RULER_ART.wire} tone="red" />
              <Dots points={RULER_ART.wireEnds} size={0.9} tone="hi" />
            </g>

            {/* 廢卡箱：後牆與側牆 → 被擠出的卡 → 前牆 */}
            <g key="bin">
              <path className="iso-halo" d={BIN_ART.halo} />
              <Solid paths={BIN_ART.floor} tone="lo" />
              <Solid paths={BIN_ART.back} tone="mid" />
              <Solid paths={BIN_ART.left} tone="mid" />
              <Solid paths={BIN_ART.right} tone="mid" />
              {(step.debris || index === 5) && BIN_ART.pile.map((p, i) => <Solid key={i} paths={p} tone="lo" />)}
              {step.main.filter((b) => b.pct === 0).map((b) => cardNode(b, MAIN.card))}
              <Solid paths={BIN_ART.front} tone="mid" />
              <Dots points={BIN_ART.frontScrews} size={0.45} tone="mid" />
            </g>

            {/* 子代理的卡架 */}
            <g key="sub">{rack(SUB_ART, step.sub ?? [], SUB.card, Boolean(step.sub))}</g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
