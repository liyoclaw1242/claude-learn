import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "./figure.css";
import { SKILLS, type Block, type BlockKind, type Step } from "../steps";
import {
  BASE_ART, CAB_ART, CONSOLE_ART, CRATE_ART, CTX_ART, DEVICES, PANEL_ART, RACK_ART, cardArt, cassetteArt,
} from "./geometry";
import { CARD_Z, CRATE_DROP, DRAWER_UP, HEIGHT, K, P, PULL_FULL, PULL_PEEK, WIDTH } from "./view";

const LABEL =
  "一座卡匣工作台。左邊的架上直立著五個技能卡匣，書背插著名片（技能名稱與說明），只能手動觸發的那個有鎖扣。" +
  "中間的卡架是 context：一張卡是一段內容，卡越厚佔越多。模型需要某個技能時，對應的卡匣被拉出，全文變成一張厚卡落進卡架；" +
  "附屬檔是卡匣頂上的小抽屜，用到才升起。前方的按鍵盤是 slash command。右邊的插座面板是 MCP：每插上一台外部系統，" +
  "卡架裡的工具定義就變厚；面板頂上的滑塊是 tool search，打開後工具定義只剩一張索引卡。最後一步，Plugin 套件箱整組裝上工作台。";

const TONE: Record<BlockKind, "lo" | "mid" | "hi"> = {
  system: "lo", tools: "lo", mcp: "mid", listing: "mid", user: "hi", skill: "hi", ref: "mid", tool_result: "mid",
};
/** slash command 用的是第二顆按鍵 */
const SLASH_KEY = 1;

type Anim = { z: number; dz: number; op: number };

function stackOf(blocks: Block[]) {
  let z = CARD_Z;
  const out = new Map<string, number>();
  for (const b of blocks) { out.set(b.id, z); z += b.h * K; }
  return out;
}

