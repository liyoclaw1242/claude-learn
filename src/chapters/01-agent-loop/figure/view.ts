import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 讀卡機工作台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 左邊是密封的模型機櫃，前方一條導軌，Harness 是導軌上的滑台，
 * 後方三台壓印機是工具，最右邊是使用者的投卡機。
 */

export const WIDTH = 640;
export const HEIGHT = 360;
export const AZIMUTH = 62;

/* 底座 */
export const BASE: Plan = { x: -178, y: -66, w: 378, d: 132, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 模型機櫃 */
export const CAB: Plan = { x: -166, y: -48, w: 74, d: 80, r: 4 };
export const CAB_Z = 4;
export const CAB_TOP = 66;
export const CAB_FACE = CAB.x + CAB.w; // 朝滑台的那一面（+x）
export const CAB_FRONT = CAB.y + CAB.d; // 朝觀眾的那一面（+y）
export const DIAL = { x: -144, y: -14, r: 15, z: CAB_TOP + 3, h: 6 };
export const LAMP = { x: -110, y: 16 };

/* 導軌與滑台 */
export const RAIL: Plan = { x: CAB_FACE, y: -5, w: 286, d: 10, r: 2 };
export const RAIL_H = 4;
export const CARRIAGE: Plan = { x: -17, y: -18, w: 34, d: 36, r: 3 };
export const CARRIAGE_Z = RAIL_H;
export const CARRIAGE_H = 5;
export const TRAY_Z = CARRIAGE_Z + CARRIAGE_H;
export const TRAY_H = 1.5;
export const CARD_Z = TRAY_Z + TRAY_H;
export const CARD: Plan = { x: -13, y: -14, w: 26, d: 28, r: 1.5 };
export const POSTS: [number, number][] = [[-15.5, -16.5], [15.5, -16.5], [-15.5, 16.5], [15.5, 16.5]];
export const POST_R = 1.8;
export const POST_TOP = 44;
/** 卡片厚度 = token / 這個數 */
export const TOK_PER_UNIT = 200;

/* 各站在導軌上的位置（滑台中心 x） */
export const STATION = { dock: CAB_FACE + 19, Read: 2, Edit: 57, Bash: 112, home: 167 } as const;
export type Station = keyof typeof STATION;

/* 壓印機（工具）與投卡機共用的骨架 */
export const COLUMN_Y = -54;
export const COLUMN_D = 12;
export const ARM_Z = 76;
export const ARM_H = 8;
export const HEAD_R = 5.5;
export const HEAD_Z = 68;
export const PAD_R = 9;
export const PAD_H = 3;
/** 壓板在上方待命時，底面的高度 */
export const PAD_REST = 52;
export const ROD_R = 2;
export const ROD_LEN = 70;

/* 機櫃的讀卡罩 */
export const HOOD: Plan = { x: CAB_FACE, y: -21, w: 37, d: 42, r: 3 };
export const HOOD_Z = 58;
export const HOOD_H = 7;
export const HOOD_HEAD: [number, number] = [STATION.dock, 0];

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ x: CAB.x, y: CAB.y, w: CAB.w, d: CAB.d, r: 0 }, 0, CAB_TOP + 12),
    ...boxCorners({ x: STATION.Read - 12, y: COLUMN_Y - 6, w: STATION.home - STATION.Read + 24, d: 10, r: 0 }, 0, ARM_Z + ARM_H + 6),
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
