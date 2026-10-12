import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import { LiveSolid, setSolid } from "../../../iso/react/LiveSolid";
import "../../../iso/iso.css";
import "./figure.css";
import { SESSION_NAME, type Block, type BlockKind, type CardId, type SessionId, type Step } from "../steps";
import { BASE_ART, CAB_ART, REJECT_ART, cardArt, canArt, drawerArt, indexRules, rackArt } from "./geometry";
import { CAB_TOP, CARD_Z, CLEAR_DY, DRAWER_AT, HEIGHT, K, P, RACK_X, WIDTH } from "./view";

const LABEL =
  "三天的工作台。沿著時間軸排了三座卡架，各是第 1、2、3 天那次對話的 context；一天結束，卡從卡架正面滑出清空，" +
  "前方的托架留下一個片盒，是那天的 transcript。最右邊是記憶檔案櫃：一則記憶一個抽屜，櫃頂托盤放著索引卡 MEMORY.md，" +
  "前方的退件盤收著判斷不該記的東西。新的一天開場只把索引卡放上卡架，需要時才拉開單一抽屜。";

const DAYS: SessionId[] = ["d1", "d2", "d3"];
type Drawer = keyof typeof DRAWER_AT;
const DRAWERS: Drawer[] = ["user", "fb", "proj", "ref"];
const TONE: Record<BlockKind, "lo" | "mid" | "hi"> = {
  base: "lo", index: "hi", user: "hi", assistant: "mid", tool_result: "mid", memory: "hi",
};

type CardAnim = { z: number; dz: number; dy: number; op: number; from: number; t: number };

/** 每座卡架裡、每張卡的底面高度 */
function stackOf(blocks: Block[]) {
  let z = CARD_Z;
  const out = new Map<string, number>();
  for (const b of blocks) if (b.h > 0) { out.set(b.id, z); z += b.h * K; }
  return out;
}

