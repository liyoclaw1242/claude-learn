import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import { LiveSolid, setSolid } from "../../../iso/react/LiveSolid";
import "../../../iso/iso.css";
import "./figure.css";
import { MODULES, PATH, type ModuleKey, type Step } from "../steps";
import {
  BASE_ART, CARRIAGE_ART, CONTEXT_ART, CORE_ART, GATE_ART, GATE_DOWN, GATE_UP, MEMORY_ART, OPEN_DRAWER, PADS,
  PULLED_CART, RULES_ART, SKILLS_ART, SUBAGENT_ART, TOOLS_ART, USER_ART, WRITE_DRAWER,
} from "./geometry";
import { GATE_X, HEIGHT, P, STOP_X, WIDTH } from "./view";

const LABEL =
  "Claude Film 的總成工作台：左邊是模型機櫃，前方導軌上的滑台是 Agent Loop；導軌後方依序是 context 卡架、規則組裝夾具、工具櫃、" +
  "三個子代理小卡架、技能卡匣與 MCP 插座、記憶檔案櫃，權限閘門跨在導軌上，右前方是編劇的批准桌。" +
  "每台機器站在一塊底板上：光面是 Claude Agent SDK 現成的，滿刻線是 Claude Film 自建的，半刻線是 SDK 給機制、Film 填內容。";

/** 由後往前、由左往右的繪製順序（core 的導軌與滑台、閘門、批准桌另外處理） */
const BACK_ROW: ModuleKey[] = ["context", "rules", "tools", "subagents", "skills", "memory"];
const PATH_DWELL = 0.55;
const DROP = 60;

type Anim = {
  drop: Record<string, number>;
  x: number;
  gate: number;
  tool: number;
  memory: number;
  cart: number;
  pathAt: number;
  dwell: number;
  visited: Set<ModuleKey>;
  mounted: boolean;
};

