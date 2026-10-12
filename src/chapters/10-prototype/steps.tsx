import type { BaseStep } from "../../components/ChapterStage";
import { between } from "./code";

/** 原型抽屜塔的八層托盤，由下往上裝；07 是虛線的延伸層 */
export type FloorId = "f01" | "f02" | "f03" | "f04" | "f05" | "f06" | "f07" | "f08";

export type Floor = { id: FloorId; ch: string; name: string; code: string; color: string; ghost?: boolean };

export const FLOORS: Floor[] = [
  { id: "f01", ch: "01", name: "agent loop", code: "run_agent() · call_model()", color: "#c08bff" },
  { id: "f02", ch: "02", name: "context 預算", code: "tokens_used() · compact()", color: "#ff7a8a" },
  { id: "f03", ch: "03", name: "規則注入", code: "SYSTEM · load_instructions()", color: "#5ec8f2" },
  { id: "f04", ch: "04", name: "劇本工具", code: "read_scene · edit_scene …", color: "#6ee7a8" },
  { id: "f05", ch: "05", name: "權限與 hooks", code: "pre_tool_use() · post_tool_use()", color: "#f2b84b" },
  { id: "f06", ch: "06", name: "子代理", code: "review_script()", color: "#ffa94d" },
  { id: "f07", ch: "07", name: "skills（延伸）", code: "沒寫進原型，文中說明怎麼加", color: "#8a92a6", ghost: true },
  { id: "f08", ch: "08", name: "長期記憶", code: "remember() · memory/notes.md", color: "#9fd8f0" },
];

/** 卡片可以停靠的站：導軌上的各站，或升降梯送到的樓層 */
export type Spot = "director" | "disk" | "model" | "sub" | FloorId;

export type Step = BaseStep & {
  /** 已經裝進塔裡的托盤 */
  built: FloorId[];
  /** 本步驟拉出的托盤 */
  focus?: FloorId;
  /** 卡片沿這些站循環移動（滑台走導軌、升降梯上下樓層） */
  flow?: Spot[];
  /** 右側面板顯示的程式碼片段 */
  snippet: string;
};

const ALL: FloorId[] = FLOORS.map((f) => f.id);
const upTo = (id: FloorId) => ALL.slice(0, ALL.indexOf(id) + 1);

