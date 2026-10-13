import { mulberry32 } from "../lib/rng";
import { runWfc, type Snapshot, type Tile } from "../lib/wfc";

export const W = 12;
export const H = 9;

/** 接口：0 = 空地、1 = 道路、2 = 河道（順序：上、右、下、左） */
const t = (name: string, glyph: string, sockets: [number, number, number, number], weight: number): Tile & { glyph: string } =>
  ({ name, glyph, sockets, weight });

export const TILES = [
  t("空地", "·", [0, 0, 0, 0], 5),
  t("路 直", "│", [1, 0, 1, 0], 1.4),
  t("路 橫", "─", [0, 1, 0, 1], 1.4),
  t("路 彎", "└", [1, 1, 0, 0], 0.8),
  t("路 彎", "┌", [0, 1, 1, 0], 0.8),
  t("路 彎", "┐", [0, 0, 1, 1], 0.8),
  t("路 彎", "┘", [1, 0, 0, 1], 0.8),
  t("路 丁", "┬", [0, 1, 1, 1], 0.35),
  t("路 丁", "┤", [1, 0, 1, 1], 0.35),
  t("路 丁", "┴", [1, 1, 0, 1], 0.35),
  t("路 丁", "├", [1, 1, 1, 0], 0.35),
  t("河 直", "║", [2, 0, 2, 0], 1.2),
  t("河 橫", "═", [0, 2, 0, 2], 1.2),
  t("河 彎", "╚", [2, 2, 0, 0], 0.7),
  t("河 彎", "╔", [0, 2, 2, 0], 0.7),
  t("河 彎", "╗", [0, 0, 2, 2], 0.7),
  t("河 彎", "╝", [2, 0, 0, 2], 0.7),
  t("橋 ─", "╫", [2, 1, 2, 1], 0.5),
  t("橋 │", "╪", [1, 2, 1, 2], 0.5),
];

/** 第一次嘗試會在中途遇到矛盾；換下一顆種子重來就成功 */
export const SEED_A = 4;
export const SEED_B = 5;
export const runA = runWfc(W, H, TILES, mulberry32(SEED_A));
export const runB = runWfc(W, H, TILES, mulberry32(SEED_B));

/** 「只塌縮、還沒傳播」的中間狀態：前一張快照 + 被選中的那格只剩一種 */
export function beforePropagate(history: Snapshot[], k: number): Snapshot {
  const prev = history[k - 1];
  const cell = history[k].collapsed!;
  const domains = prev.domains.map((d, i) => (i === cell ? history[k].domains[cell] : d));
  return { domains, collapsed: cell, ripple: [] };
}

export const collapsedCount = (s: Snapshot) => s.domains.filter((d) => d.length === 1).length;
