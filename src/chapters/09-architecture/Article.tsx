import { Link } from "react-router-dom";

const TREE = `series/
├── CLAUDE.md                      # Series Bible 目錄 + 寫作規範（03）
├── bible/                         # 記憶層（08）：結構化、可回寫
│   ├── characters.md              #   角色設定與弧線
│   ├── timeline.md                #   故事時間線
│   ├── setups.md                  #   伏筆與回收清單
│   └── director_notes.md          #   導演偏好
├── season1/                       # 已播出：hook 禁止寫入（05）
├── ep03/
│   ├── CLAUDE.md                  # 單集筆記，讀到才載入（03）
│   ├── outline.md
│   └── scene_01.fountain …        # 一場一檔，劇本可定址（04）
└── .claude/
    ├── settings.json              # 權限規則 + hooks 設定（05）
    ├── hooks/
    │   ├── guard_aired.py         #   已播出集數禁寫
    │   └── sync_scene_index.py    #   改稿後更新場次表
    ├── agents/                    # 子代理定義（06）
    │   ├── continuity-reviewer.md #   冷眼審稿人：只能讀、不能改
    │   └── pacing-analyst.md
    └── skills/                    # 技能包（07）
        ├── dialogue-polish/SKILL.md
        └── open-ending/SKILL.md`;

