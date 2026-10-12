/** 目錄資料：首頁清單與章節頁的標題列共用 */
export type Chapter = { no: string; title: string; film: string; path?: string };

export const chapters: Chapter[] = [
  { no: "01", title: "Agent Loop：模型只是一個函數，迴圈才是 Agent", film: "影視類比：密室裡的編劇 × 場務 × 場記本", path: "/01-agent-loop" },
  { no: "02", title: "Context Window：上下文是唯一的記憶", film: "token 預算、壓縮（compaction）、為什麼長片會「忘記」第一幕", path: "/02-context-window" },
  { no: "03", title: "System Prompt 與 CLAUDE.md：世界觀與規則的注入點", film: "Series Bible / 美術設定集", path: "/03-system-prompt" },
  { no: "04", title: "Tools 設計：工具描述就是介面", film: "Read / Edit / Grep / Bash ↔ 讀劇本、改場次、搜角色、跑格式檢查", path: "/04-tools" },
  { no: "05", title: "Permissions 與 Hooks：誰有權按下快門", film: "導演批准、製片守門", path: "/05-permissions-hooks" },
  { no: "06", title: "Subagents：第二攝製組", film: "分場平行寫作、獨立 context 的審稿人", path: "/06-subagents" },
  { no: "07", title: "Skills / Slash Commands / MCP：可插拔的專業能力", film: "「對白打磨」「節奏分析」「分鏡表輸出」技能包", path: "/07-skills-mcp" },
  { no: "08", title: "Memory 與持久化", film: "跨集數的角色弧線記憶", path: "/08-memory" },
  { no: "09", title: "總成：Claude Film 架構草圖", film: "把 01–08 的機制組成一張產品架構圖", path: "/09-architecture" },
  { no: "10", title: "實作：最小可運行的 Claude Film", film: "用 SDK 寫出第一個能改劇本的原型", path: "/10-prototype" },
];

/** 依路由找章節（章節頁標題列用） */
export const chapterByPath = (path: string) => chapters.find((c) => c.path === path);
