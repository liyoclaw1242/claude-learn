import { useEffect, useMemo, useRef } from "react";
import { translateAlong } from "../../../iso/iso-kit";
import { Dots, IsoFigure, Line, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import { LiveSolid, setSolid } from "../../../iso/react/LiveSolid";
import "../../../iso/iso.css";
import "./figure.css";
import { TOOLS, type Result, type Step, type ToolId } from "../steps";
import {
  BASE_ART, CAB_ART, CAT_ART, MCP_ART, TRAY_ART, cardArt, drawerArt, drawerBox, ghostOutline,
} from "./geometry";
import { CARD_Z, CAT_TOP, HEIGHT, MCP_DROP, OPEN, P, SLOTS, U, WIDTH } from "./view";

const LABEL =
  "一座工具櫃工作台。左邊的卡片目錄櫃裡，一個抽屜是一個工具，抽屜正面插著說明卡，卡的高度代表說明寫了多少；" +
  "壞描述的抽屜只插著一張幾乎空白的小卡。右後方是模型機櫃，前面的卡架放「回到 context 的東西」：" +
  "呼叫工具時對應的抽屜拉開，結果卡落進卡架，卡的厚度就是回傳的 token 量；錯誤結果帶紅框，點線框是讀全文時會有的大小。" +
  "接上 MCP 時，一座小抽屜模組落到目錄櫃頂，卡架裡多出一大疊工具定義。";

const ALL: ToolId[] = TOOLS.map((t) => t.id);
const TONE: Record<Result["kind"], "hi" | "mid" | "lo"> = { ok: "hi", big: "mid", error: "mid", defs: "lo" };

type CardAnim = { z: number; dz: number; op: number; wait: number };

/** 實際疊進卡架的結果（點線框不算），由下往上 */
function stackOf(results: Result[]) {
  let z = CARD_Z;
  const out = new Map<string, number>();
  for (const r of results) if (!r.ghost) { out.set(r.id, z); z += r.size * U; }
  return out;
}

export default function ToolsFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const prev = index > 0 ? steps[index - 1] : null;
  const stack = useMemo(() => stackOf(step.results), [step.results]);
  const open = useMemo(() => new Set(step.flights?.map((f) => f.to) ?? []), [step.flights]);
  const avail = useMemo(() => new Set(step.tools), [step.tools]);
  const fresh = useMemo(() => {
    const before = new Set(prev?.results.filter((r) => !r.ghost).map((r) => r.id) ?? []);
    return step.results.filter((r) => !r.ghost && !before.has(r.id)).map((r) => r.id);
  }, [step, prev]);
  const litCard = fresh.length && prev ? fresh[fresh.length - 1] : null;
  const real = step.results.filter((r) => !r.ghost);
  const used = real.reduce((a, r) => a + r.size, 0);

  const { anchor, say } = useReadout<HTMLDivElement>();
  const inView = useInView(anchor);
  const boxes = useRef<Partial<Record<ToolId, SVGGElement | null>>>({});
  const fronts = useRef<Partial<Record<ToolId, SVGGElement | null>>>({});
  const cardEls = useRef(new Map<string, SVGGElement | null>());
  const mcp = useRef<SVGGElement>(null);

  const state = useRef<{ open: Record<ToolId, number>; cards: Map<string, CardAnim>; mcp: number; mounted: boolean }>(null!);
  if (!state.current) {
    state.current = {
      open: Object.fromEntries(ALL.map((t) => [t, open.has(t) ? OPEN : 0])) as Record<ToolId, number>,
      cards: new Map(),
      mcp: step.mcp ? 0 : MCP_DROP,
      mounted: false,
    };
  }
  const s0 = state.current;
  // 新結果卡：等抽屜拉開、再依 flights 的延遲依序落下
  const delays = step.flights?.map((f) => f.delay) ?? [];
  let k = 0;
  for (const r of real) {
    if (s0.cards.has(r.id)) continue;
    const z = stack.get(r.id)!;
    const wait = s0.mounted ? 0.35 + (delays[k++] ?? 0) : 0;
    s0.cards.set(r.id, s0.mounted ? { z, dz: 18, op: 0, wait } : { z, dz: 0, op: 1, wait: 0 });
  }
  for (const id of [...s0.cards.keys()]) if (!stack.has(id)) s0.cards.delete(id);
  useEffect(() => { state.current.mounted = true; });

  const kick = useLoop((dt, calm) => {
    const s = state.current;
    let busy = false;
    for (const tool of ALL) {
      const target = open.has(tool) ? OPEN : 0;
      const was = s.open[tool];
      s.open[tool] = follow(s.open[tool], target, dt, 0.2, calm);
      busy ||= s.open[tool] !== target;
      if (was !== s.open[tool] || !boxes.current[tool]?.dataset.ready) {
        setSolid(boxes.current[tool] ?? null, drawerBox(tool, s.open[tool]));
        boxes.current[tool]?.setAttribute("data-ready", "");
        boxes.current[tool]?.setAttribute("visibility", s.open[tool] > 0.3 ? "visible" : "hidden");
      }
      fronts.current[tool]?.setAttribute("transform", translateAlong(P, [0, s.open[tool], 0]));
    }
    s.cards.forEach((c, id) => {
      const z = stack.get(id)!;
      if (c.wait > 0 && !calm) { c.wait = Math.max(0, c.wait - dt); busy = true; }
      else {
        c.z = follow(c.z, z, dt, 0.25, calm);
        c.dz = follow(c.dz, 0, dt, 0.22, calm);
        c.op = follow(c.op, 1, dt, 0.15, calm);
      }
      busy ||= c.z !== z || c.dz !== 0 || c.op !== 1;
      const el = cardEls.current.get(id);
      el?.setAttribute("transform", translateAlong(P, [0, 0, c.z + c.dz]));
      el?.setAttribute("opacity", String(Math.round(c.op * 100) / 100));
    });
    const mcpTarget = step.mcp ? 0 : MCP_DROP;
    s.mcp = follow(s.mcp, mcpTarget, dt, 0.28, calm);
    busy ||= s.mcp !== mcpTarget;
    mcp.current?.setAttribute("transform", translateAlong(P, [0, 0, CAT_TOP + 2 + s.mcp]));
    mcp.current?.setAttribute("visibility", step.mcp || s.mcp < MCP_DROP - 0.5 ? "visible" : "hidden");
    say(readout);
    return busy;
  }, inView);
  useEffect(() => { kick(); }, [index, kick]);

  const readout = step.mcp
    ? `工具定義 ${used} · 每次請求都帶著`
    : step.focus?.length
      ? `${[...open].join(" · ")} → 回到 context ${used}`
      : `${step.tools.length} 個工具 · 只看得到說明`;

  // 抽屜依拉開程度排序：拉得越開越晚畫
  const drawerOrder = [...ALL].sort((a, b) => (open.has(a) ? 1 : 0) - (open.has(b) ? 1 : 0) || SLOTS[b].row - SLOTS[a].row);
  let ghostZ = CARD_Z;

  return (
    <div className="iso ch04-fig">
      <Plate
        fig="Fig 4"
        title="Tools · 工具櫃"
        hint="← → 切換步驟"
        readout={readout}
        keys={[
          { mark: "lit", label: "這一步回到 context 的結果" },
          { mark: "dotted", label: "改用讀全文時會有的大小" },
          { mark: "red", label: "is_error：錯誤也是回饋" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            {/* 底座 */}
            <g key="base">
              <path className="iso-halo" d={BASE_ART.halo} />
              {BASE_ART.feet.map((parts, i) => <g key={i}>{parts.map((p, j) => <Solid key={j} paths={p} tone={j ? "mid" : "lo"} />)}</g>)}
              <Solid paths={BASE_ART.slab} tone="mid" />
              <Line d={BASE_ART.groove} tone="lo" />
              <Line d={BASE_ART.screwRings} tone="lo" />
              <Dots points={BASE_ART.screws} size={0.5} tone="mid" />
              <Solid paths={BASE_ART.label} tone="lo" crease="none" />
              <Line d={BASE_ART.labelLine} tone="faint" />
              <Line d={BASE_ART.labelRule} tone="lo" free />
              <Dots points={BASE_ART.labelScrews} size={0.45} tone="mid" />
            </g>

            {/* 模型機櫃（在最後方） */}
            <g key="cabinet">
              <path className="iso-halo" d={CAB_ART.halo} />
              <Solid paths={CAB_ART.plinth} tone="lo" />
              <Solid paths={CAB_ART.body} tone="hi" inner={<Line d={CAB_ART.seams} tone="faint" />} />
              <Line d={CAB_ART.slot} tone="mid" />
              <Line d={CAB_ART.vents} tone="lo" />
              <Dots points={CAB_ART.rivets} size={0.42} tone="mid" />
              <Solid paths={CAB_ART.cap} tone="mid" />
              <Dots points={CAB_ART.capScrews} size={0.5} tone="mid" />
            </g>

            {/* 目錄櫃與抽屜 */}
            <g key="catalog">
              <path className="iso-halo" d={CAT_ART.halo} />
              <Solid paths={CAT_ART.plinth} tone="lo" />
              <Solid paths={CAT_ART.body} tone="mid" />
              <Line d={CAT_ART.bays} tone="lo" />
              <Line d={CAT_ART.mullion} tone="faint" />
              <Solid paths={CAT_ART.blank} tone="lo" />
              <Dots points={CAT_ART.blankScrews} size={0.45} tone="mid" />
              <Solid paths={CAT_ART.top} tone="mid" />
              <Dots points={CAT_ART.topScrews} size={0.45} tone="mid" />
              {drawerOrder.map((tool) => {
                const art = drawerArt(tool);
                const on = avail.has(tool);
                return (
                  <g key={tool} className={on ? undefined : "ch04-dim"}>
                    <LiveSolid ref={(el) => { boxes.current[tool] = el; }} paths={drawerBox(tool, s0.open[tool])} tone="lo" />
                    <g ref={(el) => { fronts.current[tool] = el; }} transform={translateAlong(P, [0, s0.open[tool], 0])}>
                      <Solid paths={art.front} tone="mid" />
                      <Line d={art.holder} tone="lo" />
                      <Solid paths={art.card} tone={tool === "script_tool" ? "lo" : "hi"} crease="none" />
                      <Line d={art.cardRules} tone="lo" free />
                      <Solid paths={art.pull} tone="mid" />
                      <Dots points={art.rivets} size={0.4} tone="mid" />
                    </g>
                  </g>
                );
              })}
            </g>

            {/* MCP 擴充模組 */}
            <g key="mcp" ref={mcp} transform={translateAlong(P, [0, 0, CAT_TOP + 2 + s0.mcp])} visibility={step.mcp ? "visible" : "hidden"}>
              <Solid paths={MCP_ART.plug} tone="lo" />
              <Solid paths={MCP_ART.body} tone="mid" lit={Boolean(step.mcp)} inner={<Line d={MCP_ART.seam} tone="faint" />} />
              <Line d={MCP_ART.cells} tone="lo" />
              <Dots points={MCP_ART.knobs} size={0.6} tone="mid" />
            </g>

            {/* context 卡架：後立柱 → 結果卡 → 點線框 → 前立柱 */}
            <g key="tray">
              <path className="iso-halo" d={TRAY_ART.halo} />
              <Solid paths={TRAY_ART.plinth} tone="mid" />
              <Dots points={TRAY_ART.plinthScrews} size={0.45} tone="mid" />
              <Solid paths={TRAY_ART.seat} tone="lo" />
              {TRAY_ART.backPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>)}
              {real.map((r) => {
                const c = s0.cards.get(r.id)!;
                const art = cardArt(r.size * U);
                return (
                  <g key={r.id} ref={(el) => { cardEls.current.set(r.id, el); }} transform={translateAlong(P, [0, 0, c.z + c.dz])} opacity={c.op}>
                    <Solid paths={art.paths} tone={TONE[r.kind]} lit={r.id === litCard} inner={<Line d={art.layers} tone="faint" />} />
                    {r.kind === "error" && <Line d={art.paths.outline} tone="red" />}
                  </g>
                );
              })}
              {step.results.filter((r) => r.ghost).map((r) => {
                const d = ghostOutline(ghostZ, r.size * U);
                ghostZ = CARD_Z;
                return <Line key={r.id} d={d} tone="mid" dotted />;
              })}
              {TRAY_ART.frontPosts.map((p, i) => <g key={i}><Solid paths={p.collar} tone="mid" /><Solid paths={p.post} tone="mid" crease="none" /><Solid paths={p.cap} tone="mid" /></g>)}
            </g>
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