export default function Article() {
  return (
    <article>
      <h1>09 · 總成：Claude Film 架構草圖</h1>

      <p>前八章各自拆解了 Claude Code 的一個機制。這章把它們拼回一張圖，並回答系列一開始的問題：
        <b>如果要做一個給編劇用的 Claude Film，它長什麼樣子？</b></p>
      <blockquote>
        本章是<b>設計提案</b>。凡是寫「Claude Code 的做法」的地方，是前面章節講過的現有機制；
        寫「Claude Film」的地方，是我們的提案，還沒有被驗證過。
      </blockquote>

      <h2>第 0 層：一句話的架構</h2>
      <p>Claude Film = <b>Agent Loop</b> + <b>劇本工具</b> + <b>三層規則</b> + <b>守門 hooks</b> + <b>獨立審稿人</b> + <b>技能包</b> + <b>會回寫的記憶</b>。</p>
      <p>其中迴圈本身不是重點。第 01 章說過，迴圈只有二十行；真正決定產品好不好用的，是掛在迴圈上的東西。</p>

      <h2>第 1 層：架構總表</h2>
      <table>
        <thead><tr><th>元件</th><th>Claude Code 的做法</th><th>Claude Film 的提案</th><th>章</th></tr></thead>
        <tbody>
          <tr><td>Agent Loop</td><td>呼叫模型 → 執行工具 → 回填，直到 end_turn</td><td>直接沿用，不重造</td><td>01</td></tr>
          <tr><td>Context 管理</td><td>按需讀取、自動壓縮、<code>/compact</code> 附指示</td><td>編劇專用壓縮規則：必留伏筆、未回收懸念、已確認決策</td><td>02</td></tr>
          <tr><td>規則注入</td><td>內建 system prompt + 多層 CLAUDE.md + 子目錄按需載入</td><td>產品內建編劇專業；series/ 寫 Bible 目錄；epXX/ 寫單集筆記</td><td>03</td></tr>
          <tr><td>工具</td><td>Read / Edit / Grep / Glob / Bash，通用檔案操作</td><td>劇本專用：<code>read_scene</code>、<code>find_mentions</code>、<code>get_outline</code>、<code>edit_scene</code>（回傳 diff）</td><td>04</td></tr>
          <tr><td>權限與 hooks</td><td>allow / ask / deny 規則；PreToolUse、PostToolUse 等 hooks</td><td>已播出集數禁寫、設定衝突檢查、改稿後同步場次表</td><td>05</td></tr>
          <tr><td>子代理</td><td>Agent 工具：獨立 context，只回傳結論</td><td>冷眼審稿人、節奏分析師、角色弧線追蹤</td><td>06</td></tr>
          <tr><td>技能 / MCP</td><td>Skills 按需載入；MCP 接外部工具</td><td>「對白打磨」「開放式結局」技能包；MCP 接排程表、素材庫</td><td>07</td></tr>
          <tr><td>記憶</td><td>CLAUDE.md、記憶檔、對話續接</td><td>bible/ 結構化檔案 + 每次改稿後的回寫流程</td><td>08</td></tr>
        </tbody>
      </table>

      <h2>第 2 層：劇本專案的資料夾結構</h2>
      <p>Claude Code 的很多機制都是「看檔案放在哪裡」來決定行為的（CLAUDE.md 的層級、<code>.claude/</code> 底下的設定）。
        所以 Claude Film 最省力的設計，是讓<b>資料夾結構直接對應劇集結構</b>：</p>
      <pre>{TREE}</pre>
      <p>這個結構有一個附帶好處：<b>它現在就能用 Claude Code 跑</b>。<code>.claude/agents/</code>、<code>.claude/skills/</code>、
        <code>settings.json</code> 裡的 hooks 都是 Claude Code 既有的慣例。在寫任何程式碼之前，就能先驗證規則和流程設計對不對。</p>

      <h2>第 3 層：一個請求的完整資料流</h2>
      <p>以圖中第 9 步的「把第 3 集結尾改成開放式」為例：</p>
      <table>
        <thead><tr><th>#</th><th>發生什麼</th><th>由誰負責</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>開場：Series Bible、個人偏好已在 context；讀到 ep03 時附上單集筆記</td><td>規則注入層</td></tr>
          <tr><td>2</td><td>模型判斷這需要專業手法，載入「開放式結局」技能全文</td><td>模型決策 + 技能</td></tr>
          <tr><td>3</td><td><code>get_outline(3)</code> 找到結尾是第 42 場，<code>read_scene(3, 42)</code> 只讀那一場</td><td>劇本工具 + context 管理</td></tr>
          <tr><td>4</td><td>派冷眼審稿人：檢查新結局與後續集數的伏筆是否衝突，只回傳結論</td><td>子代理</td></tr>
          <tr><td>5</td><td><code>edit_scene</code> → PreToolUse hook 檢查：ep03 未播出、沒有違反角色設定 → 放行</td><td>hooks（確定性）</td></tr>
          <tr><td>6</td><td>PostToolUse hook 更新場次表；伏筆清單新增「未回收：阿哲的去向」</td><td>hooks + 記憶層</td></tr>
          <tr><td>7</td><td>回報：diff + 審稿意見，等導演批准</td><td>介面</td></tr>
        </tbody>
      </table>
      <p>注意第 2、3、4 步的順序<b>不是寫死的</b>。是模型在迴圈裡一步一步決定的；換一個請求，路徑就不一樣。
        Harness 只保證兩件事：模型拿得到好用的工具，以及不該發生的事一定會被擋下。</p>

      <h2>第 4 層：建置路線圖（建議）</h2>
      <p>以下是建議順序，核心想法是<b>先驗證設計、再寫程式</b>：</p>
      <ol>
        <li><b>階段 0：用 Claude Code 本身當原型。</b> 照上面的資料夾結構，寫好 CLAUDE.md、兩個子代理、兩個技能、一個 hook。
          找一部真實劇本跑一週，看哪些規則沒被遵守、哪些工具不夠用。</li>
        <li><b>階段 1：以 Claude Agent SDK 為底。</b> Agent SDK 就是 Claude Code 背後的 Harness，以函式庫的形式提供：
          迴圈、context 壓縮、權限、hooks、子代理、MCP 都是現成的。Claude Film 要做的是加上<b>劇本專用工具</b>，
          讓模型不用再拿通用的 Read / Grep 硬搜劇本。第 10 章會實際寫一個。</li>
        <li><b>階段 2：編劇介面。</b> 終端機不是編劇的工作環境。需要劇本檢視、diff 批准、伏筆清單的視覺化。</li>
        <li><b>階段 3：記憶回寫與協作。</b> 讓 bible/ 隨每次改稿自動更新，並支援多人同時工作。</li>
      </ol>
      <p>這個順序的理由：越前面的階段，改設計的成本越低。規則和工具粒度如果一開始就錯，後面的介面做得再好也救不回來。</p>

      <h2>開放問題</h2>
      <ul>
        <li><b>多人協作</b>：編劇室有好幾位編劇同時改不同集數。Bible 誰有權改？兩個 Agent 同時回寫伏筆清單怎麼辦？</li>
        <li><b>版本控制</b>：git 對程式碼很好用，對劇本呢？編劇需要的可能是「第三稿 vs 第四稿」，而不是 commit hash。</li>
        <li><b>格式互通</b>：業界常用 Final Draft（.fdx）。Fountain 是純文字、方便 Agent 讀寫，但要能雙向轉換。</li>
        <li><b>創作歸屬</b>：哪些文字是編劇寫的、哪些是 Agent 寫的？修訂紀錄是否要標註來源？這涉及著作權與工會規範，需要法律意見，不是技術能決定的。</li>
        <li><b>評估</b>：程式有測試會亮紅燈；劇本「改得好不好」要怎麼量？可能需要編劇自己定義的檢核清單。</li>
      </ul>

      <h2>影視類比：製作公司的組織圖</h2>
      <table>
        <thead><tr><th>元件</th><th>製作公司</th></tr></thead>
        <tbody>
          <tr><td>Agent Loop</td><td><b>統籌</b>。不寫劇本，但讓每件事依序發生。</td></tr>
          <tr><td>模型</td><td><b>主筆編劇</b>。所有創作決策都在這裡。</td></tr>
          <tr><td>Context 管理</td><td><b>編劇助理</b>。整理桌面、寫前情提要、知道哪份資料放在哪。</td></tr>
          <tr><td>規則注入層</td><td><b>Series Bible 與單集筆記</b>。</td></tr>
          <tr><td>劇本工具</td><td><b>場記與資料組</b>。查場次、查角色出場、送修改稿。</td></tr>
          <tr><td>hooks</td><td><b>製片與法務</b>。不管創意多好，違規的就是不能過。</td></tr>
          <tr><td>子代理</td><td><b>外聘審稿顧問</b>。沒參與寫作過程，所以看得出問題。</td></tr>
          <tr><td>技能包</td><td><b>各類型的專業顧問</b>：喜劇節奏、懸疑佈局、對白指導，需要時才請來。</td></tr>
          <tr><td>記憶層</td><td><b>公司的資料庫</b>。人會換，資料庫留著。</td></tr>
          <tr><td>使用者</td><td><b>導演 / 製作人</b>。下指令、做最終批准。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>不要重造 Harness。</b> 迴圈、壓縮、權限、子代理這些基礎建設已經有成熟實作。產品差異化在劇本領域的那一層。</li>
        <li><b>價值集中在三件事：劇本工具、規則內容、記憶結構。</b> 圖中最後一步站在刻線底板上的機器（右側面板的金色和綠色），就是 Claude Film 的護城河。</li>
        <li><b>「建議」和「保證」要分清楚。</b> 每一條規則都要問：違反了會怎樣？後果嚴重的，就從 CLAUDE.md 搬到 hook。</li>
        <li><b>記憶的難點是回寫，不是儲存。</b> 每一個會改變設定的動作，都要有對應的更新路徑。</li>
        <li><b>先用 Claude Code 驗證設計。</b> 資料夾結構對了，同一套規則和技能幾乎可以直接搬進 Agent SDK 版本。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>「角色年齡不可與設定衝突」這條規則，應該放在 Bible、技能、還是 hook？為什麼？</li>
        <li>冷眼審稿人為什麼要做成子代理，而不是在主對話裡請模型「換個角度看」？</li>
        <li>如果只能先做三個劇本工具，你會選哪三個？它們分別解決第 02 章的哪個問題？</li>
        <li>階段 0 用 Claude Code 當原型時，哪些 Claude Film 的需求是它<b>做不到</b>的？</li>
      </ul>
      <p><Link to="/08-memory">← 08 Memory 與持久化</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/10-prototype">10 實作：最小可運行的 Claude Film →</Link></p>
    </article>
  );
}