export default function ArchitectureFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const visible = useMemo(() => new Set(step.visible), [step.visible]);
  const walking = Boolean(step.path);
  const owners = Boolean(step.ownership);
  const focus = step.focus;

  // 非走查步驟的各部件目標
  const carriageHome = focus === "hooks" ? GATE_X - 22 : focus ? STOP_X[focus] : STOP_X.core;
  const gateDown = focus === "hooks";
  const toolOpen = focus === "tools" ? 9 : 0;
  const memoryOpen = focus === "memory" || owners ? 9 : 0;
  const cartOut = focus === "skills" ? 10 : 0;

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const groups = useRef(new Map<string, SVGGElement | null>());
  const carriage = useRef<SVGGElement>(null);
  const gate = useRef<SVGGElement>(null);
  const toolFront = useRef<SVGGElement>(null);
  const toolBox = useRef<SVGGElement>(null);
  const memFront = useRef<SVGGElement>(null);
  const memBox = useRef<SVGGElement>(null);
  const cart = useRef<SVGGElement>(null);
  const lamps = useRef(new Map<ModuleKey, SVGGElement | null>());

  // 首次掛載直接停在這一步的結尾狀態（走查步驟 = 已走完）
  const state = useRef<Anim>(null!);
  if (!state.current) {
    state.current = {
      drop: {},
      x: walking ? STOP_X.user : carriageHome,
      gate: gateDown ? GATE_DOWN : GATE_UP,
      tool: toolOpen,
      memory: walking ? 9 : memoryOpen,
      cart: walking ? 10 : cartOut,
      pathAt: walking ? PATH.length : 0,
      dwell: 0,
      visited: new Set(walking ? PATH : []),
      mounted: false,
    };
  }
  const s0 = state.current;
  for (const key of step.visible) if (!(key in s0.drop)) s0.drop[key] = s0.mounted ? DROP : 0;
  for (const key of Object.keys(s0.drop)) if (!visible.has(key as ModuleKey)) delete s0.drop[key];
  useEffect(() => { state.current.mounted = true; });

  // 從別的步驟切進走查：從起點重新走（深連結直接進來則停在走完的狀態）
  const enteredWalk = useRef(walking);
  if (walking && !enteredWalk.current) {
    s0.pathAt = 0;
    s0.dwell = 0;
    s0.visited.clear();
    s0.memory = 0;
    s0.cart = 0;
  }
  enteredWalk.current = walking;

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;

    for (const key of Object.keys(s.drop)) {
      s.drop[key] = follow(s.drop[key], 0, dt, 0.28, calm);
      busy ||= s.drop[key] !== 0;
      const lift = translateAlong(P, [0, 0, s.drop[key]]);
      groups.current.get(key)?.setAttribute("transform", lift);
      if (key === "hooks") groups.current.get("hooks-front")?.setAttribute("transform", lift);
    }

    // 走查：依序停靠路徑上的每一站
    let target = carriageHome;
    let here: ModuleKey | null = null;
    if (walking) {
      if (s.pathAt < PATH.length) {
        const key = PATH[s.pathAt];
        target = STOP_X[key];
        if (Math.abs(s.x - target) < 0.6) {
          here = key;
          s.dwell += dt;
          if (calm || s.dwell > PATH_DWELL) {
            s.visited.add(key);
            s.pathAt++;
            s.dwell = 0;
          }
        }
        busy = true;
      } else target = STOP_X.user;
    }
    s.x = follow(s.x, target, dt, walking ? 0.16 : 0.3, calm);
    busy ||= s.x !== target;
    carriage.current?.setAttribute("transform", translateAlong(P, [s.x, 0, 0]));

    // 閘門：focus 時放下擋住；走查經過時保持升起
    const gateTarget = gateDown ? GATE_DOWN : GATE_UP;
    s.gate = follow(s.gate, gateTarget, dt, 0.2, calm);
    busy ||= s.gate !== gateTarget;
    gate.current?.setAttribute("transform", translateAlong(P, [0, 0, s.gate]));

    const toolTarget = walking ? (here === "tools" ? 9 : 0) : toolOpen;
    const memTarget = walking ? (s.visited.has("memory") || here === "memory" ? 9 : 0) : memoryOpen;
    const cartTarget = walking ? (s.visited.has("skills") || here === "skills" ? 10 : 0) : cartOut;
    const was = [s.tool, s.memory];
    s.tool = follow(s.tool, toolTarget, dt, 0.15, calm);
    s.memory = follow(s.memory, memTarget, dt, 0.18, calm);
    s.cart = follow(s.cart, cartTarget, dt, 0.18, calm);
    busy ||= s.tool !== toolTarget || s.memory !== memTarget || s.cart !== cartTarget;
    toolFront.current?.setAttribute("transform", translateAlong(P, [0, s.tool, 0]));
    memFront.current?.setAttribute("transform", translateAlong(P, [0, s.memory, 0]));
    cart.current?.setAttribute("transform", translateAlong(P, [0, s.cart, 0]));
    if (was[0] !== s.tool || !toolBox.current?.dataset.ready) {
      setSolid(toolBox.current, TOOLS_ART.drawers[OPEN_DRAWER].box(s.tool));
      toolBox.current?.setAttribute("data-ready", "");
    }
    if (was[1] !== s.memory || !memBox.current?.dataset.ready) {
      setSolid(memBox.current, MEMORY_ART.drawers[WRITE_DRAWER].box(s.memory));
      memBox.current?.setAttribute("data-ready", "");
    }

    // 狀態燈：走過的站、或這一步聚焦的那台亮起
    lamps.current.forEach((el, key) => {
      const on = walking ? s.visited.has(key) || here === key : key === focus;
      el?.setAttribute("data-on", on ? "" : "x");
    });

    say(readoutOf(s, here));
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  function readoutOf(s: Anim, here: ModuleKey | null) {
    if (owners) return "光面 = SDK 現成 · 滿刻線 = Film 自建 · 半刻線 = 兩者";
    if (walking) {
      if (s.pathAt >= PATH.length) return `走完 ${PATH.length} 站 · 回到編劇`;
      const key = here ?? PATH[s.pathAt];
      return `第 ${s.pathAt + 1} / ${PATH.length} 站 · ${MODULES[key].name}`;
    }
    const m = focus ? MODULES[focus] : null;
    return `${step.visible.length} 個元件${m ? ` · ${m.ch === "—" ? "" : `${m.ch} `}${m.name}` : ""}`;
  }

  const litOf = (key: ModuleKey) => !walking && !owners && focus === key;
  const hatchTone = owners ? "hi" : "faint";

  /** 每台機器：底板（含刻線與狀態燈）＋本體，整組可以從上方落下 */
  const module = (key: ModuleKey, body: ReactNode) => {
    if (!visible.has(key)) return null;
    const pad = PADS[key];
    const lampOn = walking ? s0.visited.has(key) : key === focus;
    return (
      <g key={key} ref={(el) => { groups.current.set(key, el); }} transform={translateAlong(P, [0, 0, s0.drop[key] ?? 0])}>
        <Solid paths={pad.pad} tone={owners ? "mid" : "lo"} crease="none" />
        <Line d={pad.hatch[MODULES[key].owner]} tone={hatchTone} />
        <Solid paths={pad.lampBase} tone="mid" />
        <g ref={(el) => { lamps.current.set(key, el); }} className="ch09-lamp" data-on={lampOn ? "" : "x"}>
          <Solid paths={pad.lamp} tone="hi" />
        </g>
        {body}
      </g>
    );
  };

  const BODIES: Record<string, ReactNode> = {
    context: (
      <>
        <Solid paths={CONTEXT_ART.plinth} tone="lo" />
        {CONTEXT_ART.backPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
        {CONTEXT_ART.cards.map((p, i) => <Solid key={i} paths={p} tone={i === 2 ? "mid" : "lo"} />)}
        {CONTEXT_ART.frontPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
        <Line d={CONTEXT_ART.wire} tone="red" />
        <Dots points={CONTEXT_ART.wireEnds} size={0.7} tone="hi" />
        <Solid paths={CONTEXT_ART.head} tone="mid" lit={litOf("context")} />
        <Solid paths={CONTEXT_ART.knob} tone="mid" />
      </>
    ),
    rules: (
      <>
        <Solid paths={RULES_ART.plinth} tone="mid" />
        {RULES_ART.rods.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
        {RULES_ART.parts.map((part, i) => part.kind === "card"
          ? <Solid key={i} paths={part.paths} tone="hi" />
          : <g key={i}><Solid paths={part.tab} tone="hi" /><Solid paths={part.paths} tone="mid" crease="none" /></g>)}
        <Solid paths={RULES_ART.clampPlate} tone="mid" lit={litOf("rules")} />
        <Solid paths={RULES_ART.clampBar} tone="mid" />
      </>
    ),
    tools: (
      <>
        <Solid paths={TOOLS_ART.plinth} tone="lo" />
        <Solid paths={TOOLS_ART.body} tone="mid" lit={litOf("tools")} />
        <Line d={TOOLS_ART.bays} tone="lo" />
        {TOOLS_ART.drawers.map((d, i) => i === OPEN_DRAWER ? null : (
          <g key={i}>
            <Solid paths={d.front} tone="mid" />
            <Line d={d.card} tone="faint" />
            <Solid paths={d.pull} tone="mid" />
          </g>
        ))}
        <LiveSolid ref={toolBox} paths={TOOLS_ART.drawers[OPEN_DRAWER].box(s0.tool)} tone="lo" />
        <g ref={toolFront} transform={translateAlong(P, [0, s0.tool, 0])}>
          <Solid paths={TOOLS_ART.drawers[OPEN_DRAWER].front} tone="hi" />
          <Line d={TOOLS_ART.drawers[OPEN_DRAWER].card} tone="mid" />
          <Solid paths={TOOLS_ART.drawers[OPEN_DRAWER].pull} tone="mid" />
        </g>
        <Solid paths={TOOLS_ART.top} tone="mid" />
        <Dots points={TOOLS_ART.topScrews} size={0.45} tone="mid" />
      </>
    ),
    subagents: (
      <>
        <Solid paths={SUBAGENT_ART.partition} tone="mid" />
        {SUBAGENT_ART.racks.map((r, i) => (
          <g key={i}>
            <Solid paths={r.plinth} tone="lo" />
            {r.backPosts.map((p, k) => <Solid key={k} paths={p} tone="mid" crease="none" />)}
            {r.cards.map((p, k) => <Solid key={k} paths={p} tone={k ? "mid" : "hi"} />)}
            {r.frontPosts.map((p, k) => <Solid key={k} paths={p} tone="mid" crease="none" />)}
            <Solid paths={r.cab} tone="hi" lit={litOf("subagents") && i === 1} />
            <Line d={r.cabSlot} tone="lo" />
          </g>
        ))}
      </>
    ),
    skills: (
      <>
        <Solid paths={SKILLS_ART.rackBase} tone="lo" />
        <Solid paths={SKILLS_ART.rackBack} tone="mid" />
        {SKILLS_ART.carts.map((c, i) => i === PULLED_CART ? (
          <g key={i} ref={cart} transform={translateAlong(P, [0, s0.cart, 0])}>
            <Solid paths={c.body} tone="hi" lit={litOf("skills")} />
            <Line d={c.spine} tone="mid" />
          </g>
        ) : (
          <g key={i}><Solid paths={c.body} tone="mid" /><Line d={c.spine} tone="lo" /></g>
        ))}
        <Solid paths={SKILLS_ART.panelFoot} tone="lo" />
        <Solid paths={SKILLS_ART.panel} tone="mid" />
        <Line d={SKILLS_ART.sockets} tone="lo" />
        <Line d={SKILLS_ART.socketsInner} tone="faint" />
        <Solid paths={SKILLS_ART.device} tone="mid" />
        <Solid paths={SKILLS_ART.deviceLamp} tone="hi" />
        <Line d={SKILLS_ART.cable} tone="mid" />
        <Dots points={SKILLS_ART.cableEnds} size={0.9} tone="hi" />
      </>
    ),
    memory: (
      <>
        <Solid paths={MEMORY_ART.plinth} tone="lo" />
        <Solid paths={MEMORY_ART.body} tone="mid" lit={litOf("memory")} />
        <Line d={MEMORY_ART.bays} tone="lo" />
        {MEMORY_ART.drawers.map((d, i) => i === WRITE_DRAWER ? null : (
          <g key={i}><Solid paths={d.front} tone="mid" /><Line d={d.holder} tone="lo" /><Solid paths={d.pull} tone="mid" /></g>
        ))}
        <LiveSolid ref={memBox} paths={MEMORY_ART.drawers[WRITE_DRAWER].box(s0.memory)} tone="lo" />
        <g ref={memFront} transform={translateAlong(P, [0, s0.memory, 0])}>
          <Solid paths={MEMORY_ART.drawers[WRITE_DRAWER].front} tone="hi" />
          <Line d={MEMORY_ART.drawers[WRITE_DRAWER].holder} tone="mid" />
          <Solid paths={MEMORY_ART.drawers[WRITE_DRAWER].pull} tone="mid" />
        </g>
        <Solid paths={MEMORY_ART.top} tone="mid" />
        <Dots points={MEMORY_ART.topScrews} size={0.45} tone="mid" />
      </>
    ),
  };

  return (
    <div className="iso ch09-fig">
      <Plate
        fig="Fig 9"
        title="Claude Film · 總成"
        hint="← → 切換步驟"
        readout={readoutOf(s0, null)}
        keys={owners
          ? [
              { mark: "flat", label: "光面底板：Claude Agent SDK 現成" },
              { mark: "dashed", label: "刻線底板：Claude Film 自建（半刻線 = 兩者）" },
            ]
          : [
              { mark: "lit", label: walking ? "請求卡" : "這一步裝上的機器" },
              { mark: "dotted", label: "底板上的燈：走過 / 聚焦的站" },
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

            {/* 01 模型機櫃 */}
            {module("core", (
              <>
                <path className="iso-halo" d={CORE_ART.halo} />
                <Solid paths={CORE_ART.plinth} tone="lo" />
                <Solid paths={CORE_ART.body} tone="hi" lit={litOf("core")} inner={<Line d={CORE_ART.seams} tone="faint" />} />
                <Line d={CORE_ART.vents} tone="lo" />
                <Line d={CORE_ART.bay} tone="mid" />
                <Dots points={CORE_ART.rivets} size={0.42} tone="mid" />
                <Solid paths={CORE_ART.cap} tone="mid" />
                <Solid paths={CORE_ART.dialStand} tone="lo" />
                <Solid paths={CORE_ART.dial} tone="hi" crease="lo" />
                <Line d={CORE_ART.dialKnurl} tone="faint" />
                <Line d={CORE_ART.dialMinor} tone="lo" />
                <Line d={CORE_ART.dialMajor} tone="mid" />
                <Line d={CORE_ART.needle} tone="hi" />
                <Solid paths={CORE_ART.lampBase} tone="mid" />
                <Solid paths={CORE_ART.lamp} tone={walking ? "hi" : "lo"} />
              </>
            ))}

            {/* 後排各站，由左到右 */}
            {BACK_ROW.map((key) => module(key, BODIES[key]))}

            {/* 閘門的底板、腳座與後立柱 → 導軌 → 滑台 → 前立柱、橫樑、閘板 */}
            {visible.has("hooks") && (
              <g key="gate-back" ref={(el) => { groups.current.set("hooks", el); }} transform={translateAlong(P, [0, 0, s0.drop.hooks ?? 0])}>
                <Solid paths={GATE_ART.pad.pad} tone={owners ? "mid" : "lo"} crease="none" />
                <Line d={GATE_ART.pad.hatch[MODULES.hooks.owner]} tone={hatchTone} />
                <Solid paths={GATE_ART.pad.lampBase} tone="mid" />
                <g ref={(el) => { lamps.current.set("hooks", el); }} className="ch09-lamp" data-on={(walking ? s0.visited.has("hooks") : focus === "hooks") ? "" : "x"}>
                  <Solid paths={GATE_ART.pad.lamp} tone="hi" />
                </g>
                {GATE_ART.feet.map((p, i) => <Solid key={i} paths={p} tone="lo" />)}
                <Solid paths={GATE_ART.backPost} tone="mid" />
              </g>
            )}

            <g key="rail">
              <Solid paths={CORE_ART.rail} tone="mid" />
              <Line d={CORE_ART.railTicks} tone="lo" />
              <Solid paths={CORE_ART.railStop} tone="mid" />
              <Dots points={CORE_ART.railStopScrews} size={0.45} tone="mid" />
            </g>

            <g ref={carriage} key="carriage" transform={translateAlong(P, [s0.x, 0, 0])}>
              <Solid paths={CARRIAGE_ART.plate} tone="mid" inner={<Line d={CARRIAGE_ART.seam} tone="faint" />} />
              {CARRIAGE_ART.backPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
              {CARRIAGE_ART.deck.map((p, i) => <Solid key={i} paths={p} tone={i === 1 ? "hi" : "lo"} />)}
              {walking && <Solid paths={CARRIAGE_ART.request} tone="hi" lit />}
              {CARRIAGE_ART.frontPosts.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
            </g>

            {visible.has("hooks") && (
              <g key="gate-front" ref={(el) => { groups.current.set("hooks-front", el); }} transform={translateAlong(P, [0, 0, s0.drop.hooks ?? 0])}>
                <Solid paths={GATE_ART.frontPost} tone="mid" />
                <g ref={gate} transform={translateAlong(P, [0, 0, s0.gate])}>
                  <Solid paths={GATE_ART.plate} tone="hi" lit={litOf("hooks")} inner={<Line d={GATE_ART.plateLine} tone="faint" />} />
                  {gateDown && <Line d={GATE_ART.plate.outline} tone="red" />}
                </g>
                <Solid paths={GATE_ART.beam} tone="mid" />
                <Dots points={GATE_ART.beamScrews} size={0.5} tone="mid" />
              </g>
            )}

            {/* 編劇 / 導演的批准桌 */}
            {module("user", (
              <>
                {USER_ART.legs.map((p, i) => <Solid key={i} paths={p} tone="mid" crease="none" />)}
                <Solid paths={USER_ART.top} tone="mid" lit={litOf("user")} />
                {USER_ART.pages.map((p, i) => <Solid key={i} paths={p} tone="hi" crease="none" />)}
                <Solid paths={USER_ART.buttonBase} tone="mid" />
                <Line d={USER_ART.buttonRing} tone="faint" />
                <Solid paths={USER_ART.button} tone={walking ? "hi" : "mid"} />
              </>
            ))}
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
