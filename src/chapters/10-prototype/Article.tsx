import { Link } from "react-router-dom";
import { CODE, SDK_CODE } from "./code";

const TREE = `series/                     ← 在這裡執行 python ../claude_film.py
├── CLAUDE.md               ← 全劇規範（開場載入）
├── ep01/                   ← 已播出：程式裡設為唯讀
│   └── scene_01.fountain
├── ep02/
│   ├── CLAUDE.md           ← 單集筆記（第一次讀到第 2 集才附上）
│   ├── scene_01.fountain
│   └── scene_02.fountain
└── memory/
    └── notes.md            ← remember 工具自動建立`;

const BIBLE = `# 《夜咖啡》寫作規範

- 劇本格式：Fountain。每場第一行是場景標頭（INT./EXT. 地點 - 日/夜）
- 對白口語、台灣用語；角色不直接說出自己的情緒，用動作表現
- 小美：28 歲，咖啡師，左手有疤（第 2 集埋、第 5 集揭曉）
- 阿哲：32 歲，夜班計程車司機，習慣用反問句迴避問題`;

const EP01 = `INT. 咖啡店 - 夜

打烊後的咖啡店。小美背對門口擦杯子，左手戴著袖套。

門鈴響。阿哲站在門口，雨水從外套滴下來。

小美
今天不營業。

阿哲
那妳為什麼還沒鎖門？`;

const EP02_NOTES = `本集重點：阿哲第一次說謊。
第 1 場的語氣要壓著，不要吵起來。`;

const EP02 = `EXT. 河堤 - 日

阿哲靠著車門點菸。小美拉了拉袖套，在他旁邊坐下。

阿哲
妳的手是因為什麼原因而受傷的呢？

小美
燙到的。

阿哲
（看著河面）
是喔。`;

const EP02_S2 = `INT. 計程車 - 夜

阿哲握著方向盤，後照鏡裡沒有乘客。

無線電
（雜訊）
……三號車，回報位置。

阿哲
（停頓）
在南京東路。

車窗外是河堤。`;

const SESSION = `$ cd series && python ../claude_film.py
Claude Film 原型。輸入你的需求，Ctrl+C 離開。

導演> 第 2 集阿哲問小美手傷那句太硬了，改口語一點
我先找到那句台詞。                      ← 模型呼叫 find_mentions("阿哲")、read_scene(2, 1)
第 1 場阿哲的問句是書面語，跟他「用反問句迴避」的設定也不合。我建議：

── 提議修改第 2 集第 1 場 ──              ← pre_tool_use：先問導演
- 妳的手是因為什麼原因而受傷的呢？
+ 手怎麼了？又是咖啡機？
允許這次修改？[y/N] y
已修改。改成反問句，帶出他知道她在咖啡店工作，也更符合本集「壓著」的語氣。
[context 9,812 / 預算 150,000 tokens]

導演> 記住：小美的疤只能在第 5 集揭曉，之前都只能遮
已記下。                                ← remember(...) 寫入 memory/notes.md

導演> 第 1 集第 1 場小美的台詞也順一下
第 1 集已播出，依規則不能修改。要不要改成在第 2 集補一場呼應？  ← hook 拒絕，模型轉向
（以上對話為示意，實際輸出會不同）`;

