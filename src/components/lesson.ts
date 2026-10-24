/**
 * 每章「左頁」的課文：參考立體書的版型
 * 導言 → 核心公式 → 關鍵詞 → 先猜猜看 → 掀開答案。
 * 字串內可用 **粗體** 與 `程式碼` 兩種標記（見 Rich.tsx）。
 */
export type Lesson = {
  /** 2 段導言，每段 1–3 句 */
  intro: string[];
  /** 一行「核心公式」：把本章濃縮成一條式子或一句規則 */
  eq: string;
  /** 公式底下 1–2 行補充 */
  eqNotes: string[];
  /** 3–4 個關鍵詞：[詞, 一行定義] */
  keys: [string, string][];
  /** 先猜猜看：3 個選項，ok = 正確選項的 index */
  predict: { q: string; a: string[]; ok: number };
  /** 掀開答案：2–4 句，解釋為什麼 */
  why: string;
  /** 右頁圖版的標題，例如「讀卡機：一圈 = 一次 API 呼叫」 */
  fig: string;
};
