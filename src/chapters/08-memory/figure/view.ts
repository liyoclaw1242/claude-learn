import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";
import type { CardId, SessionId } from "../steps";

/**
 * 三天的工作台（1 單位 ≈ 1 px，z 朝上）。
 * 沿 x 排三座卡架（第 1、2、3 天的 context），每座前方一個片盒托架（transcript）；
 * 最右邊是記憶檔案櫃：一事一個抽屜，頂上托盤放索引卡 MEMORY.md，前方是退件盤。
 */

export const WIDTH = 640;
export const HEIGHT = 380;
export const AZIMUTH = 56;

export const BASE: Plan = { x: -178, y: -60, w: 368, d: 124, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 卡架（每天一座） */
export const RACK_X: Record<SessionId, number> = { d1: -122, d2: -46, d3: 30 };
export const CARD_W = 34;
export const CARD_D = 26;
export const cardPlan = (cx: number): Plan => ({ x: cx - CARD_W / 2, y: -CARD_D / 2, w: CARD_W, d: CARD_D, r: 1.5 });
export const PLINTH_H = 4;
export const TRAY_H = 1;
export const CARD_Z = PLINTH_H + TRAY_H;
/** steps.tsx 裡區塊的 h 乘上這個數 = 卡厚 */
export const K = 10;
export const RACK_TOP = CARD_Z + 62;
export const HEAD_H = 6;
export const POST: [number, number] = [CARD_W / 2 + 3, CARD_D / 2 + 3];
/** 一天結束時，卡從卡架正面滑出的距離 */
export const CLEAR_DY = 26;

/* 片盒托架（transcript） */
export const CAN_Y = 36;
export const CAN_R = 10;

/* 記憶檔案櫃 */
export const CAB: Plan = { x: 108, y: -40, w: 62, d: 58, r: 3 };
export const CAB_FRONT = CAB.y + CAB.d;
export const CAB_TOP = 52;
export const DRAWER_W = 25;
export const DRAWER_H = 19;
/** 抽屜在櫃面的位置：左下 user、右下 feedback、左上 project、右上 reference */
export const DRAWER_AT: Record<Exclude<CardId, "idx" | "rej">, [number, number]> = {
  user: [CAB.x + 5, 6], fb: [CAB.x + 32, 6], proj: [CAB.x + 5, 28], ref: [CAB.x + 32, 28],
};
export const INDEX_TRAY: Plan = { x: CAB.x + 8, y: CAB.y + 8, w: 46, d: 40, r: 2 };
export const INDEX_CARD: Plan = { x: CAB.x + 12, y: CAB.y + 12, w: 38, d: 32, r: 1 };
export const REJECT_TRAY: Plan = { x: CAB.x + 8, y: CAB_FRONT + 14, w: 44, d: 28, r: 2 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ x: RACK_X.d1 - 30, y: -26, w: RACK_X.d3 - RACK_X.d1 + 60, d: 52, r: 0 }, 0, RACK_TOP + HEAD_H + 6),
    ...boxCorners({ ...CAB, d: CAB.d + 20 }, 0, CAB_TOP + 10),
  ],
  WIDTH,
  HEIGHT,
  { pad: 22, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
