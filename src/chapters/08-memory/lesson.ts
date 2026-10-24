import type { Lesson } from "../../components/lesson";

export const lesson: Lesson = {
  intro: [
    "模型本身什麼都不會記住，每次開新對話，context 都從空白開始。所謂「記憶」，是 Harness 把東西**存到磁碟**，下次再**放回 context**。",
    "Claude Code 留下兩種東西：**transcript** 是整段對話的逐字紀錄，可以接著聊；**自動記憶**是模型精選的筆記，一則一檔，跨對話累積。",
  ],
  eq: "新對話的開場 = system + CLAUDE.md + MEMORY.md 索引（單檔按需讀）",
  eqNotes: [
    "索引有上限：目前是前 200 行或 25KB，取先到者。",
    "記憶是 context，不是強制設定；不能違反的規則仍要交給 hook。",
  ],
  keys: [
    ["transcript", "每次對話存成 JSONL；`--continue`／`--resume` 把它整段載回。"],
    ["自動記憶", "模型寫給自己的筆記：一則一檔，標上 user / feedback / project / reference。"],
    ["MEMORY.md", "記憶的索引，每則一行；開場只載入它，單檔需要時才讀。"],
    ["改寫，不新增", "設定改了就更新舊檔，避免兩則互相矛盾的記憶並存。"],
  ],
  predict: {
    q: "第 1 天你說「對白不要用『其實』開頭」，模型記成一則記憶。第 2 天開**新**對話寫對白，這句話是怎麼回到 context 的？",
    a: [
      "開場只載入索引，模型看到相關條目才讀那一個檔",
      "開場就把所有記憶檔的全文一起載入",
      "Claude Code 自動接回第 1 天的 transcript",
    ],
    ok: 0,
  },
  why: "開新對話時，只有 `MEMORY.md` 這份索引進 context，各記憶檔不會預先載入。模型在索引裡看到「對白偏好」跟這次任務有關，才用一般的檔案工具讀那一個檔。transcript 則要你用 `--continue` 或 `--resume` 才會整段載回。",
  fig: "三天的工作台：卡架每天清空，片盒與記憶檔案櫃留下來",
};
