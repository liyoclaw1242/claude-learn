import { useEffect, useMemo, useRef } from "react";
import { pathOf, translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "./figure.css";
import type { Step } from "../steps";
import {
  BARRIER_ART, BASE_ART, BOLT_TRAVEL, CAB_ART, CARRIAGE_ART, DESK_ART, GATES_ART, POST_ART, PRE_ART, RAIL_ART, TOOL_ART,
  gatePlate, modePointer, needleAt,
} from "./geometry";
import { advance, freshMachine, planOf, restart, settle, type Machine } from "./model";
import {
  BARRIER_H, CARD_TOP, GATE_HOUSING, GATE_OPEN, HEIGHT, P, PROBE_REST, WIDTH, X, at,
} from "./view";

const LABEL =
  "一條分揀輸送線。左邊的模型機櫃把一張工具請求卡放上導軌滑台，滑台依序經過：PreToolUse 量測站（探針量卡、必要時升起擋板）、" +
  "權限閘門組（deny、ask、allow 三片閘板依序排列，前方是導演的批准按鈕，機殼上有權限模式旋鈕）、工具壓印機、PostToolUse 驗收站，" +
  "結果卡再沿導軌送回模型；被擋下的卡帶著紅框退回。機櫃正面的門閂是 Stop hook。";

const GATE_X = [X.deny, X.ask, X.allow];
const deflect = (tip: number) => Math.max(0, Math.min(1, (PROBE_REST - tip) / (PROBE_REST - CARD_TOP)));

/** 閘板只畫機殼正面以外的部分（收進機殼就看不到） */
function gateClip(gx: number) {
  const y0 = GATE_HOUSING.y + GATE_HOUSING.d;
  const pts = [[gx - 6, y0, 0], [gx + 6, y0, 0], [gx + 6, 30, 0], [gx - 6, 30, 0], [gx - 6, y0, 60], [gx + 6, y0, 60], [gx + 6, 30, 60], [gx - 6, 30, 60]]
    .map(([x, y, z]) => at([x, y, z]));
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (list: typeof pts) => {
    const out: typeof pts = [];
    for (const q of list) { while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], q) <= 0) out.pop(); out.push(q); }
    return out.slice(0, -1);
  };
  return pathOf([...half(pts), ...half([...pts].reverse())], true);
}
const GATE_CLIPS = GATE_X.map(gateClip);

