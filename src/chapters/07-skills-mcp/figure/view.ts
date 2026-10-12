import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 卡匣工作台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是技能卡匣架，中間是 context 卡架與使用者的按鍵盤，右後方是模型機櫃，
 * 右邊是 MCP 插座面板與三台外部系統；最後一步前方多一個 Plugin 套件箱。
 */

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 52;

export const BASE: Plan = { x: -182, y: -64, w: 366, d: 128, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 技能卡匣架：五個直立卡匣並排，正面（+y）的書背插著名片 */
export const CASSETTE_W = 10;
export const CASSETTE_D = 40;
export const CASSETTE_H = 34;
export const DIVIDER = 2.4;
export const RACK_X = -172;
export const RACK_Y = -34;
export const RACK_FRONT = RACK_Y + CASSETTE_D + 2;
export const RACK_Z = 4;
export const cassetteX = (i: number) => RACK_X + DIVIDER + i * (CASSETTE_W + DIVIDER);
export const RACK_W = 5 * (CASSETTE_W + DIVIDER) + DIVIDER;
/** 卡匣被拉出時往 +y 移動的距離：判斷中拉一點、載入時拉到底 */
export const PULL_PEEK = 9;
export const PULL_FULL = 20;
/** 附屬檔小抽屜從卡匣頂端升起的高度 */
export const DRAWER_UP = 9;

/* 使用者按鍵盤（slash command） */
export const CONSOLE: Plan = { x: -96, y: 26, w: 44, d: 22, r: 3 };
export const CONSOLE_H = 7;

/* context 卡架 */
export const RACK_CX = -30;
export const CARD: Plan = { x: RACK_CX - 20, y: -15, w: 40, d: 30, r: 1.5 };
export const PLINTH: Plan = { x: RACK_CX - 28, y: -24, w: 56, d: 48, r: 3 };
export const PLINTH_H = 4;
export const CARD_Z = PLINTH_H + 1;
/** steps.tsx 裡的 h 乘上這個數 = 卡的厚度 */
export const K = 6;
export const POSTS: [number, number][] = [[-23, -18], [23, -18], [-23, 18], [23, 18]];
export const POST_TOP = 98;

/* 模型機櫃（卡架右後） */
export const CAB: Plan = { x: 14, y: -54, w: 44, d: 42, r: 4 };
export const CAB_TOP = 60;

/* MCP 插座面板與外部系統 */
export const PANEL: Plan = { x: 82, y: -44, w: 92, d: 7, r: 1.5 };
export const PANEL_H = 54;
export const PANEL_FACE = PANEL.y + PANEL.d;
export const SOCKET_Z = 34;
export const SOCKET_X = [100, 128, 156];
export const DEVICE_Y = 14;
export const DEVICE: { w: number; d: number; h: number } = { w: 20, d: 18, h: 14 };

/* Plugin 套件箱（最後一步才出現） */
export const CRATE: Plan = { x: 6, y: 24, w: 40, d: 26, r: 2 };
export const CRATE_H = 9;
export const CRATE_DROP = 22;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners(PLINTH, 0, POST_TOP + 6),
    ...boxCorners({ x: RACK_X, y: RACK_Y, w: RACK_W, d: CASSETTE_D + PULL_FULL, r: 0 }, 0, RACK_Z + CASSETTE_H + DRAWER_UP + 4),
    ...boxCorners(PANEL, 0, PANEL_H + 4),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
