import { useEffect, useMemo } from "react";
import { depthOf, type Plan } from "../../../iso/iso-kit";
import { IsoFigure, Plate } from "../../../iso/react/draw";
import { useInView, useReadout } from "../../../iso/react/live";
import "../../../iso/iso.css";
import "../../shared/mapgen.css";
import BaseSlab from "../../shared/BaseSlab";
import ColumnField from "../../shared/ColumnField";
import { boardPlans, drawOrder } from "../../shared/board";
import { HALL, ROOM, WALL, cuts } from "../model";
import type { Step } from "../steps";
import { BOARD, FENCE_H, HEIGHT, P, PLATE, WIDTH } from "./view";

const LABEL =
  "一塊 40 乘 28 的地牢棋盤。每切一刀，刀口就豎起一道隔板，越早切的隔板越高；" +
  "葉子裡升起的平台是房間，較矮的通道是走廊。最後隔板撤掉、緊鄰地板的岩石砌成牆。";

const PLANS = boardPlans(BOARD);
const ORDER = drawOrder(BOARD, P);
const C = BOARD.cell;
const T = 1.3;

/* 隔板：沿刀口、長度等於被切的那一塊 */
const FENCE_PLANS: Plan[] = cuts.map((n) =>
  n.split!.dir === "v"
    ? { x: BOARD.x0 + n.split!.at * C - T / 2, y: BOARD.y0 + n.y * C + 0.3, w: T, d: n.h * C - 0.6, r: 0 }
    : { x: BOARD.x0 + n.x * C + 0.3, y: BOARD.y0 + n.split!.at * C - T / 2, w: n.w * C - 0.6, d: T, r: 0 });
const FENCE_ORDER = cuts.map((_, i) => i).sort((a, b) => {
  const c = (p: Plan) => depthOf([p.x + p.w / 2, p.y + p.d / 2, 0], P);
  return c(FENCE_PLANS[a]) - c(FENCE_PLANS[b]);
});

const HEIGHT_OF = [0.6, 3.4, 2.2, 5.5];
const TONE_OF = ["lo", "hi", "mid", "mid"] as const;

export function readoutOf(step: Step) {
  const rooms = step.tiles.filter((t) => t === ROOM).length;
  const halls = step.tiles.filter((t) => t === HALL).length;
  return rooms ? `${step.tag} · 房 ${rooms} 格 · 廊 ${halls} 格` : step.tag;
}

export default function BspFigure({ steps, index }: { steps: Step[]; index: number }) {
  const step = steps[index];
  const { anchor, say } = useReadout<HTMLDivElement>();
  const visible = useInView(anchor);

  const heights = useMemo(() => step.tiles.map((t) => HEIGHT_OF[t]), [step]);
  const tones = useMemo(() => step.tiles.map((t) => TONE_OF[t]), [step]);
  const lit = useMemo(() => step.tiles.map((_, i) => !!step.lit?.has(i)), [step]);
  const cls = useMemo(() => step.tiles.map((t) => (t === HALL ? "mg-green" : t === 0 ? "mg-dim" : undefined)), [step]);
  const delays = useMemo(() => step.tiles.map((_, i) => ((i % BOARD.cols) + Math.floor(i / BOARD.cols)) * 0.01), [step]);

  const fenceH = useMemo(() => cuts.map((n) => (step.fences && n.depth < step.cutLevel ? FENCE_H[n.depth] : 0)), [step]);
  const fenceLit = useMemo(() => cuts.map((n) => step.litDepth === n.depth && n.depth < step.cutLevel && step.fences), [step]);
  const fenceTone = useMemo(() => cuts.map(() => "hi" as const), []);

  useEffect(() => { say(readoutOf(step)); }, [say, step]);

  return (
    <div className="iso mg-fig" style={{ "--ar": 1.83 } as React.CSSProperties}>
      <Plate
        fig="Fig 4"
        title="BSP · 地牢切割台"
        hint="← → 切換步驟"
        readout={readoutOf(step)}
        keys={[
          { mark: "raised", label: "隔板 = 刀口，越高越早切" },
          { mark: "lit", label: "這一步新增的部分" },
          { mark: "green", label: "走廊" },
        ]}
      >
        <div ref={anchor}>
          <IsoFigure width={WIDTH} height={HEIGHT} label={LABEL}>
            <BaseSlab plan={PLATE} P={P} />
            <ColumnField P={P} plans={PLANS} order={ORDER} heights={heights} tones={tones} lit={lit} cls={cls} delays={delays} stepKey={index} active={visible} />
            <ColumnField P={P} plans={FENCE_PLANS} order={FENCE_ORDER} heights={fenceH} tones={fenceTone} lit={fenceLit} hideBelow={0.05} seconds={0.35} stepKey={index} active={visible} />
          </IsoFigure>
        </div>
      </Plate>
    </div>
  );
}
