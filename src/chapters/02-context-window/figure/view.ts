import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 卡架工作台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 中間是固定高度的卡架（主對話的 context window），右邊是廢卡箱，
 * 再右邊是子代理自己的小卡架；左邊是檔案櫃（磁碟），前方有用量錶。
 */

export const WIDTH = 640;
export const HEIGHT = 420;
export const AZIMUTH = 52;

export const BASE: Plan = { x: -164, y: -62, w: 330, d: 128, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/** 100% 的 context 對應的高度 */
export const UNIT = 1.1;
export const FULL = 100 * UNIT;
export const THRESHOLD = 85;

/** 一座卡架：中心、卡片尺寸、立柱位置 */
export interface Rack {
  cx: number;
  card: Plan;
  post: [number, number];
  plinth: Plan;
  crosshead: Plan;
}
export const PLINTH_H = 4;
export const TRAY_H = 1;
export const CARD_Z = PLINTH_H + TRAY_H;
export const RACK_TOP = CARD_Z + FULL + 4;
export const HEAD_H = 7;

const rackOf = (cx: number, w: number, d: number): Rack => ({
  cx,
  card: { x: cx - w / 2, y: -d / 2, w, d, r: 1.5 },
  post: [w / 2 + 3, d / 2 + 3],
  plinth: { x: cx - w / 2 - 8, y: -d / 2 - 9, w: w + 16, d: d + 18, r: 3 },
  crosshead: { x: cx - w / 2 - 7, y: -d / 2 - 7, w: w + 14, d: d + 14, r: 3 },
});

export const MAIN = rackOf(0, 40, 30);
export const SUB = rackOf(118, 28, 22);

/* 廢卡箱：壓縮時被擠出來的卡掉進這裡 */
export const BIN: Plan = { x: 34, y: -21, w: 38, d: 42, r: 2 };
export const BIN_H = 11;
/** 被擠出的卡往 +x 滑多遠才落進箱子 */
export const EJECT_DX = 52;

/* 檔案櫃（磁碟） */
export const CABINET: Plan = { x: -152, y: -36, w: 48, d: 58, r: 3 };
export const CAB_FRONT = CABINET.y + CABINET.d;
export const DRAWER_H = 19;
export const DRAWER_Z0 = 6;
export const DRAWER_COUNT = 4;
export const CAB_TOP = DRAWER_Z0 + DRAWER_COUNT * (DRAWER_H + 1.5) + 2;

/* 用量錶 */
export const DIAL = { x: -70, y: 40, r: 15, z: 8, h: 6 };

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners(MAIN.crosshead, 0, RACK_TOP + HEAD_H + 8),
    ...boxCorners(SUB.crosshead, 0, RACK_TOP + HEAD_H + 8),
    ...boxCorners({ ...CABINET, d: CABINET.d + 20 }, 0, CAB_TOP + 4),
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