export default function SkillsFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const stack = useMemo(() => stackOf(step.ctx), [step.ctx]);
  const hot = step.hot ?? [];
  const servers = step.servers ?? 0;
  const mcpBlock = step.ctx.find((b) => b.id === "mcp");
  const toolSearch = Boolean(mcpBlock?.label.includes("按需"));
  const userPressed = typeof step.flight?.from === "string" && step.flight.from === "user";

  // 這一步唯一亮起的零件
  const toSkill = step.flight && typeof step.flight.to === "object" && "skill" in step.flight.to ? step.flight.to.skill : null;
  const fromServer = step.flight && typeof step.flight.from === "object" && "server" in step.flight.from ? step.flight.from.server : null;
  const lit =
    step.plugin ? "crate"
    : toolSearch && index > 0 && !steps[index - 1].ctx.find((b) => b.id === "mcp")?.label.includes("按需") ? "switch"
    : userPressed ? "key"
    : fromServer !== null ? `device-${fromServer}`
    : toSkill && !step.loaded?.includes(toSkill) ? `cassette-${toSkill}`
    : hot.length ? `card-${hot[hot.length - 1]}`
    : null;

  /** 每個卡匣的位置：判斷中拉出一點、正在用的拉到底 */
  const pullOf = (id: string) => (step.focusSkill === id ? (step.loaded?.includes(id) ? PULL_FULL : PULL_PEEK) : 0);
  const drawerOf = (id: string) => (step.focusSkill === id && step.ctx.some((b) => b.id === "ref") && id === "dialogue" ? DRAWER_UP : 0);
  const claspOf = (id: string) => (SKILLS.find((s) => s.id === id)?.manual && step.focusSkill === id ? 4 : 0);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const cassetteEls = useRef(new Map<string, SVGGElement | null>());
  const drawerEls = useRef(new Map<string, SVGGElement | null>());
  const claspEls = useRef(new Map<string, SVGGElement | null>());
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const keyEl = useRef<SVGGElement>(null);
  const knob = useRef<SVGGElement>(null);
  const crate = useRef<SVGGElement>(null);

  const state = useRef<{
    pull: Map<string, number>; drawer: Map<string, number>; clasp: Map<string, number>;
    cards: Map<string, Anim>; key: number; knob: number; crate: number; mounted: boolean;
  }>(null!);
  if (!state.current) {
    state.current = {
      pull: new Map(SKILLS.map((s) => [s.id, pullOf(s.id)])),
      drawer: new Map(SKILLS.map((s) => [s.id, drawerOf(s.id)])),
      clasp: new Map(SKILLS.map((s) => [s.id, claspOf(s.id)])),
      cards: new Map(),
      key: userPressed ? 1.6 : 0,
      knob: toolSearch ? 12 : 0,
      crate: step.plugin ? 0 : CRATE_DROP,
      mounted: false,
    };
  }
  const s0 = state.current;
  for (const b of step.ctx) {
    if (!s0.cards.has(b.id)) {
      const z = stack.get(b.id)!;
      s0.cards.set(b.id, s0.mounted ? { z, dz: 18, op: 0 } : { z, dz: 0, op: 1 });
    }
  }
  for (const id of [...s0.cards.keys()]) if (!step.ctx.some((b) => b.id === id)) s0.cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  const loaded = step.loaded?.length ?? 0;
  const listed = step.listed ? SKILLS.filter((s) => !s.manual).length : 0;
  const readout = `技能名片 ${listed} · 全文 ${loaded} · MCP ${servers} 台${toolSearch ? "（按需載入）" : ""}${step.plugin ? " · Plugin" : ""}`;

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    const ease = (map: Map<string, number>, id: string, target: number, el: SVGGElement | null | undefined, to: (v: number) => [number, number, number]) => {
      const v = follow(map.get(id) ?? target, target, dt, 0.24, calm);
      map.set(id, v);
      busy ||= v !== target;
      el?.setAttribute("transform", translateAlong(P, to(v)));
    };
    for (const sk of SKILLS) {
      ease(s.pull, sk.id, pullOf(sk.id), cassetteEls.current.get(sk.id), (v) => [0, v, 0]);
      ease(s.drawer, sk.id, drawerOf(sk.id), drawerEls.current.get(sk.id), (v) => [0, 0, v]);
      ease(s.clasp, sk.id, claspOf(sk.id), claspEls.current.get(sk.id), (v) => [0, 0, v]);
    }
    s.cards.forEach((c, id) => {
      const z = stack.get(id)!;
      c.z = follow(c.z, z, dt, 0.25, calm);
      c.dz = follow(c.dz, 0, dt, 0.22, calm);
      c.op = follow(c.op, 1, dt, 0.16, calm);
      busy ||= c.z !== z || c.dz !== 0 || c.op !== 1;
      const el = cardEls.current.get(id);
      el?.setAttribute("transform", translateAlong(P, [0, 0, c.z + c.dz]));
      el?.setAttribute("opacity", String(Math.round(c.op * 100) / 100));
    });
    const keyTarget = userPressed ? 1.6 : 0;
    s.key = follow(s.key, keyTarget, dt, 0.12, calm);
    const knobTarget = toolSearch ? 12 : 0;
    s.knob = follow(s.knob, knobTarget, dt, 0.22, calm);
    const crateTarget = step.plugin ? 0 : CRATE_DROP;
    s.crate = follow(s.crate, crateTarget, dt, 0.24, calm);
    busy ||= s.key !== keyTarget || s.knob !== knobTarget || s.crate !== crateTarget;
    keyEl.current?.setAttribute("transform", translateAlong(P, [0, 0, -s.key]));
    knob.current?.setAttribute("transform", translateAlong(P, [s.knob, 0, 0]));
    crate.current?.setAttribute("transform", translateAlong(P, [0, 0, s.crate]));
    crate.current?.setAttribute("opacity", String(Math.round(Math.max(0, 1 - s.crate / CRATE_DROP) * 100) / 100));
    say(readout);
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  // 卡匣：沒拉出的由左到右，拉出的最後畫（它在最前面）
  const order = [...SKILLS.keys()].sort((a, b) => (pullOf(SKILLS[a].id) ? 1 : 0) - (pullOf(SKILLS[b].id) ? 1 : 0) || a - b);

  return (
    <div className="iso ch07-fig">
      <Plate
        fig="Fig 7"
        title="Skills · MCP · 卡匣台"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步動作的零件" },
          { mark: "raised", label: "卡匣書背的名片 = 技能清單" },
          { mark: "red", label: "工具定義膨脹" },
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

            {/* 技能卡匣架 */}
            <g key="skill-rack">
              <path className="iso-halo" d={RACK_ART.halo} />
              <Solid paths={RACK_ART.floor} tone="lo" />
              <Dots points={RACK_ART.floorScrews} size={0.45} tone="mid" />
              <Solid paths={RACK_ART.back} tone="mid" />
              {RACK_ART.dividers.map((d, i) => <Solid key={i} paths={d} tone="mid" />)}
              <Line d={RACK_ART.stops} tone="lo" />
              {order.map((i) => {
                const sk = SKILLS[i];
                const art = cassetteArt(i);
                const shown = step.listed && !sk.manual;
                const using = step.loaded?.includes(sk.id);
                return (
                  <g key={sk.id} ref={(el) => { cassetteEls.current.set(sk.id, el); }} transform={translateAlong(P, [0, s0.pull.get(sk.id) ?? 0, 0])}>
                    <g ref={(el) => { drawerEls.current.set(sk.id, el); }} transform={translateAlong(P, [0, 0, s0.drawer.get(sk.id) ?? 0])}>
                      <Solid paths={art.drawer} tone="mid" lit={lit === "card-ref" && sk.id === "dialogue"} />
                      <Line d={art.drawerLine} tone="faint" />
                    </g>
                    <Solid paths={art.body} tone={using ? "hi" : "mid"} lit={lit === `cassette-${sk.id}`} inner={<Line d={art.seam} tone="faint" />} />
                    <Line d={art.card} tone={shown ? "hi" : sk.manual ? "lo" : "mid"} />
                    <Line d={art.cardRule} tone={shown ? "mid" : "faint"} free />
                    <Line d={art.grip} tone="lo" />
                    <Dots points={art.gripDots} size={0.4} tone="mid" />
                    {sk.manual && (
                      <g ref={(el) => { claspEls.current.set(sk.id, el); }} transform={translateAlong(P, [0, 0, s0.clasp.get(sk.id) ?? 0])}>
                        <Solid paths={art.clasp} tone="mid" />
                        <Solid paths={art.claspPin} tone="mid" />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>

            {/* 模型機櫃 */}
            <g key="cabinet">
              <path className="iso-halo" d={CAB_ART.halo} />
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="hi" inner={<Line d={CAB_ART.seams} tone="faint" />} />
              <Line d={CAB_ART.vents} tone="lo" />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <Solid paths={CAB_ART.cap} tone="mid" />
              <Dots points={CAB_ART.capScrews} size={0.5} tone="mid" />
            </g>

            {/* MCP 插座面板 */}
            <g key="panel">
              <Solid paths={PANEL_ART.foot} tone="lo" />
              <Dots points={PANEL_ART.footScrews} size={0.45} tone="mid" />
              <Solid paths={PANEL_ART.panel} tone="mid" inner={<Line d={PANEL_ART.seam} tone="faint" />} />
              {PANEL_ART.sockets.map((so, i) => (
                <g key={i}>
                  <Line d={so.plate} tone="lo" />
                  <Line d={so.ring} tone={i < servers ? "mid" : "lo"} />
                  <Line d={so.bore} tone="faint" />
                  <Dots points={so.screws} size={0.4} tone="mid" />
                </g>
              ))}
              <Solid paths={PANEL_ART.switchTrack} tone="lo" />
              <g ref={knob} transform={translateAlong(P, [s0.knob, 0, 0])}>
                <Solid paths={PANEL_ART.switchKnob} tone="mid" lit={lit === "switch"} />
                <Solid paths={PANEL_ART.switchCap} tone="mid" />
                <Line d={PANEL_ART.switchKnurl} tone="lo" />
              </g>
              {DEVICES.slice(0, servers).map((dv, i) => (
                <g key={`plug${i}`}><Solid paths={dv.plug} tone="mid" /></g>
              ))}
            </g>

            {/* context 卡架 */}
            <g key="ctx">
              <path className="iso-halo" d={CTX_ART.halo} />
              <Solid paths={CTX_ART.plinth} tone="lo" />
              <Dots points={CTX_ART.plinthScrews} size={0.45} tone="mid" />
              <Solid paths={CTX_ART.tray} tone="lo" crease="none" />
              {CTX_ART.backPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>)}
              {step.ctx.map((b) => {
                const c = s0.cards.get(b.id)!;
                const art = cardArt(b.h * K);
                return (
                  <g key={b.id} ref={(el) => { cardEls.current.set(b.id, el); }} transform={translateAlong(P, [0, 0, c.z + c.dz])} opacity={c.op}>
                    <Solid paths={art.paths} tone={TONE[b.kind]} lit={lit === `card-${b.id}`} inner={<Line d={art.layers} tone="faint" />} />
                    {step.warn === b.id && <Line d={art.paths.outline} tone="red" />}
                  </g>
                );
              })}
              {CTX_ART.frontPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>)}
            </g>

            {/* 外部系統（MCP server）與纜線 */}
            {DEVICES.map((dv, i) => {
              const on = i < servers;
              return (
                <g key={`dev${i}`}>
                  <path className="iso-halo" d={dv.halo} />
                  <Solid paths={dv.body} tone={on ? "hi" : "mid"} inner={<Line d={dv.seam} tone="faint" />} />
                  <Line d={dv.vents} tone="lo" />
                  <Solid paths={dv.port} tone="mid" />
                  <Solid paths={dv.lampBase} tone="mid" />
                  <Solid paths={dv.lamp} tone={on ? "hi" : "lo"} lit={lit === `device-${i}`} />
                  {on && (
                    <g className="iso-wire" data-tone="mid">
                      <Line d={dv.cable} tone="mid" />
                      {dv.ends.map(([x, y], k) => <circle key={k} className="iso-wire-end" cx={x} cy={y} r={1.1} />)}
                    </g>
                  )}
                </g>
              );
            })}

            {/* 使用者按鍵盤 */}
            <g key="console">
              <path className="iso-halo" d={CONSOLE_ART.halo} />
              <Solid paths={CONSOLE_ART.body} tone="mid" inner={<Line d={CONSOLE_ART.seam} tone="faint" />} />
              <Line d={CONSOLE_ART.plate} tone="faint" />
              <Dots points={CONSOLE_ART.screws} size={0.45} tone="mid" />
              {CONSOLE_ART.keys.map((k, i) =>
                i === SLASH_KEY ? (
                  <g key={i} ref={keyEl} transform={translateAlong(P, [0, 0, -s0.key])}>
                    <Solid paths={k} tone="hi" lit={lit === "key"} />
                  </g>
                ) : (
                  <Solid key={i} paths={k} tone="mid" />
                ),
              )}
            </g>

            {/* Plugin 套件箱 */}
            <g ref={crate} key="crate" transform={translateAlong(P, [0, 0, s0.crate])} opacity={step.plugin ? 1 : 0}>
              <Solid paths={CRATE_ART.floor} tone="lo" />
              <Solid paths={CRATE_ART.back} tone="mid" />
              <Solid paths={CRATE_ART.left} tone="mid" />
              <Solid paths={CRATE_ART.cassette} tone="hi" />
              <Solid paths={CRATE_ART.card} tone="mid" />
              <Solid paths={CRATE_ART.plug} tone="mid" />
              <Solid paths={CRATE_ART.right} tone="mid" />
              <Solid paths={CRATE_ART.front} tone="mid" lit={lit === "crate"} />
              <Line d={CRATE_ART.frontPlate} tone="lo" />
              <Dots points={CRATE_ART.rivets} size={0.4} tone="mid" />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
