import { slabOf, type Plan, type Projection, type SolidPaths } from "../../../iso/iso-kit";

export type TilePart = { paths: SolidPaths; kind: "base" | "river" | "road" };

/**
 * 一塊拼塊：底板 + 河道（貼在底板上的藍色淺槽）+ 道路（凸起的路堤）。
 * 由遠到近排列（azimuth 介於 0–90°：上、左兩臂較遠，右、下兩臂較近）。
 */
export function tileArt(cx: number, cy: number, s: number, sock: readonly number[], z0: number, P: Projection): TilePart[] {
  const half = s / 2;
  const inset = s * 0.04;
  const top = z0 + s * 0.11;
  const parts: TilePart[] = [{ kind: "base", paths: slabOf({ x: cx - half + inset, y: cy - half + inset, w: s - inset * 2, d: s - inset * 2, r: 0 }, z0, top - z0, P, 1) }];
  const arm = (d: number, width: number): Plan => {
    const w2 = width / 2;
    const edge = half - inset;
    if (d === 0) return { x: cx - w2, y: cy - edge, w: width, d: edge + w2, r: 0 };
    if (d === 1) return { x: cx - w2, y: cy - w2, w: edge + w2, d: width, r: 0 };
    if (d === 2) return { x: cx - w2, y: cy - w2, w: width, d: edge + w2, r: 0 };
    return { x: cx - edge, y: cy - w2, w: edge + w2, d: width, r: 0 };
  };
  const order = [0, 3, 1, 2];
  for (const d of order) if (sock[d] === 2) parts.push({ kind: "river", paths: slabOf(arm(d, s * 0.38), top, s * 0.02, P, 1) });
  const roadZ = top + (sock.includes(2) ? s * 0.02 : 0);
  for (const d of order) if (sock[d] === 1) parts.push({ kind: "road", paths: slabOf(arm(d, s * 0.2), roadZ, s * 0.16, P, 1) });
  return parts;
}
