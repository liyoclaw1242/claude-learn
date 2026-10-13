import { WH, WW, buildWorld } from "../lib/world";

export { WW as W, WH as H };
export const SEED_A = 3;
export const SEED_B = 8;
export const worldA = buildWorld(SEED_A);
export const worldB = buildWorld(SEED_B);

/** 每一層由哪一章負責 */
export const LAYERS = [
  { key: "terrain", name: "地形", chapter: "03 柏林噪聲", path: "/map/03-perlin-noise" },
  { key: "forest", name: "森林", chapter: "02 元胞自動機", path: "/map/02-cellular-automata" },
  { key: "towns", name: "據點", chapter: "04 BSP", path: "/map/04-bsp" },
  { key: "roads", name: "道路", chapter: "05 圖（最小生成樹 + 環）", path: "/map/05-euler" },
  { key: "tour", name: "巡迴路線", chapter: "05 歐拉回路", path: "/map/05-euler" },
  { key: "streets", name: "城鎮街道", chapter: "06 波函數塌縮", path: "/map/06-wfc" },
] as const;
export type LayerKey = (typeof LAYERS)[number]["key"];