export default function Article() {
  return (
    <article>
      <h1>10 · 實作：最小可運行的 Claude Film</h1>

      <p>前面九章拆解了 Claude Code 的每一個機制。這章反過來：用大約 290 行 Python，把它們<b>組回一個能真的改劇本的 Agent</b>。</p>
      <blockquote>
        這不是產品，是<b>骨架</b>。它的價值是讓你親眼看到：<br />
        Claude Code 的每一個功能，落到程式碼裡都只是迴圈上的一個插入點。
      </blockquote>

      <h2>準備：一個最小的劇集專案</h2>
      <pre>{TREE}</pre>
      <p>把下面幾個檔案複製進去（內容是虛構的示範劇集）：</p>
      <p><code>series/CLAUDE.md</code></p>
      <pre>{BIBLE}</pre>
      <p><code>series/ep01/scene_01.fountain</code></p>
      <pre>{EP01}</pre>
      <p><code>series/ep02/CLAUDE.md</code></p>
      <pre>{EP02_NOTES}</pre>
      <p><code>series/ep02/scene_01.fountain</code>（阿哲那句台詞是故意寫硬的，留給 Agent 改）</p>
      <pre>{EP02}</pre>
      <p><code>series/ep02/scene_02.fountain</code></p>
      <pre>{EP02_S2}</pre>

      <h2>完整程式碼</h2>
      <p>需要 <code>pip install anthropic</code> 和環境變數 <code>ANTHROPIC_API_KEY</code>。存成 <code>claude_film.py</code>，放在 <code>series/</code> 的上一層。</p>
      <pre>{CODE}</pre>

      <h2>逐段對照</h2>
      <table>
        <thead><tr><th>程式碼</th><th>章節</th><th>Claude Code 裡對應的是</th></tr></thead>
        <tbody>
          <tr><td><code>run_agent</code> / <code>call_model</code></td><td>01</td><td>主迴圈本體</td></tr>
          <tr><td><code>tokens_used</code> / <code>compact</code></td><td>02</td><td>自動壓縮、<code>/compact</code></td></tr>
          <tr><td><code>SYSTEM</code> / <code>load_instructions</code> / 單集筆記</td><td>03</td><td>內建 system prompt、CLAUDE.md 各層、子目錄按需載入</td></tr>
          <tr><td>四個劇本工具</td><td>04</td><td>Read / Grep / Edit（精確字串取代、先讀再改）</td></tr>
          <tr><td><code>pre_tool_use</code> / <code>post_tool_use</code></td><td>05</td><td>權限規則、詢問使用者、PreToolUse / PostToolUse hooks</td></tr>
          <tr><td><code>review_script</code></td><td>06</td><td>Agent 工具（子代理）</td></tr>
          <tr><td>（未實作）</td><td>07</td><td>Skills、slash commands、MCP</td></tr>
          <tr><td><code>remember</code> / <code>memory/notes.md</code></td><td>08</td><td>自動記憶、CLAUDE.md</td></tr>
        </tbody>
      </table>

      <h2>跑起來大概是這樣</h2>
      <pre>{SESSION}</pre>

      <h2>幾個實作細節</h2>
      <ul>
        <li><b>串流。</b> 每次呼叫都用 <code>client.messages.stream(...)</code>，邊收邊印，最後用 <code>get_final_message()</code> 拿完整回應。長回覆不會遇到請求逾時。</li>
        <li><b>工具輸入要自己驗證。</b> 工具開了 <code>eager_input_streaming</code>，輸入會即時串流過來，但伺服器不再替你驗證格式。所以 <code>valid()</code> 先檢查型別與必填欄位，不合格就回 <code>is_error</code>；完全無法解析的 JSON 會讓串流丟出 <code>ValueError</code>，就重送這一回合。</li>
        <li><b>被截斷的回合不放回歷史。</b> 如果回應因為 <code>max_tokens</code> 或拒絕而中斷，裡面的 tool_use 不會有對應的結果；放回 messages，下一次呼叫就會失敗。</li>
        <li><b>壓縮時只留一則摘要。</b> Opus 5.5 會思考（adaptive thinking），而思考區塊綁定原本的對話內容，不能事後改寫舊訊息。所以 <code>compact()</code> 不刪改歷史，而是<b>整段換成一則摘要訊息</b>。另外，API 本身也有伺服器端的壓縮功能（beta），可以取代這段手寫的版本。</li>
        <li><b>路徑安全。</b> 工具參數是集數和場次的<b>整數</b>，路徑由程式自己組出來，模型無法指定任意路徑。如果你改成讓模型傳檔名，一定要確認解析後的路徑仍在 <code>series/</code> 之內。</li>
      </ul>

      <h2>練習：補上第 07 層</h2>
      <ol>
        <li>建立 <code>skills/對白打磨/SKILL.md</code>、<code>skills/節奏分析/SKILL.md</code>，第一行寫「什麼時候該用我」。</li>
        <li>在 <code>load_instructions()</code> 裡只加入「技能名稱 + 第一行」的清單。</li>
        <li>新增工具 <code>use_skill(name)</code>，回傳那份 SKILL.md 的全文。</li>
      </ol>
      <p>模型平常只看到清單，需要時才讀全文。這就是第 07 章的漸進式揭露，大約 20 行。</p>

      <h2>或者：直接用 Claude Agent SDK</h2>
      <p>上面的 290 行是為了讓你看懂機制。真的要做產品時，有另一條路：<b>Claude Agent SDK</b>（<code>pip install claude-agent-sdk</code>）。
        它就是把 Claude Code 的整套 Harness 包成函式庫：迴圈、壓縮、權限、hooks、子代理、skills、內建的 Read / Edit / Grep 都已經在裡面。</p>
      <p>這時 Claude Film 要寫的，只剩<b>編劇領域的部分</b>：自訂工具、規則、hooks、子代理定義。</p>
      <pre>{SDK_CODE}</pre>
      <p>幾個重點：</p>
      <ul>
        <li>自訂工具透過 <code>create_sdk_mcp_server</code> 掛上，名稱會變成 <code>mcp__film__read_scene</code> 這種格式（第 07 章的 MCP）。</li>
        <li>hook 的寫法跟 Claude Code 的設定檔 hooks 一樣：回傳 <code>permissionDecision: "deny"</code> 就擋下。</li>
        <li><code>system_prompt</code> 傳字串會<b>取代</b>內建的 system prompt；SDK 也提供沿用 Claude Code 預設 prompt 的選項，細節請查官方文件。</li>
        <li>SDK 的 API 還在快速演進，動手前請以官方文件為準。</li>
      </ul>
      <table>
        <thead><tr><th></th><th>自己寫迴圈（本章原型）</th><th>Claude Agent SDK</th></tr></thead>
        <tbody>
          <tr><td>適合</td><td>學習、完全掌控每個細節、非常特殊的流程</td><td>做產品、想直接繼承 Claude Code 的成熟行為</td></tr>
          <tr><td>壓縮、權限、子代理</td><td>自己寫，自己維護</td><td>內建</td></tr>
          <tr><td>你要寫的</td><td>全部</td><td>編劇領域的工具、規則、hooks</td></tr>
        </tbody>
      </table>

      <h2>Claude Film 的下一步</h2>
      <ol>
        <li><b>把工具做深。</b> 角色出場表、伏筆清單、時間線檢查，都可以是工具或 hook，而不是寫在 prompt 裡的期望。</li>
        <li><b>把 Bible 做成會自己更新的資料。</b> 每次修改後，由 post hook 或子代理更新 characters.md、setups.md（第 08 章）。</li>
        <li><b>換掉終端機。</b> 導演批准修改的那一刻，應該是一個並排比對的介面，而不是 <code>[y/N]</code>。</li>
        <li><b>建立評估集。</b> 收集真實的改稿請求與「好的修改」範例，每次改 prompt 或工具都跑一次，才知道是變好還是變壞。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>把 <code>LOCKED</code> 的檢查從 <code>pre_tool_use</code> 搬到 system prompt 裡，會失去什麼保證？</li>
        <li><code>review_script</code> 讀了 30 場劇本，主對話的 context 增加了多少？為什麼？</li>
        <li>如果 <code>edit_scene</code> 改成回傳整場全文，第 02 章的哪個問題會出現？</li>
      </ul>
      <p><Link to="/09-architecture">← 09 總成：Claude Film 架構草圖</Link>　·　<Link to="/">回目錄</Link></p>
    </article>
  );
}
