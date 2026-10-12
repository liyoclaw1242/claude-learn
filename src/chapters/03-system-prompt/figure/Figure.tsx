import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "./figure.css";
import { LAYERS, type Layer, type LayerKind, type Section, type Step } from "../steps";
import {
  BASE_ART, CAB_ART, CLAMP_ART, JIG_ART, PRESS_ART, SHELF_ART, cardArt, dividerArt, sheetArt,
} from "./geometry";
import {
  BED_H, CLAMP_REST, DIVIDER_H, GAP, HEIGHT, K, P, PLINTH_H, RAM_REST, STOP_H, STOP_OUT, TRAY_Z, WIDTH,
} from "./view";

const LABEL =
  "一座請求組裝台。中間的夾具把一次 API 請求由下往上疊起來：三片索引分隔板把它分成 tools、system、messages 三段。" +
  "左邊三層公文架是目錄層級（個人、整部劇、第 3 集），被載入的 CLAUDE.md 會從架上抽出、變成夾具裡的一張卡。" +
  "導桿上的夾板是 prompt caching：前綴不變時夾緊、燈亮；底層一改，夾板鬆開，上面全部要重算。" +
  "右邊是模型機櫃，以及 Edit 壓印機：最後一步 hook 的擋塊滑進壓頭下方，擋住對第 1 季頁面的修改。";

const SECTIONS: Section[] = ["tools", "system", "messages"];
const TONE: Record<LayerKind, "lo" | "mid" | "hi"> = {
  tools: "lo", system: "lo", env: "lo", claudemd: "hi", import: "mid", user: "hi", tool_result: "mid",
};

/** 公文架上的文件：哪一層、在架上的偏移、對應請求裡哪張卡 */
const SHEETS: { layer: string; tray: number; offset: number }[] = [
  { layer: "mdUser", tray: 2, offset: 0 },
  { layer: "mdProj", tray: 1, offset: 0 },
  { layer: "imp", tray: 1, offset: 5 },
  { layer: "mdEp", tray: 0, offset: 0 },
  { layer: "r1", tray: 0, offset: 5 },
];

/** 依可見的層算出每張卡與三片分隔板的高度 */
function layout(visible: Set<string>) {
  let z = PLINTH_H;
  const cards = new Map<string, number>();
  const dividers: number[] = [];
  for (const section of SECTIONS) {
    dividers.push(z);
    z += DIVIDER_H + 0.3;
    for (const layer of LAYERS) {
      if (layer.section !== section || !visible.has(layer.id)) continue;
      cards.set(layer.id, z);
      z += layer.h * K;
    }
    z += GAP;
  }
  return { cards, dividers, top: z };
}

type Anim = { z: number; dz: number; op: number };

