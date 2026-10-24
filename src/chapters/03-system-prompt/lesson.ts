import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "模型不會「被設定」，它只會「讀到」。每一條規則，都是 Harness 在某個時機寫進請求的某個位置。",
    "位置決定三件事：**它多常出現、誰能改它、它有多可靠**。產品規則放 system，你寫的 CLAUDE.md 目前放在 messages 開頭。",
  ],
  eq: "請求 = `tools → system → messages`；越穩定的放越前面",
  eqNotes: [
    "這也是 prompt caching 比對前綴的順序：前面任一位元組改了，後面全部重算。",
    "CLAUDE.md 是建議；絕對不准的事交給 hook。",
  ],
  keys: [
    ["system prompt", "產品內建的工作守則，加上目錄、日期、git 狀態等通告單。"],
    ["CLAUDE.md", "個人層、專案層全部疊在一起讀；子目錄的讀到該目錄才載入。"],
    ["prompt caching", "逐字相同的前綴直接重用，更便宜、更快。"],
    ["`@路徑` 匯入", "把整個檔案展開進來。方便，但會膨脹固定開銷。"],
  ],
  predict: {
    q: "為了讓模型知道現在幾點，你把「目前時間」放在 system 的最前面。對 prompt caching 有什麼影響？",
    a: [
      "每次前綴都不同，後面整段快取幾乎永遠不會命中",
      "只有時間那一行要重算，其他照樣命中",
      "沒有影響，快取只比對 messages",
    ],
    ok: 0,
  },
  why: "快取只認**前綴**，從頭開始比對，任何一個位元組不同，那個位置之後全部失效。時間每次都變，又放在最前面，等於整份請求都要重算。常變的資訊（時間、這次要改哪一場、導演今天的意見）應該放在後面。",
  fig: "請求組裝台：夾具由下往上疊 tools、system、messages",
};
