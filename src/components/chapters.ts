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

/** 第二門課：程序化地圖生成（path 未填 = 還沒寫，首頁顯示為待完成） */
export const mapChapters: Chapter[] = [
  { no: "01", title: "網格與種子：地圖是一張數字表", film: "二維陣列、鄰居、白噪聲、可重現的亂數", path: "/map/01-grid" },
  { no: "02", title: "元胞自動機：讓洞穴自己長出來", film: "3×3 鄰居計數、4-5 規則、同步更新、flood fill 連通", path: "/map/02-cellular-automata" },
  { no: "03", title: "柏林噪聲：連續的高度場", film: "晶格梯度、內插與緩和曲線、八度疊加、島嶼遮罩", path: "/map/03-perlin-noise" },
  { no: "04", title: "BSP 二叉樹：切出地牢房間", film: "遞迴切割、葉節點放房間、沿著樹接走廊", path: "/map/04-bsp" },
  { no: "05", title: "圖與歐拉回路：一筆畫走完每條走廊", film: "房間 = 節點、走廊 = 邊、度數奇偶、Hierholzer", path: "/map/05-euler" },
  { no: "06", title: "波函數塌縮：用相鄰規則拼出地圖", film: "疊加態、最小熵、約束傳播、矛盾與重來", path: "/map/06-wfc" },
  { no: "07", title: "總成：一張完整的地圖", film: "五種演算法各管哪一層，怎麼串成一條管線", path: "/map/07-pipeline" },
];

export type Course = { id: string; title: string; intro: string; chapters: Chapter[] };

export const courses: Course[] = [
  {
    id: "claude",
    title: "Claude Code 原理筆記",
    intro: "理解 Claude Code 的核心機制，最後映射成一套給影視編劇用的 Claude Film。",
    chapters,
  },
  {
    id: "map",
    title: "程序化地圖生成",
    intro: "從一張數字表開始，一路做到洞穴、地形、地牢、巡邏路線與規則拼圖。每一步圖上跑的都是真正的演算法。",
    chapters: mapChapters,
  },
];

/** 依路由找章節（章節頁標題列用） */
export const chapterByPath = (path: string) => courses.flatMap((c) => c.chapters).find((c) => c.path === path);
