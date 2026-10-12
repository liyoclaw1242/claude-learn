import { boxCorners, fitProjection, iso, type Plan, type Point3 } from "../../../iso/iso-kit";

/**
 * 請求組裝台的世界座標（1 單位 ≈ 1 px，z 朝上）。
 * 中間是組裝夾具（一次請求，由下往上 = 送出順序），左邊是三層公文架（目錄層級），
 * 右後方是模型機櫃與 Edit 壓印機，壓印機下方有 hook 的擋塊。
 */

export const WIDTH = 640;
export const HEIGHT = 400;
export const AZIMUTH = 54;

export const BASE: Plan = { x: -176, y: -64, w: 360, d: 128, r: 10 };
export const BASE_H = 10;
export const FOOT_H = 5;

/* 組裝夾具 */
export const JIG = { cx: 0 };
export const CARD: Plan = { x: -20, y: -16, w: 40, d: 32, r: 1.5 };
export const PLINTH: Plan = { x: -30, y: -26, w: 60, d: 50, r: 3 };
export const PLINTH_H = 5;
/** steps.tsx 裡每層的 h 乘上這個數 = 卡的厚度 */
export const K = 5.2;
export const DIVIDER_H = 0.9;
export const GAP = 1.2;
export const RODS: [number, number][] = [[-25, -21], [25, -21]];
export const ROD_TOP = 112;
export const CLAMP_H = 5;
/** 夾板在上方待命時的底面高度 */
export const CLAMP_REST = 98;

/* 公文架（左）：由下往上 ep03、series、~/.claude */
export const SHELF = { x: -168, y: -42, w: 62, d: 56 };
export const TRAY_Z = [8, 34, 60];
export const TRAY_H = 7;
export const SHELF_TOP = 86;
export const SHEET: Plan = { x: SHELF.x + 9, y: SHELF.y + 7, w: 44, d: 40, r: 1 };

/* 模型機櫃（右後） */
export const CAB: Plan = { x: 62, y: -50, w: 46, d: 44, r: 4 };
export const CAB_TOP = 58;

/* Edit 壓印機與 hook 擋塊（最右） */
export const PRESS_X = 148;
export const COLUMN_Y = -50;
export const ARM_Z = 70;
export const BED: Plan = { x: PRESS_X - 15, y: -15, w: 30, d: 30, r: 2 };
export const BED_H = 5;
export const PAGE: Plan = { x: PRESS_X - 11, y: -11, w: 22, d: 22, r: 0.8 };
export const RAM_R = 8;
export const RAM_REST = 44;
export const STOP: Plan = { x: PRESS_X - 9, y: -9, w: 18, d: 18, r: 1.2 };
export const STOP_H = 9;
/** 擋塊收起時往 +x 退多少 */
export const STOP_OUT = 26;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners(PLINTH, 0, ROD_TOP + 6),
    ...boxCorners({ x: SHELF.x, y: SHELF.y, w: SHELF.w, d: SHELF.d, r: 0 }, 0, SHELF_TOP + 4),
    ...boxCorners({ x: PRESS_X - 12, y: COLUMN_Y - 6, w: 24, d: 60, r: 0 }, 0, ARM_Z + 14),
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: AZIMUTH },
);

export const at = (point: Point3) => iso(point, P);
