import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, FaceText, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "./figure.css";
import type { Step } from "../steps";
import {
  BASE_ART, CAB_ART, CARRIAGE_ART, DISPENSER_ART, HOOD_ART, HOOD_PLATE, PRESS_ART, RAIL_ART, TOOLS,
  cardArt, needleAt, type Tool,
} from "./geometry";
import { DIAL_FULL, deckTop, poseOf, readoutOf, stackOf } from "./model";
import { HEIGHT, HOOD_Z, P, PAD_H, PAD_REST, STATION, WIDTH } from "./view";

const HOOD_REST = HOOD_Z - 6 - PAD_H - 2;
const DROP = 16;
const LABEL =
  "一台讀卡機工作台。左邊是密封的模型機櫃，前方導軌上的滑台載著整疊訊息卡；" +
  "每次呼叫，滑台把整疊卡送到機櫃的讀卡罩下壓讀，機櫃頂上的錶顯示讀入的 token 數，然後吐回一張回覆卡。" +
  "回覆卡要求工具時，滑台開到後方對應的壓印機（Read、Edit、Bash），壓印後疊上一張結果卡。最右邊是使用者的投卡機。";

type CardAnim = { dz: number; op: number };

export default function AgentLoopFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const pose = useMemo(() => poseOf(steps, index), [steps, index]);
  const stack = useMemo(() => stackOf(step.msgs), [step.msgs]);
  const top = deckTop(step.msgs);
  const cards = useMemo(() => stack.map(({ z, t }) => cardArt(z, t)), [stack]);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const carriage = useRef<SVGGElement>(null);
  const hood = useRef<SVGGElement>(null);
  const needle = useRef<SVGPathElement>(null);
  const pads = useRef<Partial<Record<Tool, SVGGElement | null>>>({});
  const rods = useRef<Partial<Record<Tool, SVGGElement | null>>>({});
  const hoodRod = useRef<SVGGElement | null>(null);
  const cardEls = useRef<(SVGGElement | null)[]>([]);
  // 第一次掛載（含網址直接指定步驟）時直接停在這一步的定位，之後換步才有動畫
  const state = useRef<{ x: number; hood: number; needle: number; pads: Record<Tool, number>; cards: Map<number, CardAnim> }>(null!);
  if (!state.current) {
    const pad = (tool: Tool) => (pose.action === "stamp" && pose.station === tool ? top : PAD_REST);
    state.current = {
      x: STATION[pose.station],
      hood: pose.action === "read" ? top : HOOD_REST,
      needle: pose.readTokens / DIAL_FULL,
      pads: { Read: pad("Read"), Edit: pad("Edit"), Bash: pad("Bash") },
      cards: new Map(step.msgs.map((_, i) => [i, { dz: 0, op: 1 }])),
    };
  }

  // 新出現的卡從上方落下；回到前一步時移除多出來的卡
  const live = state.current.cards;
  for (const key of [...live.keys()]) if (key >= step.msgs.length) live.delete(key);
  step.msgs.forEach((_, i) => {
    if (!live.has(i)) live.set(i, i >= step.newFrom ? { dz: DROP, op: 0 } : { dz: 0, op: 1 });
  });

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    const target = STATION[pose.station];
    s.x = follow(s.x, target, dt, 0.32, calm);
    const arrived = Math.abs(s.x - target) < 0.4;

    let busy = s.x !== target;
    for (const tool of TOOLS) {
      const down = pose.action === "stamp" && pose.station === tool && arrived;
      s.pads[tool] = follow(s.pads[tool], down ? top : PAD_REST, dt, 0.22, calm);
      busy ||= s.pads[tool] !== (down ? top : PAD_REST);
      const lift = translateAlong(P, [0, 0, s.pads[tool]]);
      pads.current[tool]?.setAttribute("transform", lift);
      rods.current[tool]?.setAttribute("transform", lift);
    }

    const pressing = pose.action === "read" && arrived;
    s.hood = follow(s.hood, pressing ? top : HOOD_REST, dt, 0.22, calm);
    busy ||= s.hood !== (pressing ? top : HOOD_REST);
    const press = translateAlong(P, [0, 0, s.hood]);
    hood.current?.setAttribute("transform", press);
    hoodRod.current?.setAttribute("transform", press);

    // 錶只在讀卡罩壓到卡上之後才轉到新讀數
    const pressed = Math.abs(s.hood - top) < 0.6;
    const share = pose.readTokens / DIAL_FULL;
    if (pose.action !== "read" || pressed) s.needle = follow(s.needle, share, dt, 0.5, calm);
    busy ||= s.needle !== share;
    needle.current?.setAttribute("d", needleAt(s.needle));

    carriage.current?.setAttribute("transform", translateAlong(P, [s.x, 0, 0]));

    // 新卡等滑台到站、壓頭抬起後才落下
    const padsUp = TOOLS.every((tool) => Math.abs(s.pads[tool] - PAD_REST) < 1);
    const ready = arrived && padsUp && Math.abs(s.hood - HOOD_REST) < 1;
    s.cards.forEach((card, i) => {
      if (ready) {
        card.dz = follow(card.dz, 0, dt, 0.2, calm);
        card.op = follow(card.op, 1, dt, 0.15, calm);
      }
      busy ||= card.dz !== 0 || card.op !== 1;
      const el = cardEls.current[i];
      if (el) {
        el.setAttribute("transform", translateAlong(P, [0, 0, card.dz]));
        el.setAttribute("opacity", String(Math.round(card.op * 100) / 100));
      }
    });

    say(readoutOf(pose, step.msgs, !arrived));
    return busy;
  }, visible);

  useEffect(() => { kick(); }, [index, kick]);

  // 這一步唯一的亮點
  const newest = step.newFrom < step.msgs.length ? step.msgs.length - 1 : -1;
  const litCarriage = pose.action === "idle";
  const litHood = pose.action === "read";
  const litPad = pose.action === "stamp" ? (pose.station as Tool) : null;
  const toneOf = (kind: string) => (kind === "system" ? "lo" : kind === "user" ? "hi" : "mid") as "lo" | "hi" | "mid";

  return (
    <div className="iso ch01-fig">
      <Plate
        fig="Fig 1"
        title="Agent loop · 讀卡機"
        hint="← → 切換步驟"
        readout={readoutOf(pose, step.msgs, false)}
        keys={[
          { mark: "lit", label: "這一步在動的零件" },
          { mark: "raised", label: "一張卡 = 一則訊息，厚度 = token 數" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <defs>
              {TOOLS.map((tool) => (
                <clipPath key={tool} id={`ch01-rod-${tool}`}><path d={PRESS_ART[tool].clip} /></clipPath>
              ))}
              <clipPath id="ch01-rod-hood"><path d={HOOD_PLATE.clip} /></clipPath>
            </defs>

            {/* 底座 */}
            <g key="base">
              <path className="iso-halo" d={BASE_ART.halo} />
              {BASE_ART.feet.map((parts, i) => (
                <g key={i}>{parts.map((paths, k) => <Solid key={k} paths={paths} tone={k ? "mid" : "lo"} />)}</g>
              ))}
              <Solid paths={BASE_ART.slab} tone="mid" />
              <Line d={BASE_ART.groove} tone="lo" />
              <Line d={BASE_ART.screwRings} tone="lo" />
              <Dots points={BASE_ART.screws} size={0.5} tone="mid" />
              <Solid paths={BASE_ART.strip} tone="lo" crease="none" />
              <Line d={BASE_ART.stripMinor} tone="lo" />
              <Line d={BASE_ART.stripMajor} tone="mid" />
              <Dots points={BASE_ART.stripScrews} size={0.45} tone="mid" />
              <Solid paths={BASE_ART.label} tone="lo" crease="none" />
              <Line d={BASE_ART.labelLine} tone="faint" />
              <Line d={BASE_ART.labelRule} tone="lo" free />
              <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
            </g>

            {/* 模型機櫃 */}
            <g key="cabinet">
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="hi" inner={<Line d={CAB_ART.seams} tone="faint" />} />
              <Line d={CAB_ART.vents} tone="lo" />
              <Line d={CAB_ART.bay} tone="mid" />
              <Line d={CAB_ART.bayInner} tone="faint" />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <FaceText transform={CAB_ART.plateText} size={4.2} tone="lo">MODEL</FaceText>
              <Solid paths={CAB_ART.cap} tone="mid" />
              <Dots points={CAB_ART.capScrews} size={0.5} tone="mid" />
              <Solid paths={CAB_ART.dialStand} tone="lo" />
              <Solid paths={CAB_ART.dial} tone="hi" crease="lo" />
              <Line d={CAB_ART.dialBand} tone="faint" />
              <Line d={CAB_ART.dialKnurl} tone="faint" />
              <Line d={CAB_ART.dialBezel} tone="lo" />
              <Line d={CAB_ART.dialMinor} tone="lo" />
              <Line d={CAB_ART.dialMajor} tone="mid" />
              <path ref={needle} className="iso-line" data-tone="hi" strokeWidth={1.1} d={needleAt(state.current.needle)} />
              <Line d={CAB_ART.dialHub} tone="mid" />
              <Solid paths={CAB_ART.lampBase} tone="mid" />
              <Line d={CAB_ART.lampRing} tone="faint" />
              <Solid paths={CAB_ART.lamp} tone={pose.done ? "hi" : "lo"} />
            </g>

            {/* 壓印機與投卡機的後半（腳座、立柱），在滑台之前畫 */}
            {[...TOOLS.map((tool) => PRESS_ART[tool]), DISPENSER_ART].map((art, i) => (
              <g key={`back-${i}`}>
                <Solid paths={art.foot} tone="lo" />
                <Dots points={art.footScrews} size={0.45} tone="mid" />
                <Solid paths={art.column} tone="mid" inner={<Line d={art.columnSeam} tone="faint" />} />
              </g>
            ))}

            {/* 導軌 */}
            <g key="rail">
              <Solid paths={RAIL_ART.buffer} tone="lo" />
              <Solid paths={RAIL_ART.rail} tone="mid" />
              <Line d={RAIL_ART.ticksMinor} tone="lo" />
              <Line d={RAIL_ART.ticksMajor} tone="mid" />
              <Dots points={RAIL_ART.railScrews} size={0.45} tone="mid" />
              <Solid paths={RAIL_ART.stop} tone="mid" />
              <Dots points={RAIL_ART.stopScrews} size={0.45} tone="mid" />
            </g>

            {/* 滑台（Harness）與整疊訊息卡 */}
            <g ref={carriage} key="carriage" transform={translateAlong(P, [state.current.x, 0, 0])}>
              <Solid paths={CARRIAGE_ART.plate} tone="mid" lit={litCarriage} inner={<Line d={CARRIAGE_ART.seam} tone="faint" />} />
              <Dots points={CARRIAGE_ART.rivets} size={0.4} tone="lo" />
              <Solid paths={CARRIAGE_ART.knob} tone="mid" />
              <Solid paths={CARRIAGE_ART.tray} tone="lo" />
              <Line d={CARRIAGE_ART.trayLine} tone="faint" />
              {CARRIAGE_ART.backPosts.map((p, i) => (
                <g key={`bp${i}`}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>
              ))}
              {cards.map((card, i) => {
                const anim = live.get(i)!;
                return (
                  <g
                    key={i}
                    ref={(el) => { cardEls.current[i] = el; }}
                    transform={translateAlong(P, [0, 0, anim.dz])}
                    opacity={anim.op}
                  >
                    <Solid paths={card.paths} tone={toneOf(step.msgs[i].kind)} lit={i === newest} inner={<Line d={card.layers} tone="faint" />} />
                    {i === cards.length - 1 && <Dots points={card.holes} size={0.55} tone="lo" />}
                  </g>
                );
              })}
              {CARRIAGE_ART.frontPosts.map((p, i) => (
                <g key={`fp${i}`}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>
              ))}
            </g>

            {/* 讀卡罩：壓板、桿、罩體 */}
            <g key="hood">
              {HOOD_ART.gussets.map((g, i) => <Solid key={i} paths={g} tone="mid" />)}
              <g ref={hood} transform={translateAlong(P, [0, 0, state.current.hood])}>
                <Solid paths={HOOD_PLATE.pad} tone="hi" lit={litHood} />
                <Line d={HOOD_PLATE.padLine} tone="faint" />
              </g>
              <g clipPath="url(#ch01-rod-hood)">
                <g transform={translateAlong(P, [0, 0, state.current.hood])} ref={hoodRod}>
                  <Solid paths={HOOD_PLATE.rod} tone="mid" crease="none" />
                </g>
              </g>
              <Solid paths={HOOD_ART.head} tone="mid" inner={<Line d={HOOD_ART.headSeam} tone="faint" />} />
              <Solid paths={HOOD_ART.hood} tone="mid" />
              <Dots points={HOOD_ART.hoodScrews} size={0.45} tone="mid" />
            </g>

            {/* 壓印機上半：壓頭、桿、讀頭、懸臂、旋鈕 */}
            {TOOLS.map((tool) => {
              const art = PRESS_ART[tool];
              return (
                <g key={`press-${tool}`}>
                  <g ref={(el) => { pads.current[tool] = el; }} transform={translateAlong(P, [0, 0, state.current.pads[tool]])}>
                    <Solid paths={art.pad} tone="hi" lit={litPad === tool} />
                    <Line d={art.padRing} tone="faint" />
                  </g>
                  <g clipPath={`url(#ch01-rod-${tool})`}>
                    <g ref={(el) => { rods.current[tool] = el; }} transform={translateAlong(P, [0, 0, state.current.pads[tool]])}>
                      <Solid paths={art.rod} tone="mid" crease="none" />
                    </g>
                  </g>
                  <Solid paths={art.head} tone="mid" inner={<Line d={art.headSeam} tone="faint" />} />
                  <Solid paths={art.arm} tone="mid" />
                  <Dots points={art.armScrews} size={0.45} tone="mid" />
                  <Solid paths={art.knob} tone="mid" />
                  <Line d={art.knobKnurl} tone="lo" />
                </g>
              );
            })}

            {/* 投卡機上半 */}
            <g key="dispenser">
              <Solid paths={DISPENSER_ART.lip} tone="lo" />
              <Solid paths={DISPENSER_ART.magazine} tone="hi" inner={<Line d={DISPENSER_ART.magSeam} tone="faint" />} />
              <Line d={DISPENSER_ART.window} tone="mid" />
              <Line d={DISPENSER_ART.windowCards} tone="lo" />
              <Dots points={DISPENSER_ART.magScrews} size={0.45} tone="mid" />
              <Solid paths={DISPENSER_ART.arm} tone="mid" />
              <Dots points={DISPENSER_ART.armScrews} size={0.45} tone="mid" />
              <Solid paths={DISPENSER_ART.knob} tone="mid" />
              <Line d={DISPENSER_ART.knobKnurl} tone="lo" />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