export default function SystemPromptFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const visible = useMemo(() => new Set(step.layers), [step.layers]);
  const hot = useMemo(() => new Set(step.hot ?? []), [step.hot]);
  const plan = useMemo(() => layout(visible), [visible]);
  const litId = step.hot?.length ? step.hot[step.hot.length - 1] : null;
  const gate = Boolean(step.gate);
  const clampDown = step.cache === "hit";

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const dividerEls = useRef<(SVGGElement | null)[]>([]);
  const sheetEls = useRef(new Map<string, SVGGElement | null>());
  const clamp = useRef<SVGGElement>(null);
  const ram = useRef<SVGGElement>(null);
  const rod = useRef<SVGGElement>(null);
  const stop = useRef<SVGGElement>(null);

  const state = useRef<{
    cards: Map<string, Anim>; dividers: number[]; sheets: Map<string, number>;
    clamp: number; ram: number; stop: number; mounted: boolean;
  }>(null!);
  if (!state.current) {
    state.current = {
      cards: new Map(), dividers: [...plan.dividers], sheets: new Map(),
      clamp: clampDown ? plan.top : CLAMP_REST,
      ram: gate ? BED_H + STOP_H : RAM_REST,
      stop: gate ? 0 : STOP_OUT,
      mounted: false,
    };
  }
  const s0 = state.current;
  for (const id of step.layers) {
    if (!s0.cards.has(id)) {
      const z = plan.cards.get(id)!;
      s0.cards.set(id, s0.mounted ? { z, dz: 20, op: 0 } : { z, dz: 0, op: 1 });
    }
  }
  for (const id of [...s0.cards.keys()]) if (!visible.has(id)) s0.cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    s.cards.forEach((c, id) => {
      const z = plan.cards.get(id)!;
      c.z = follow(c.z, z, dt, 0.25, calm);
      c.dz = follow(c.dz, 0, dt, 0.22, calm);
      c.op = follow(c.op, 1, dt, 0.16, calm);
      busy ||= c.z !== z || c.dz !== 0 || c.op !== 1;
      const el = cardEls.current.get(id);
      el?.setAttribute("transform", translateAlong(P, [0, 0, c.z + c.dz]));
      el?.setAttribute("opacity", String(Math.round(c.op * 100) / 100));
    });
    plan.dividers.forEach((z, i) => {
      s.dividers[i] = follow(s.dividers[i], z, dt, 0.25, calm);
      busy ||= s.dividers[i] !== z;
      dividerEls.current[i]?.setAttribute("transform", translateAlong(P, [0, 0, s.dividers[i]]));
    });
    // 這一步被載入的文件從架上抬起
    for (const sheet of SHEETS) {
      const target = hot.has(sheet.layer) ? 5 : 0;
      const now = follow(s.sheets.get(sheet.layer) ?? target, target, dt, 0.2, calm);
      s.sheets.set(sheet.layer, now);
      busy ||= now !== target;
      sheetEls.current.get(sheet.layer)?.setAttribute("transform", translateAlong(P, [sheet.offset, -sheet.offset, TRAY_Z[sheet.tray] + 1.5 + now]));
    }
    const clampTarget = clampDown ? plan.top : CLAMP_REST;
    s.clamp = follow(s.clamp, clampTarget, dt, 0.25, calm);
    busy ||= s.clamp !== clampTarget;
    clamp.current?.setAttribute("transform", translateAlong(P, [0, 0, s.clamp]));

    // hook：擋塊先滑進壓頭下方，壓頭才落下、停在擋塊上
    const stopTarget = gate ? 0 : STOP_OUT;
    s.stop = follow(s.stop, stopTarget, dt, 0.22, calm);
    const ramTarget = gate && Math.abs(s.stop) < 0.5 ? BED_H + STOP_H : RAM_REST;
    s.ram = follow(s.ram, ramTarget, dt, 0.2, calm);
    busy ||= s.stop !== stopTarget || s.ram !== ramTarget;
    stop.current?.setAttribute("transform", translateAlong(P, [s.stop, 0, 0]));
    ram.current?.setAttribute("transform", translateAlong(P, [0, 0, s.ram]));
    rod.current?.setAttribute("transform", translateAlong(P, [0, 0, s.ram]));

    say(readout);
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  const count = (section: Section) => LAYERS.filter((l) => l.section === section && visible.has(l.id)).length;
  const readout = gate
    ? "hook 擋下 Edit season1/"
    : `${step.layers.length} 層 · tools ${count("tools")} · system ${count("system")} · messages ${count("messages")}` +
      (step.cache === "hit" ? " · 快取命中" : step.cache === "miss" ? " · 快取失效" : "");

  const cardOf = (layer: Layer) => {
    const c = s0.cards.get(layer.id)!;
    const art = cardArt(0, layer.h * K);
    return (
      <g
        key={layer.id}
        ref={(el) => { cardEls.current.set(layer.id, el); }}
        transform={translateAlong(P, [0, 0, c.z + c.dz])}
        opacity={c.op}
      >
        <Solid paths={art.paths} tone={TONE[layer.kind]} lit={layer.id === litId} inner={<Line d={art.layers} tone="faint" />} />
        {step.cache === "miss" && <Line d={art.paths.outline} tone="red" />}
      </g>
    );
  };

  return (
    <div className="iso ch03-fig">
      <Plate
        fig="Fig 3"
        title="System prompt · 組裝台"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步注入的內容" },
          { mark: "raised", label: "三片分隔板：tools / system / messages" },
          { mark: "red", label: "快取失效或被 hook 擋下" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <defs>
              <clipPath id="ch03-rod"><path d={PRESS_ART.rodClip} /></clipPath>
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

            {/* 公文架：左側板 → 背板 → 由下往上的托盤（托盤、文件、前緣）→ 右側板 → 頂板 */}
            <g key="shelf">
              <path className="iso-halo" d={SHELF_ART.halo} />
              <Solid paths={SHELF_ART.foot} tone="lo" />
              <Solid paths={SHELF_ART.left} tone="mid" />
              <Solid paths={SHELF_ART.back} tone="lo" />
              {SHELF_ART.trays.map((tray, t) => (
                <g key={t}>
                  <Solid paths={tray.floor} tone="lo" />
                  {SHEETS.filter((sh) => sh.tray === t).map((sh) => {
                    const art = sheetArt(0);
                    const lift = s0.sheets.get(sh.layer) ?? 0;
                    return (
                      <g
                        key={sh.layer}
                        ref={(el) => { sheetEls.current.set(sh.layer, el); }}
                        transform={translateAlong(P, [sh.offset, -sh.offset, TRAY_Z[t] + 1.5 + lift])}
                      >
                        <Solid paths={art.paths} tone={visible.has(sh.layer) ? "hi" : "lo"} crease="none" />
                        <Line d={art.rule} tone={visible.has(sh.layer) ? "mid" : "faint"} free />
                      </g>
                    );
                  })}
                  <Solid paths={tray.lip} tone="mid" />
                  <Line d={tray.holder} tone="lo" />
                  <Dots points={tray.rivets} size={0.4} tone="mid" />
                </g>
              ))}
              <Solid paths={SHELF_ART.right} tone="mid" />
              <Dots points={SHELF_ART.sideScrews} size={0.45} tone="mid" />
              <Solid paths={SHELF_ART.top} tone="mid" />
              <Dots points={SHELF_ART.topScrews} size={0.45} tone="mid" />
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
            </g>

            {/* 壓印機後半 */}
            <g key="press-back">
              <Solid paths={PRESS_ART.foot} tone="lo" />
              <Dots points={PRESS_ART.footScrews} size={0.45} tone="mid" />
              <Solid paths={PRESS_ART.column} tone="mid" inner={<Line d={PRESS_ART.columnSeam} tone="faint" />} />
            </g>

            {/* 組裝夾具：座、後方導桿 → 分隔板與卡 → 夾板 */}
            <g key="jig">
              <path className="iso-halo" d={JIG_ART.halo} />
              <Solid paths={JIG_ART.plinth} tone="mid" inner={<Line d={JIG_ART.plinthSeam} tone="faint" />} />
              <Dots points={JIG_ART.plinthScrews} size={0.45} tone="mid" />
              <Line d={JIG_ART.seat} tone="faint" />
              {JIG_ART.rods.map((r, i) => (
                <g key={i}><Solid paths={r.collar} tone="mid" /><Solid paths={r.rod} tone="mid" crease="none" /><Solid paths={r.cap} tone="mid" /></g>
              ))}
              {SECTIONS.map((section, i) => {
                const art = dividerArt(i as 0 | 1 | 2);
                return (
                  <g key={section} ref={(el) => { dividerEls.current[i] = el; }} transform={translateAlong(P, [0, 0, s0.dividers[i]])}>
                    <Solid paths={art.tab} tone="hi" />
                    <Solid paths={art.plate} tone="mid" crease="none" />
                  </g>
                );
              })}
              {LAYERS.filter((l) => visible.has(l.id)).map(cardOf)}
              <g ref={clamp} transform={translateAlong(P, [0, 0, s0.clamp])}>
                {CLAMP_ART.bushings.map((b, i) => <Solid key={i} paths={b} tone="mid" />)}
                <Solid paths={CLAMP_ART.bar} tone="mid" />
                <Solid paths={CLAMP_ART.plate} tone="mid" />
                <Line d={CLAMP_ART.plateLine} tone="faint" />
                <Solid paths={CLAMP_ART.lampBase} tone="mid" />
                <Solid paths={CLAMP_ART.lamp} tone={clampDown ? "hi" : "lo"} lit={clampDown} />
              </g>
            </g>

            {/* 壓印機前半：床台、頁面、擋塊（hook）、壓頭 */}
            <g key="press">
              <Solid paths={PRESS_ART.bed} tone="mid" />
              <Dots points={PRESS_ART.bedScrews} size={0.45} tone="mid" />
              <Solid paths={PRESS_ART.page} tone="hi" crease="none" />
              <Line d={PRESS_ART.pageRule} tone="lo" free />
              <Solid paths={PRESS_ART.guide} tone="lo" />
              <g ref={stop} transform={translateAlong(P, [s0.stop, 0, 0])}>
                <Solid paths={PRESS_ART.stop} tone="mid" lit={gate} inner={<Line d={PRESS_ART.stopLine} tone="faint" />} />
                {gate && <Line d={PRESS_ART.stop.outline} tone="red" />}
              </g>
              <g ref={ram} transform={translateAlong(P, [0, 0, s0.ram])}>
                <Solid paths={PRESS_ART.ram} tone="hi" />
                <Line d={PRESS_ART.ramRing} tone="faint" />
              </g>
              <g clipPath="url(#ch03-rod)">
                <g ref={rod} transform={translateAlong(P, [0, 0, s0.ram])}>
                  <Solid paths={PRESS_ART.rod} tone="mid" crease="none" />
                </g>
              </g>
              <Solid paths={PRESS_ART.head} tone="mid" inner={<Line d={PRESS_ART.headSeam} tone="faint" />} />
              <Solid paths={PRESS_ART.arm} tone="mid" />
              <Dots points={PRESS_ART.armScrews} size={0.45} tone="mid" />
              <Solid paths={PRESS_ART.knob} tone="mid" />
              <Line d={PRESS_ART.knobKnurl} tone="lo" />
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}

