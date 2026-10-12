import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 主片場與第二攝製組的工作台（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是主代理：模型機櫃 + 較高的主卡架；中間一道隔板；右邊三個攝製組工位，
 * 每個工位有自己的小機櫃與小卡架（獨立的 context）。前方一條導軌，三台滑台運送任務單與報告。
 */

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 56;

export const BASE: Plan = { x: -190, y: -70, w: 386, d: 136, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/** steps.tsx 的 h 乘上這個數 = 卡的厚度 */
export const K = 11;
export const PLINTH_H = 4;
export const TRAY_H = 1;
export const CARD_Z = PLINTH_H + TRAY_H;

export interface Rack { cx: number; card: Plan; post: [number, number]; top: number }
const rackOf = (cx: number, w: number, d: number, top: number): Rack => ({
  cx, card: { x: cx - w / 2, y: -d / 2, w, d, r: 1.5 }, post: [w / 2 + 3, d / 2 + 3], top,
});

/* 主代理 */
export const MAIN = rackOf(-100, 34, 28, 86);
export const MAIN_CAB: Plan = { x: -174, y: -58, w: 44, d: 42, r: 4 };
export const MAIN_CAB_TOP = 60;

/* 隔板：子代理看不到主對話 */
export const WALL: Plan = { x: -60, y: -64, w: 4, d: 80, r: 1 };
export const WALL_TOP = 72;

/* 三個攝製組工位 */
export const UNIT_X = [6, 62, 118];
export const UNITS_R = UNIT_X.map((cx) => rackOf(cx, 24, 20, 68));
/** 攝製組的小機櫃坐在自己卡架的頂上：一個模型配一個 context */
export const UNIT_CAB = (cx: number): Plan => ({ x: cx - 12, y: -10, w: 24, d: 20, r: 2.5 });
export const UNIT_CAB_Z = 68 + 5;
export const UNIT_CAB_H = 15;

/* 劇本檔案櫃（攝製組讀全文的來源） */
export const FILES: Plan = { x: 152, y: -44, w: 32, d: 44, r: 3 };
export const FILES_FRONT = FILES.y + FILES.d;
export const DRAWER_H = 18;
export const FILES_TOP = 4 + 2 * (DRAWER_H + 1.5) + 2;

/* 導軌與滑台 */
export const RAIL: Plan = { x: -122, y: 30, w: 266, d: 8, r: 2 };
export const RAIL_H = 3;
export const SLED: Plan = { x: -10, y: 26, w: 20, d: 16, r: 2 };
export const SLED_H = 4;
export const PARK = [-112, -92, -72];
export const CARGO: Plan = { x: -8, y: 28, w: 16, d: 12, r: 1 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ x: MAIN.cx - 25, y: -25, w: 50, d: 50, r: 0 }, 0, MAIN.top + 10),
    ...boxCorners(MAIN_CAB, 0, MAIN_CAB_TOP + 4),
    ...boxCorners(FILES, 0, FILES_TOP + 4),
    ...boxCorners({ x: UNIT_X[2] - 18, y: -20, w: 36, d: 56, r: 0 }, 0, 68 + 5 + 15 + 6),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