export default function MemoryFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const prev = index > 0 ? steps[index - 1] : null;
  const active = DAYS.find((d) => step.sessions[d].state === "active");

  const targets = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of DAYS) stackOf(step.sessions[d].blocks).forEach((z, id) => m.set(id, z));
    return m;
  }, [step]);

  // 這一步唯一亮起的零件：寫入記憶 → 那個抽屜；讀進 context → 新落下的索引卡或記憶卡
  const lit = useMemo(() => {
    const to = step.flight?.to;
    if (to && !DAYS.includes(to as SessionId)) return { drawer: to as CardId, card: null as string | null };
    if (!active) return { drawer: null, card: null };
    const before = new Set(prev?.sessions[active].blocks.map((b) => b.id) ?? []);
    const fresh = step.sessions[active].blocks.filter((b) => b.h > 0 && !before.has(b.id));
    const pick = fresh.find((b) => b.kind === "index" || b.kind === "memory") ?? (prev ? fresh[fresh.length - 1] : undefined);
    return { drawer: null, card: pick?.id ?? null };
  }, [step, prev, active]);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const canEls = useRef(new Map<SessionId, SVGGElement | null>());
  const boxEls = useRef(new Map<Drawer, SVGGElement | null>());
  const frontEls = useRef(new Map<Drawer, SVGGElement | null>());
  const indexEl = useRef<SVGGElement>(null);
  const rejectEl = useRef<SVGGElement>(null);

  const openOf = (id: Drawer) => {
    const s = step.cards[id];
    return s === "hot" || s === "stale" ? 9 : 0;
  };
  const indexLift = step.cards.idx === "hot" ? 5 : 0;

  const state = useRef<{
    cards: Map<string, CardAnim>; cans: Map<SessionId, number>; open: Map<Drawer, number>;
    index: number; reject: number; mounted: boolean;
  }>(null!);
  if (!state.current) {
    state.current = {
      cards: new Map(),
      cans: new Map(DAYS.map((d) => [d, step.transcripts?.includes(d) ? 0 : 12])),
      open: new Map(DRAWERS.map((d) => [d, openOf(d)])),
      index: indexLift,
      reject: step.cards.rej ? 0 : 12,
      mounted: false,
    };
  }
  const s0 = state.current;
  for (const d of DAYS) {
    for (const b of step.sessions[d].blocks) {
      const known = s0.cards.get(b.id);
      if (!known) {
        const z = targets.get(b.id);
        s0.cards.set(b.id, b.h > 0
          ? { z: z!, dz: s0.mounted ? 16 : 0, dy: 0, op: s0.mounted ? 0 : 1, from: z!, t: b.h * K }
          : { z: CARD_Z, dz: 0, dy: CLEAR_DY, op: 0, from: CARD_Z, t: 6 });
      } else if (b.h > 0) {
        known.t = b.h * K;
      } else if (known.dy === 0) {
        known.from = known.z;
      }
    }
  }
  const shown = new Set(DAYS.flatMap((d) => step.sessions[d].blocks.map((b) => b.id)));
  for (const id of [...s0.cards.keys()]) if (!shown.has(id)) s0.cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  /** 卡目前的位置：留著的卡在架上；被清空的卡往前滑出、落下、淡出 */
  const placeOf = (c: CardAnim, kept: boolean) => {
    if (kept) return { t: translateAlong(P, [0, 0, c.z + c.dz]), op: c.op };
    const share = c.dy / CLEAR_DY;
    const fall = Math.max(0, (share - 0.4) / 0.6) ** 2;
    return { t: translateAlong(P, [0, c.dy, c.from + (0 - c.from) * fall]), op: share < 0.55 ? 1 : Math.max(0, 1 - (share - 0.55) / 0.45) };
  };

  const blockOf = (id: string) => {
    for (const d of DAYS) { const b = step.sessions[d].blocks.find((x) => x.id === id); if (b) return b; }
    return null;
  };

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    s.cards.forEach((c, id) => {
      const b = blockOf(id);
      if (!b) return;
      if (b.h > 0) {
        const z = targets.get(id)!;
        c.z = follow(c.z, z, dt, 0.25, calm);
        c.dz = follow(c.dz, 0, dt, 0.22, calm);
        c.op = follow(c.op, 1, dt, 0.16, calm);
        c.dy = 0;
        busy ||= c.z !== z || c.dz !== 0 || c.op !== 1;
      } else {
        c.dy = follow(c.dy, CLEAR_DY, dt, 0.35, calm);
        busy ||= c.dy !== CLEAR_DY;
      }
      const p = placeOf(c, b.h > 0);
      const el = cardEls.current.get(id);
      el?.setAttribute("transform", p.t);
      el?.setAttribute("opacity", String(Math.round(p.op * 100) / 100));
    });

    for (const d of DAYS) {
      const target = step.transcripts?.includes(d) ? 0 : 12;
      const now = follow(s.cans.get(d)!, target, dt, 0.25, calm);
      s.cans.set(d, now);
      busy ||= now !== target;
      const el = canEls.current.get(d);
      el?.setAttribute("transform", translateAlong(P, [0, 0, 2 + now]));
      el?.setAttribute("opacity", String(Math.round(Math.max(0, 1 - now / 12) * 100) / 100));
    }

    for (const d of DRAWERS) {
      const target = openOf(d);
      const was = s.open.get(d)!;
      const now = follow(was, target, dt, 0.22, calm);
      s.open.set(d, now);
      busy ||= now !== target;
      const box = boxEls.current.get(d);
      if (box && (was !== now || !box.dataset.ready)) {
        setSolid(box, drawerArt(d, now).box);
        box.dataset.ready = "1";
        box.setAttribute("opacity", now > 0.3 ? "1" : "0");
      }
      frontEls.current.get(d)?.setAttribute("transform", translateAlong(P, [0, now, 0]));
    }

    s.index = follow(s.index, indexLift, dt, 0.2, calm);
    busy ||= s.index !== indexLift;
    indexEl.current?.setAttribute("transform", translateAlong(P, [0, 0, CAB_TOP + 3 + s.index]));

    const rejTarget = step.cards.rej ? 0 : 12;
    s.reject = follow(s.reject, rejTarget, dt, 0.22, calm);
    busy ||= s.reject !== rejTarget;
    rejectEl.current?.setAttribute("transform", translateAlong(P, [0, 0, 1.5 + s.reject]));
    rejectEl.current?.setAttribute("opacity", String(Math.round(Math.max(0, 1 - s.reject / 12) * 100) / 100));

    say(readout);
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  const memoryCount = DRAWERS.filter((d) => step.cards[d] && step.cards[d] !== "hidden").length;
  const contextCount = active ? step.sessions[active].blocks.filter((b) => b.h > 0).length : 0;
  const readout = `${active ? SESSION_NAME[active] : "—"} · context ${contextCount} 張卡 · 記憶 ${memoryCount} 檔`;
  const indexLines = Math.max(1, memoryCount);

  const rack = (d: SessionId) => {
    const art = rackArt(RACK_X[d]);
    const st = step.sessions[d].state;
    const postTone = st === "idle" ? "lo" : "mid";
    const blocks = step.sessions[d].blocks;
    const card = (b: Block) => {
      const c = s0.cards.get(b.id)!;
      const p = placeOf(c, b.h > 0);
      const a = cardArt(RACK_X[d], c.t);
      return (
        <g key={b.id} ref={(el) => { cardEls.current.set(b.id, el); }} transform={p.t} opacity={p.op}>
          <Solid paths={a.paths} tone={TONE[b.kind]} lit={b.id === lit.card} inner={<Line d={a.layers} tone="faint" />} />
        </g>
      );
    };
    return (
      <g key={d}>
        <path className="iso-halo" d={art.halo} />
        <Solid paths={art.plinth} tone="lo" />
        <Dots points={art.plinthScrews} size={0.45} tone="mid" />
        <Solid paths={art.tray} tone="lo" crease="none" />
        {art.backPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={postTone} crease="none" /></g>)}
        {blocks.filter((b) => b.h > 0).map(card)}
        {art.frontPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone={postTone} crease="none" /></g>)}
        <Solid paths={art.head} tone={st === "idle" ? "lo" : "mid"} inner={<Line d={art.headSeam} tone="faint" />} />
        <Dots points={art.headScrews} size={0.45} tone="mid" />
        <Solid paths={art.knob} tone="mid" />
        <Line d={art.knobKnurl} tone="lo" />
        {/* 正在清空的卡：滑出卡架正面，畫在前立柱之後 */}
        {blocks.filter((b) => b.h === 0).map(card)}
      </g>
    );
  };

  const can = (d: SessionId) => {
    const art = canArt(RACK_X[d]);
    const lift = s0.cans.get(d)!;
    return (
      <g key={`can-${d}`}>
        <Solid paths={art.cradle} tone="lo" />
        <Line d={art.cradleRing} tone="faint" />
        <Dots points={art.cradleScrews} size={0.42} tone="mid" />
        <g ref={(el) => { canEls.current.set(d, el); }} transform={translateAlong(P, [0, 0, 2 + lift])} opacity={Math.max(0, 1 - lift / 12)}>
          <Solid paths={art.can} tone="mid" />
          <Solid paths={art.lid} tone="hi" />
          <Line d={art.hub} tone="mid" />
          <Dots points={art.hubDot} size={0.6} tone="mid" />
          <Dots points={art.sprockets} size={0.9} tone="lo" />
        </g>
      </g>
    );
  };

  return (
    <div className="iso ch08-fig">
      <Plate
        fig="Fig 8"
        title="Memory · 三天的工作台"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步被讀寫的記憶" },
          { mark: "raised", label: "片盒 = transcript，抽屜 = 記憶檔" },
          { mark: "red", label: "過時或不該記" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            {/* 底座與時間軸刻度 */}
            <g key="base">
              <path className="iso-halo" d={BASE_ART.halo} />
              {BASE_ART.feet.map((parts, i) => <g key={i}>{parts.map((p, k) => <Solid key={k} paths={p} tone={k ? "mid" : "lo"} />)}</g>)}
              <Solid paths={BASE_ART.slab} tone="mid" />
              <Line d={BASE_ART.groove} tone="lo" />
              <Line d={BASE_ART.screwRings} tone="lo" />
              <Dots points={BASE_ART.screws} size={0.5} tone="mid" />
              <Solid paths={BASE_ART.strip} tone="lo" crease="none" />
              <Line d={BASE_ART.stripMinor} tone="lo" />
              <Line d={BASE_ART.stripMajor} tone="mid" />
              <Dots points={BASE_ART.stripScrews} size={0.45} tone="mid" />
            </g>


            {/* 三座卡架，由遠到近 */}
            {DAYS.map(rack)}

            {/* 片盒托架 */}
            {DAYS.map(can)}

            {/* 記憶檔案櫃：在卡架右前方，卡架之後畫 */}
            <g key="cabinet">
              <path className="iso-halo" d={CAB_ART.halo} />
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="mid" />
              <Line d={CAB_ART.bays} tone="lo" />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <Solid paths={CAB_ART.top} tone="mid" />
              <Dots points={CAB_ART.topScrews} size={0.45} tone="mid" />
              <Solid paths={CAB_ART.trayFloor} tone="lo" />
              <Solid paths={CAB_ART.trayBack} tone="mid" />
              <Solid paths={CAB_ART.trayLeft} tone="mid" />
              {step.cards.idx && (
                <g ref={indexEl} transform={translateAlong(P, [0, 0, CAB_TOP + 3 + s0.index])}>
                  <Solid paths={CAB_ART.indexCard} tone="hi" lit={step.cards.idx === "hot" && !lit.card && !lit.drawer} />
                  <Line d={indexRules(indexLines)} tone="mid" free />
                </g>
              )}
              <Solid paths={CAB_ART.trayRight} tone="mid" />
              {[...DRAWERS].sort((a, b) => openOf(a) - openOf(b)).map((d) => {
                const st = step.cards[d];
                if (!st || st === "hidden") return null;
                const art = drawerArt(d, 0);
                return (
                  <g key={d}>
                    <LiveSolid ref={(el) => { boxEls.current.set(d, el); }} paths={drawerArt(d, s0.open.get(d)!).box} tone="lo" />
                    <g ref={(el) => { frontEls.current.set(d, el); }} transform={translateAlong(P, [0, s0.open.get(d)!, 0])}>
                      <Solid paths={art.front} tone="hi" lit={lit.drawer === d} />
                      {st === "stale" && <Line d={art.front.outline} tone="red" />}
                      <Solid paths={art.pull} tone="mid" />
                      <Line d={art.holder} tone="mid" />
                      <Dots points={art.rivets} size={0.4} tone="mid" />
                    </g>
                  </g>
                );
              })}
            </g>

            {/* 退件盤 */}
            <g key="reject">
              <path className="iso-halo" d={REJECT_ART.halo} />
              <Solid paths={REJECT_ART.floor} tone="lo" />
              <Solid paths={REJECT_ART.back} tone="mid" />
              <Solid paths={REJECT_ART.left} tone="mid" />
              <Solid paths={REJECT_ART.right} tone="mid" />
              {step.cards.rej && (
                <g ref={rejectEl} transform={translateAlong(P, [0, 0, 1.5 + s0.reject])} opacity={Math.max(0, 1 - s0.reject / 12)}>
                  <Solid paths={REJECT_ART.card} tone="mid" crease="none" />
                  <Line d={REJECT_ART.cardRule} tone="lo" free />
                  <Line d={REJECT_ART.card.outline} tone="red" />
                </g>
              )}
              <Solid paths={REJECT_ART.front} tone="mid" />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