export const steps: Step[] = [
  {
    title: "一個檔案，八層托盤",
    built: [],
    snippet: between('"""claude_film.py', "class ToolError"),
    desc: (<>
      <p>最後一章，把前面九章的機制組成一支<b>可以真的跑起來</b>的 Python 程式：<code>claude_film.py</code>，大約 290 行。</p>
      <p>它是一座八層的抽屜塔，每一層托盤對應一章，<b>托盤的高度跟那段程式碼的行數成正比</b>。左邊是導演的終端台（你在這裡打字）和 <code>series/</code> 檔案櫃，右邊是模型機櫃；前方導軌上的滑台和塔邊的升降梯，負責把卡送到各站。</p>
      <p>接下來一層一層裝進去，每一步拉出那一層托盤，右側面板會顯示那一層的程式碼。</p>
    </>),
  },
  {
    title: "地基：agent loop（01）",
    built: upTo("f01"),
    focus: "f01",
    flow: ["f01", "model", "f01"],
    snippet: between("# ---------- 01", "# ---------- 02"),
    desc: (<>
      <p>地基就是第 01 章的 <code>while</code> 迴圈：呼叫模型 → 有 tool_use 就執行 → 把結果放回 messages → 再呼叫。</p>
      <p>比 01 章多了幾件實務上必須處理的事：用<b>串流</b>呼叫（長回覆不會逾時）、無法解析的工具輸入要重送、被截斷或被拒絕的回合<b>不能</b>放回歷史，否則下一次呼叫會因為 tool_use 沒有對應的結果而失敗。</p>
    </>),
  },
  {
    title: "context 預算與編劇專用壓縮（02）",
    built: upTo("f02"),
    focus: "f02",
    snippet: between("# ---------- 02", "def main"),
    desc: (<>
      <p>每回合結束後，從 <code>response.usage</code> 算出這次送了多少 token。超過預算就壓縮。</p>
      <p>預算刻意訂得比視窗上限低很多（第 02 章：還沒塞滿，注意力就先稀釋了）。</p>
      <p>壓縮指令是<b>編劇專用</b>的：一定要保留伏筆、角色設定變更、已確認與已否決的決策。</p>
    </>),
  },
  {
    title: "規則注入（03）",
    built: upTo("f03"),
    focus: "f03",
    flow: ["disk", "f03", "model"],
    snippet: between("# ---------- 03", "# ---------- 04"),
    desc: (<>
      <p>產品自己的規則放 <code>system</code>，並標上 <code>cache_control</code>：tools 加 system 這段前綴每次都一樣，可以被快取。</p>
      <p>劇集的 <code>CLAUDE.md</code> 和長期筆記，放在<b>第一則訊息的最前面</b>，跟 Claude Code 的做法一致。</p>
      <p>單集的 <code>ep02/CLAUDE.md</code> 則在第一次讀到第 2 集時，才附在 read_scene 的結果裡。</p>
    </>),
  },
  {
    title: "劇本工具（04）",
    built: upTo("f04"),
    focus: "f04",
    flow: ["model", "f04", "disk", "f04", "model"],
    snippet: between("def get_outline", "def remember"),
    desc: (<>
      <p>四個工具讓劇本變得<b>可定址</b>：大綱、讀一場、搜角色、改一段。</p>
      <p><code>edit_scene</code> 用<b>精確字串取代</b>，old 必須在該場只出現一次；成功時只回傳 diff，不回傳全文。</p>
      <p>失敗時丟出 <code>ToolError</code>，以 <code>is_error</code> 回給模型，讓它自己修正（例如重新讀一次原文）。</p>
    </>),
  },
  {
    title: "權限與 hooks（05）",
    built: upTo("f05"),
    focus: "f05",
    flow: ["model", "f05", "director", "f05", "f04"],
    snippet: between("# ---------- 05", "# ---------- 01"),
    desc: (<>
      <p>工具執行前，<code>pre_tool_use</code> 先檢查：已播出的第 1 集直接拒絕（這是程式，不是請求）；其他修改先秀出差異，<b>問導演</b>同不同意。</p>
      <p>執行後，<code>post_tool_use</code> 跑格式檢查，把警告附在結果後面，模型看到就會自己修。</p>
      <p>另外：串流加上 eager input streaming 時，伺服器不驗證工具輸入，所以 <code>valid()</code> 自己檢查型別與必填欄位。</p>
    </>),
  },
  {
    title: "子代理（06）",
    built: upTo("f06"),
    focus: "f06",
    flow: ["model", "f06", "sub", "f06", "model"],
    snippet: between("# ---------- 06", "def tool("),
    desc: (<>
      <p><code>review_script</code> 本身就是一個工具，但它內部<b>再跑一次 run_agent</b>：全新的 messages、只有唯讀工具、自己的 system prompt。</p>
      <p>它讀多少場都不影響主對話的 context，最後只把<b>問題清單</b>交回來。</p>
      <p>唯讀是用工具清單限制的：子代理手上根本沒有 edit_scene。</p>
    </>),
  },
  {
    title: "skills：留給你加的一層（07）",
    built: upTo("f07"),
    focus: "f07",
    snippet: "# 07：skills 沒有寫進原型。加法（約 20 行）：\n#\n# 1. skills/對白打磨/SKILL.md、skills/節奏分析/SKILL.md …\n#    每份的第一行寫一句「什麼時候該用我」\n# 2. load_instructions() 只放「名稱 + 第一行」的清單\n# 3. 新增工具 use_skill(name)：回傳那份 SKILL.md 全文\n#\n# 模型平常只看到清單（便宜），需要時才載入全文\n# —— 這就是第 07 章的「漸進式揭露」。",
    desc: (<>
      <p>第 07 章的 skills 沒有寫進原型，這層是虛線。它很好加：<b>平常只放技能清單，需要時才載入全文</b>。</p>
      <p>右側面板是加法的步驟。這也是一個好練習：照著做，你就親手實作了一次漸進式揭露。</p>
    </>),
  },
  {
    title: "長期記憶（08）",
    built: upTo("f08"),
    focus: "f08",
    flow: ["f08", "disk", "f03", "model"],
    snippet: between("MEMORY = ROOT", "LOCKED") + "\n\n# …\n\n" + between("def remember", "# ---------- 06"),
    desc: (<>
      <p><code>remember</code> 把編劇確認的事寫進 <code>memory/notes.md</code>。</p>
      <p>下一次開工時，<code>load_instructions()</code> 會把它跟 CLAUDE.md 一起放進第一則訊息。視窗會清空，磁碟不會。</p>
    </>),
  },
  {
    title: "跑一次：完整的一輪",
    built: ALL,
    flow: ["director", "f03", "f01", "model", "f04", "f05", "director", "f05", "disk", "f01", "director"],
    snippet: between("def main", 'if __name__'),
    desc: (<>
      <p>導演：「第 2 集阿哲那句台詞太硬，改口語一點。」</p>
      <p>規則注入 → 迴圈呼叫模型 → 模型用 find_mentions 和 read_scene 定位 → 提出 edit_scene → hook 問導演 → 寫入磁碟、回傳 diff → 模型回報。</p>
      <p>每一步，都是前面某一章講過的機制。</p>
    </>),
  },
];
