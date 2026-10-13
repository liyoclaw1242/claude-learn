import { useEffect, useMemo, useRef } from "react";
import { insetPlan, sideSeam, slabOf, type Plan, type SolidPaths } from "../../../iso/iso-kit";
import { IsoFigure, Plate, Solid } from "../../../iso/react/draw";
import { follow, useInView, useLoop, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import { cellCenter, drawOrder } from "../../shared/board";
import { TILES, W, collapsedCount } from "../model";
import type { Step } from "../steps";
import { BOARD, CHIP, HEIGHT, P, PLATE, RACK, RACK_CELL, RACK_COLS, RACK_H, WIDTH } from "./view";
import { tileArt, type TilePart } from "./tileArt";

const LABEL =
  "一塊 12 乘 9 的拼塊棋盤。還沒確定的格子上疊著薄片，一片代表一種還可能的拼塊；確定的格子換成真正的拼塊：" +
  "空地、凸起的道路、藍色的河道與橋。右側的拼塊架陳列全部 19 種拼塊。";

const S = BOARD.cell;
const ORDER = drawOrder(BOARD, P);
const STACK_PLANS: Plan[] = Array.from({ length: BOARD.cols * BOARD.rows }, (_, i) => {
  const [cx, cy] = cellCenter(BOARD, i % W, Math.floor(i / W));
  return { x: cx - S * 0.3, y: cy - S * 0.3, w: S * 0.6, d: S * 0.6, r: 0 };
});
const stackPaths = (i: number, n: number): [SolidPaths, string] => {
  const h = Math.max(n * CHIP, 0.05);
  const seams = Array.from({ length: Math.max(0, Math.round(n) - 1) }, (_, k) => sideSeam(STACK_PLANS[i], (k + 1) * CHIP, P, 1)).join("");
  return [slabOf(STACK_PLANS[i], 0, h, P, 1), seams];
};
const TILE_CACHE = new Map<string, TilePart[]>();
const tileAt = (i: number, tile: number) => {
  const key = `${i}:${tile}`;
  let art = TILE_CACHE.get(key);
  if (!art) {
    const [cx, cy] = cellCenter(BOARD, i % W, Math.floor(i / W));
    art = tileArt(cx, cy, S, TILES[tile].sockets, 0, P);
    TILE_CACHE.set(key, art);
  }
  return art;
};
const floorOf = (i: number, h: number) => {
  const [cx, cy] = cellCenter(BOARD, i % W, Math.floor(i / W));
  return slabOf({ x: cx - S / 2 + 0.6, y: cy - S / 2 + 0.6, w: S - 1.2, d: S - 1.2, r: 0 }, 0, h, P, 1);
};
const CELL_FLOOR = Array.from({ length: BOARD.cols * BOARD.rows }, (_, i) => floorOf(i, 0.6));
const CELL_BAD = Array.from({ length: BOARD.cols * BOARD.rows }, (_, i) => floorOf(i, 4));

/* 拼塊架 */
const RACK_ART = {
  tray: slabOf(RACK, 0, RACK_H, P, 4, 0.6),
  slots: TILES.map((_, k) => {
    const c = k % RACK_COLS;
    const r = Math.floor(k / RACK_COLS);
    const cx = RACK.x + 2 + (c + 0.5) * RACK_CELL;
    const cy = RACK.y + 2 + (r + 0.5) * RACK_CELL;
    return tileArt(cx, cy, RACK_CELL - 1.6, TILES[k].sockets, RACK_H, P);
  }),
  well: slabOf(insetPlan(RACK, 1.4), RACK_H - 0.3, 0.3, P, 4),
};

const PARTS = 7;

export function readoutOf(step: Step) {
  return step.tag;
}

function Part({ part, lit, i }: { part: TilePart; lit: boolean; i?: number }) {
  return (
    <Solid
      key={i}
      paths={part.paths}
      tone={part.kind === "road" ? "hi" : part.kind === "river" ? "mid" : "lo"}
      className={part.kind === "river" ? "mg-water" : undefined}
      crease="none"
      lit={lit && part.kind !== "river"}
    />
  );
}

export default function WfcFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);
  const snap = step.snap;

  const target = useMemo(() => snap.domains.map((d) => (!step.stacks || d.length <= 1 ? 0 : d.length)), [snap, step.stacks]);
  const rippleAt = useMemo(() => {
    const m = new Map<number, number>();
    snap.ripple.forEach((c, k) => { if (!m.has(c)) m.set(c, k); });
    return m;
  }, [snap]);
  const rippleLit = step.focus === "ripple" ? rippleAt : null;

  const cur = useRef<number[]>(null!);
  if (!cur.current) cur.current = [...target];
  const els = useRef<(SVGGElement | null)[]>([]);
  const since = useRef(0);
  const kick = useLoop((dt, calm) => {
    since.current += dt;
    let busy = false;
    cur.current.forEach((n, i) => {
      if (n === target[i]) return;
      busy = true;
      const delay = (rippleAt.get(i) ?? 0) * 0.05;
      if (!calm && since.current < delay) return;
      cur.current[i] = follow(n, target[i], dt, 0.18, calm);
      const g = els.current[i];
      if (!g) return;
      const [p, seams] = stackPaths(i, cur.current[i]);
      const d = [p.fill, p.shades[0] ?? "", p.shades[1] ?? "", p.shades[2] ?? "", p.shades[3] ?? "", p.top, p.outline];
      for (let k = 0; k < PARTS; k++) g.children[k]?.setAttribute("d", d[k]);
      g.children[PARTS]?.setAttribute("d", seams);
      g.style.display = cur.current[i] < 0.05 ? "none" : "";
    });
    return busy;
  }, visible);
  useEffect(() => {
    since.current = 0;
    kick();
    say(readoutOf(step));
  }, [index, kick, say, step]);

  const litCell = step.focus === "collapse" || step.focus === "pick" ? snap.collapsed : undefined;

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.83 } as React.CSSProperties}>
      <Plate
        fig="Fig 6"
        title="波函數塌縮 · 拼塊棋盤"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "薄片疊 = 剩下的候選，越高越不確定" },
          { mark: "lit", label: "這一步塌縮／被傳播影響的格子" },
          { mark: "blue", label: "河道" },
          { mark: "red", label: "矛盾：沒有候選" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />

            {/* 拼塊架 */}
            <g key="rack">
              <Solid paths={RACK_ART.tray} tone="mid" />
              {RACK_ART.slots.map((parts, k) => (
                <g key={k}>{parts.map((part, j) => <Part key={j} part={part} lit={!!step.litTiles?.includes(k)} />)}</g>
              ))}
            </g>

            {ORDER.map((i) => {
              const dom = snap.domains[i];
              const settled = dom.length === 1;
              const bad = dom.length === 0;
              const [p, seams] = stackPaths(i, cur.current[i]);
              return (
                <g key={i}>
                  {!settled && <Solid paths={bad ? CELL_BAD[i] : CELL_FLOOR[i]} tone={bad ? "hi" : "faint"} crease="none" className={bad ? "mg-red" : undefined} />}
                  <g
                    ref={(el) => { els.current[i] = el; }}
                    className="iso-solid"
                    data-lit={rippleLit?.has(i) ? "" : undefined}
                    style={cur.current[i] < 0.05 ? { display: "none" } : undefined}
                  >
                    <path className="iso-fill" d={p.fill} />
                    {[0, 1, 2, 3].map((s) => <path key={s} className="iso-shade" data-shade={s} d={p.shades[s] ?? ""} />)}
                    <path className="iso-top" d={p.top} />
                    <path className="iso-line iso-edge" data-tone="mid" d={p.outline} />
                    <path className="iso-line" data-tone="faint" d={seams} />
                  </g>
                  {settled && step.stacks && tileAt(i, dom[0]).map((part, j) => <Part key={j} part={part} lit={i === litCell} />)}
                </g>
              );
            })}
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}

export { collapsedCount };