export default function PermissionsFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const plan = useMemo(() => planOf(step), [step]);
  const st = step.state ?? {};

  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const r = {
    carriage: useRef<SVGGElement>(null),
    stamp: useRef<SVGPathElement>(null),
    red: useRef<SVGPathElement>(null),
    pre: useRef<SVGGElement>(null), preRod: useRef<SVGGElement>(null), preNeedle: useRef<SVGPathElement>(null),
    post: useRef<SVGGElement>(null), postRod: useRef<SVGGElement>(null), postNeedle: useRef<SVGPathElement>(null),
    tool: useRef<SVGGElement>(null), toolRod: useRef<SVGGElement>(null),
    barrier: useRef<SVGGElement>(null),
    gates: useRef<(SVGGElement | null)[]>([]),
    button: useRef<SVGGElement>(null),
    deskLamp: useRef<SVGGElement>(null),
    modelLamp: useRef<SVGGElement>(null),
    bolt: useRef<SVGGElement>(null),
    pointer: useRef<SVGPathElement>(null),
  };

  // 首次掛載直接跑完這一步的腳本；之後換步從目前狀態重新播放
  const machine = useRef<Machine>(null!);
  const lastIndex = useRef(index);
  if (!machine.current) {
    machine.current = freshMachine(plan);
    settle(machine.current, plan);
  } else if (lastIndex.current !== index) {
    restart(machine.current, plan);
    lastIndex.current = index;
  }
  const m0 = machine.current;

  const draw = (m: Machine) => {
    const z = (v: number) => translateAlong(P, [0, 0, v]);
    r.carriage.current?.setAttribute("transform", translateAlong(P, [m.x, 0, 0]));
    r.stamp.current?.setAttribute("visibility", m.card === "request" ? "hidden" : "visible");
    r.red.current?.setAttribute("visibility", m.card === "error" || m.card === "warn" ? "visible" : "hidden");
    r.pre.current?.setAttribute("transform", z(m.pre));
    r.preRod.current?.setAttribute("transform", z(m.pre));
    r.post.current?.setAttribute("transform", z(m.post));
    r.postRod.current?.setAttribute("transform", z(m.post));
    r.tool.current?.setAttribute("transform", z(m.tool));
    r.toolRod.current?.setAttribute("transform", z(m.tool));
    r.preNeedle.current?.setAttribute("d", needleAt(X.pre, 0.12 + deflect(m.pre) * (st.pre === "block" ? 0.82 : 0.5)));
    r.postNeedle.current?.setAttribute("d", needleAt(X.post, 0.12 + deflect(m.post) * (st.post === "warn" ? 0.82 : 0.5)));
    r.barrier.current?.setAttribute("transform", z((m.barrier - 1) * (BARRIER_H + 1)));
    GATE_X.forEach((_, i) => {
      const g = r.gates.current[i];
      g?.setAttribute("transform", translateAlong(P, [0, -GATE_OPEN * m.open[i], 0]));
      g?.setAttribute("visibility", m.open[i] > 0.97 ? "hidden" : "visible");
    });
    r.button.current?.setAttribute("transform", z(DESK_ART.buttonZ - m.button * 2));
    const toggle = (g: SVGGElement | null, on: boolean) => { if (on) g?.setAttribute("data-lit", ""); else g?.removeAttribute("data-lit"); };
    toggle(r.deskLamp.current, m.deskLamp);
    toggle(r.modelLamp.current, m.modelLamp);
    r.bolt.current?.setAttribute("transform", translateAlong(P, [BOLT_TRAVEL * m.bolt, 0, 0]));
    r.pointer.current?.setAttribute("d", modePointer(m.mode));
  };

  const kick = useLoop((dt, calm) => {
    const m = machine.current;
    const busy = advance(m, plan, dt, calm);
    draw(m);
    say(`${step.tool.name} · ${m.ai < plan.actions.length && m.label ? m.label : plan.verdict}`);
    return busy;
  }, visible);
  useEffect(() => { kick(); }, [index, kick]);

  // 每一步唯一亮起的零件
  const lit = (["carriage", "allow", "button", "deny", "deny", "knob", "barrier", "post", "bolt", "card"] as const)[index] ?? "card";
  const off = plan.armed ? undefined : "ch05-off";
  const lampOn = [st.rules === "block", st.rules === "ask", st.rules === "pass" || (plan.armed && !st.rules && st.pre !== "block")];
  const gauge = (art: typeof PRE_ART, which: "pre" | "post") => (
    <g key={which} className={off}>
      <g clipPath={`url(#ch05-rod-${which})`}>
        <g ref={which === "pre" ? r.preRod : r.postRod} transform={translateAlong(P, [0, 0, m0[which]])}>
          <Solid paths={art.rod} tone="mid" crease="none" />
        </g>
      </g>
      <g ref={which === "pre" ? r.pre : r.post} transform={translateAlong(P, [0, 0, m0[which]])}>
        <Solid paths={art.tip} tone="hi" lit={lit === which} />
      </g>
      <Solid paths={art.head} tone="mid" inner={<Line d={art.headSeam} tone="faint" />} />
      <Solid paths={art.arm} tone="mid" />
      <Dots points={art.armScrews} size={0.45} tone="mid" />
      <Solid paths={art.dialPost} tone="lo" />
      <Solid paths={art.dial} tone="hi" crease="lo" />
      <Line d={art.dialKnurl} tone="faint" />
      <Line d={art.dialBezel} tone="lo" />
      <Line d={art.dialMinor} tone="lo" />
      <Line d={art.dialMajor} tone="mid" />
      <path
        ref={which === "pre" ? r.preNeedle : r.postNeedle}
        className="iso-line"
        data-tone={(which === "pre" ? st.pre === "block" : st.post === "warn") ? "red" : "hi"}
        strokeWidth={1}
        d={needleAt(which === "pre" ? X.pre : X.post, 0.12 + deflect(m0[which]) * 0.5)}
      />
    </g>
  );

  return (
    <div className="iso ch05-fig">
      <Plate
        fig="Fig 5"
        title="Permissions · 分揀線"
        hint="← → 切換步驟"
        readout={`${step.tool.name} · ${plan.verdict}`}
        keys={[
          { mark: "lit", label: "這一步做決定的零件" },
          { mark: "red", label: "被擋下、以錯誤回到模型" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <defs>
              <clipPath id="ch05-rod-pre"><path d={PRE_ART.clip} /></clipPath>
              <clipPath id="ch05-rod-post"><path d={POST_ART.clip} /></clipPath>
              <clipPath id="ch05-rod-tool"><path d={TOOL_ART.clip} /></clipPath>
              <clipPath id="ch05-barrier"><path d={BARRIER_ART.clip} /></clipPath>
              {GATE_CLIPS.map((d, i) => <clipPath key={i} id={`ch05-gate-${i}`}><path d={d} /></clipPath>)}
            </defs>

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

            {/* 模型機櫃：出口門 + Stop hook 門閂 */}
            <g key="cabinet">
              <path className="iso-halo" d={CAB_ART.halo} />
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="hi" inner={<Line d={CAB_ART.seams} tone="faint" />} />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <Line d={CAB_ART.slot} tone="mid" />
              <Line d={CAB_ART.door} tone="mid" />
              <Line d={CAB_ART.doorInner} tone="faint" />
              <g className={plan.stopArmed ? undefined : "ch05-off"}>
                {CAB_ART.keepers.map((k, i) => <Solid key={i} paths={k} tone="mid" />)}
                <g ref={r.bolt} transform={translateAlong(P, [BOLT_TRAVEL * m0.bolt, 0, 0])}>
                  <Solid paths={CAB_ART.bolt} tone="mid" lit={lit === "bolt"} />
                  {st.stop === "block" && <Line d={CAB_ART.bolt.outline} tone="red" />}
                  <Solid paths={CAB_ART.boltKnob} tone="mid" />
                </g>
              </g>
              <Solid paths={CAB_ART.cap} tone="mid" />
              <Dots points={CAB_ART.capScrews} size={0.5} tone="mid" />
              <Solid paths={CAB_ART.lampBase} tone="mid" />
              <g ref={r.modelLamp} className="iso-solid-wrap" data-lit={m0.modelLamp ? "" : undefined}>
                <Solid paths={CAB_ART.lamp} tone="lo" />
              </g>
            </g>

            {/* 各站後半：腳座與立柱 */}
            {[PRE_ART, TOOL_ART, POST_ART].map((art, i) => (
              <g key={`back-${i}`} className={i === 1 ? undefined : off}>
                <Solid paths={art.foot} tone="lo" />
                <Dots points={art.footScrews} size={0.45} tone="mid" />
                <Solid paths={art.column} tone="mid" inner={<Line d={art.columnSeam} tone="faint" />} />
              </g>
            ))}

            {/* 權限閘門組機殼 */}
            <g key="gates" className={off}>
              <path className="iso-halo" d={GATES_ART.halo} />
              <Solid paths={GATES_ART.housing} tone="mid" inner={<Line d={GATES_ART.seam} tone="faint" />} />
              <Line d={GATES_ART.mouths} tone="lo" />
              <Solid paths={GATES_ART.plateTop} tone="lo" crease="none" />
              <Dots points={GATES_ART.screws} size={0.45} tone="mid" />
              {GATES_ART.lamps.map((l, i) => (
                <g key={i}>
                  <Solid paths={l.base} tone="mid" />
                  <Solid paths={l.lens} tone={lampOn[i] ? "hi" : "lo"} lit={(lit === "allow" && i === 2)} />
                  {lampOn[i] && i === 0 && <Line d={l.lens.outline} tone="red" />}
                </g>
              ))}
              <Line d={GATES_ART.modeTicks} tone="mid" />
              <Solid paths={GATES_ART.knob} tone="mid" lit={lit === "knob"} />
              <Line d={GATES_ART.knobKnurl} tone="lo" />
              <path ref={r.pointer} className="iso-line" data-tone="hi" strokeWidth={1} d={modePointer(m0.mode)} />
            </g>

            {/* 導軌與 PreToolUse 擋板的槽座 */}
            <g key="rail">
              <Solid paths={RAIL_ART.rail} tone="mid" />
              <Line d={RAIL_ART.ticksMinor} tone="lo" />
              <Line d={RAIL_ART.ticksMajor} tone="mid" />
              <Dots points={RAIL_ART.railScrews} size={0.45} tone="mid" />
              <Solid paths={RAIL_ART.stop} tone="mid" />
              <Dots points={RAIL_ART.stopScrews} size={0.45} tone="mid" />
              <g className={off}>
                <Solid paths={BARRIER_ART.housing} tone="lo" />
                <Line d={BARRIER_ART.slot} tone="lo" />
                <Dots points={BARRIER_ART.housingScrews} size={0.45} tone="mid" />
              </g>
            </g>

            {/* 滑台與卡 */}
            <g ref={r.carriage} key="carriage" transform={translateAlong(P, [m0.x, 0, 0])}>
              <Solid paths={CARRIAGE_ART.plate} tone="mid" lit={lit === "carriage"} inner={<Line d={CARRIAGE_ART.seam} tone="faint" />} />
              <Dots points={CARRIAGE_ART.rivets} size={0.4} tone="lo" />
              {CARRIAGE_ART.stops.slice(0, 2).map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
              <Solid paths={CARRIAGE_ART.card} tone="hi" lit={lit === "card"} inner={<Line d={CARRIAGE_ART.cardLayers} tone="faint" />} />
              <path ref={r.stamp} className="iso-line" data-tone="mid" data-free="" d={CARRIAGE_ART.stamp} visibility={m0.card === "request" ? "hidden" : "visible"} />
              <path ref={r.red} className="iso-line" data-tone="red" d={CARRIAGE_ART.card.outline} visibility={m0.card === "error" || m0.card === "warn" ? "visible" : "hidden"} />
              {CARRIAGE_ART.stops.slice(2).map((p, i) => <Solid key={i} paths={p} tone="mid" />)}
            </g>

            {/* PreToolUse 擋板（從槽口升起） */}
            <g key="barrier" clipPath="url(#ch05-barrier)" className={off}>
              <g ref={r.barrier} transform={translateAlong(P, [0, 0, (m0.barrier - 1) * (BARRIER_H + 1)])}>
                <Solid paths={BARRIER_ART.plate} tone="mid" lit={lit === "barrier"} inner={<Line d={BARRIER_ART.plateSeam} tone="faint" />} />
                {st.pre === "block" && <Line d={BARRIER_ART.plate.outline} tone="red" />}
              </g>
            </g>

            {/* 權限閘板：deny、ask、allow */}
            {GATE_X.map((gx, i) => {
              const art = gatePlate(gx);
              return (
                <g key={`gate-${i}`} clipPath={`url(#ch05-gate-${i})`} className={off}>
                  <g
                    ref={(el) => { r.gates.current[i] = el; }}
                    transform={translateAlong(P, [0, -GATE_OPEN * m0.open[i], 0])}
                    visibility={m0.open[i] > 0.97 ? "hidden" : "visible"}
                  >
                    <Solid paths={art.plate} tone={i === 0 ? "hi" : "mid"} lit={lit === "deny" && i === 0} inner={<Line d={art.seam} tone="faint" />} />
                    {i === 0 && st.rules === "block" && <Line d={art.plate.outline} tone="red" />}
                  </g>
                </g>
              );
            })}

            {/* 各站上半：探針、錶、壓頭 */}
            {gauge(PRE_ART, "pre")}
            <g key="tool">
              <g clipPath="url(#ch05-rod-tool)">
                <g ref={r.toolRod} transform={translateAlong(P, [0, 0, m0.tool])}>
                  <Solid paths={TOOL_ART.rod} tone="mid" crease="none" />
                </g>
              </g>
              <g ref={r.tool} transform={translateAlong(P, [0, 0, m0.tool])}>
                <Solid paths={TOOL_ART.pad} tone="hi" />
                <Line d={TOOL_ART.padRing} tone="faint" />
              </g>
              <Solid paths={TOOL_ART.head} tone="mid" inner={<Line d={TOOL_ART.headSeam} tone="faint" />} />
              <Solid paths={TOOL_ART.arm} tone="mid" />
              <Dots points={TOOL_ART.armScrews} size={0.45} tone="mid" />
              <Solid paths={TOOL_ART.knob} tone="mid" />
              <Line d={TOOL_ART.knobKnurl} tone="lo" />
            </g>
            {gauge(POST_ART, "post")}

            {/* 導演的批准台（導軌前方） */}
            <g key="desk" className={off}>
              <path className="iso-halo" d={DESK_ART.halo} />
              <Solid paths={DESK_ART.body} tone="mid" inner={<Line d={DESK_ART.seam} tone="faint" />} />
              <Line d={DESK_ART.panel} tone="faint" />
              <Dots points={DESK_ART.screws} size={0.45} tone="mid" />
              <Solid paths={DESK_ART.lampBase} tone="mid" />
              <g ref={r.deskLamp} className="iso-solid-wrap" data-lit={m0.deskLamp ? "" : undefined}>
                <Solid paths={DESK_ART.lamp} tone="lo" />
              </g>
              <Solid paths={DESK_ART.bezel} tone="lo" />
              <g ref={r.button} transform={translateAlong(P, [0, 0, DESK_ART.buttonZ - m0.button * 2])}>
                <Solid paths={DESK_ART.button} tone="hi" lit={lit === "button"} />
              </g>
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
