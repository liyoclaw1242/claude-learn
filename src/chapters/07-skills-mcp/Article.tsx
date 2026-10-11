import { Link } from "react-router-dom";

const SKILL_MD = `---
name: dialogue-polish
description: 打磨劇本對白。當使用者說對白太書面、不自然、角色口吻不一致，
  或要求「順一下對白」時使用。
---

# 對白打磨

## 步驟
1. 先讀整場戲，以及 bible/characters.md 裡出場角色的設定
2. 逐句檢查：這像不像這個角色會說的話？有沒有把情緒直接說出口？
3. 改寫時保留原本的資訊量與節拍，不新增劇情
4. 用 diff 呈現修改，每一處附一句理由

## 參考資料（需要時再讀）
- 書面語 → 台灣口語對照：reference/口語對照.md
- 改寫前後的好壞範例：examples.md`;

const SKILL_TREE = `.claude/skills/
├── dialogue-polish/
│   ├── SKILL.md              ← 名片（frontmatter）+ 全文
│   ├── examples.md           ← 附屬檔：用到才讀
│   └── reference/
│       └── 口語對照.md
└── shot-list/
    ├── SKILL.md              ← disable-model-invocation: true（只能手動 /shot-list）
    └── scripts/to_csv.py     ← 腳本：被執行，不被讀進 context`;

const LOADER_PY = `# 概念示意：用 Messages API 自己實作「漸進式揭露」的技能系統
# （不是 Claude Code 的原始碼，只是機制本身）
import anthropic, pathlib, yaml

client = anthropic.Anthropic()
SKILL_DIR = pathlib.Path(".claude/skills")

def parse(path):
    _, front, body = path.read_text(encoding="utf-8").split("---", 2)
    return yaml.safe_load(front), body

# 第一層：開場只收集名片
cards = {p.parent.name: parse(p)[0] for p in SKILL_DIR.glob("*/SKILL.md")}
listing = "\\n".join(
    f"- {name}: {meta['description']}"
    for name, meta in cards.items()
    if not meta.get("disable-model-invocation")       # 只能手動的不列出
)

tools = [{
    "name": "load_skill",
    "description": "載入一個技能的完整做法。當使用者的需求符合技能清單裡的描述時使用。",
    "input_schema": {
        "type": "object",
        "properties": {"name": {"type": "string"}},
        "required": ["name"],
    },
}]

def execute_tool(name, args):
    if name == "load_skill":                         # 第二層：觸發後才給全文
        return parse(SKILL_DIR / args["name"] / "SKILL.md")[1]

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=16000,
    system=f"你是 Claude Film。可用技能：\\n{listing}",
    tools=tools,
    messages=[{"role": "user", "content": "第 12 場對白太書面，幫我修。"}],
)
# 接下來就是第 01 章的迴圈；第三層（附屬檔）由模型自己用 Read 工具去讀`;

const MCP_PY = `# schedule_server.py：把製作排程系統包成 MCP server（使用官方 mcp 套件）
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("production-schedule")

@mcp.tool()
def get_shooting_days(scene: int) -> list[str]:
    """查詢某一場戲排定的拍攝日期。改動場景地點或角色前先查，避免打亂排程。"""
    return db.query_shooting_days(scene)

@mcp.tool()
def find_location(name: str) -> dict:
    """查詢場景地點的可用時段與限制（例如夜戲、噪音管制）。"""
    return db.query_location(name)

if __name__ == "__main__":
    mcp.run()          # 預設走 stdio`;

const MCP_ADD = `# 本機程序（stdio）：-- 後面是啟動 server 的指令
claude mcp add --transport stdio schedule -- python schedule_server.py

# 遠端服務（HTTP），並存進 .mcp.json 讓整個劇組共用
claude mcp add --transport http --scope project boards https://boards.example.com/mcp`;

export default function Article() {
  return (
    <article>
      <h1>07 · Skills / Slash Commands / MCP：可插拔的專業能力</h1>

      <p>前面幾章的機制都是 Claude Code 內建的。這章看的是<b>怎麼把新的能力插進去</b>，而且插進去之後不會把 context 撐爆。</p>
      <blockquote>
        三種擴充，回答三個不同的問題：<br />
        <b>Skill</b>：該<b>怎麼做</b>（工作方法）　<b>Slash command</b>：<b>誰</b>決定現在做　<b>MCP</b>：<b>能碰到</b>哪些外部系統<br />
        貫穿三者的原則和第 02 章一樣：<b>不要預先塞滿，讓模型需要時再拿。</b>
      </blockquote>

      <h2>第 0 層：三種擴充 + 一個打包方式</h2>
      <table>
        <thead><tr><th></th><th>誰觸發</th><th>什麼時候進 context</th><th>固定成本</th><th>適合放</th></tr></thead>
        <tbody>
          <tr><td><b>Skill</b></td><td>模型依 description 判斷</td><td>名片常駐；全文觸發後才載入；附屬檔用到才讀</td><td>低（只有名片）</td><td>工作方法、SOP、專業判斷標準</td></tr>
          <tr><td><b>Slash command</b></td><td>使用者輸入 <code>/名稱</code></td><td>按下時</td><td>設成只能手動的話，幾乎為零</td><td>有副作用、或時機該由人決定的流程</td></tr>
          <tr><td><b>MCP</b></td><td>模型呼叫工具</td><td>工具定義（或只有名稱，見第 3 層）</td><td>中到高，看工具數量</td><td>外部系統的資料與操作</td></tr>
          <tr><td><b>Plugin</b></td><td>使用者安裝</td><td>看裡面裝了什麼</td><td>—</td><td>把以上全部打包分享</td></tr>
        </tbody>
      </table>

      <h2>第 1 層：Skill 與漸進式揭露</h2>
      <p>一個 skill 就是一個資料夾，核心是 <code>SKILL.md</code>：開頭的 frontmatter 是<b>名片</b>，下面是<b>全文</b>。</p>
      <pre>{SKILL_MD}</pre>
      <p>Claude Code 分三層把它交給模型：</p>
      <ol>
        <li><b>名片常駐</b>：開場時只把每個 skill 的 <code>name</code> 和 <code>description</code> 放進 context。</li>
        <li><b>全文觸發才載入</b>：模型判斷需求對得上某張名片，才把整份 SKILL.md 讀進來，之後幾輪都留著。</li>
        <li><b>附屬檔用到才讀</b>：SKILL.md 指到的參考檔、範例，模型需要時才讀；腳本是拿來執行，不會整份讀進 context。</li>
      </ol>
      <pre>{SKILL_TREE}</pre>
      <p>放在 <code>~/.claude/skills/</code> 是個人技能（所有專案都有），放在專案的 <code>.claude/skills/</code> 就跟著版控、整組共用。
        官方建議 SKILL.md 控制在 500 行以內，細節搬到附屬檔。</p>
      <p>這個機制用 Messages API 自己做也不難，關鍵就是「名片放 system、全文用工具拿」：</p>
      <pre>{LOADER_PY}</pre>

      <h2>第 2 層：Slash command —— 決定權在人</h2>
      <p>在 Claude Code 裡，自訂 slash command 已經<b>併入 skill</b>。舊的 <code>.claude/commands/名稱.md</code> 仍然有效，
        但新寫的建議直接用 skill。同一個 skill 預設兩種觸發都可以：模型自動選，或你輸入 <code>/名稱</code>。</p>
      <p>兩個 frontmatter 欄位控制這件事：</p>
      <ul>
        <li><code>disable-model-invocation: true</code>：<b>只能你按</b>。名片也不會進清單，模型根本不知道它存在。
          適合有副作用的動作（匯出、送審、發佈），或時機必須由人決定的流程。</li>
        <li><code>user-invocable: false</code>：<b>只能模型用</b>，不出現在 / 選單。適合背景知識型的技能。</li>
      </ul>

      <h2>第 3 層：MCP —— 連到外部世界的手</h2>
      <p><b>MCP（Model Context Protocol）</b>是一個開放協定。外部系統實作一個 MCP server，就能把功能提供給任何支援 MCP 的 client（Claude Code 是其中之一）。
        一個 server 可以提供三種東西：</p>
      <table>
        <thead><tr><th>類型</th><th>是什麼</th><th>在 Claude Code 裡怎麼用</th></tr></thead>
        <tbody>
          <tr><td>Tools</td><td>可以呼叫的函數</td><td>模型自己決定呼叫，跟內建工具一樣</td></tr>
          <tr><td>Resources</td><td>可以讀取的資料</td><td>你用 <code>@</code> 提及，把內容帶進對話</td></tr>
          <tr><td>Prompts</td><td>預先寫好的 prompt 範本</td><td>變成 slash command，名稱形如 <code>/mcp__server__prompt</code></td></tr>
        </tbody>
      </table>
      <p>寫一個 server 很直接，下面是把製作排程系統包起來的例子：</p>
      <pre>{MCP_PY}</pre>
      <p>接到 Claude Code：</p>
      <pre>{MCP_ADD}</pre>
      <p>傳輸方式：遠端服務建議用 <b>HTTP</b>；需要直接存取本機的用 <b>stdio</b>（Claude Code 會幫你啟動那個程序）。
        範圍分三種：<code>local</code>（預設，只有你、只在這個專案）、<code>project</code>（寫進 <code>.mcp.json</code>，跟著版控共用）、<code>user</code>（你的所有專案）。</p>

      <h3>MCP 的成本與 tool search</h3>
      <p>每個工具都有名稱、說明、參數 schema。接了幾個大型 MCP server，工具定義可能比你的對話還長，而且它排在請求最前面（第 03 章），每次都要帶。</p>
      <p>Claude Code 目前預設用 <b>tool search</b> 處理這件事：MCP 工具一開始只列名稱，模型需要時先呼叫搜尋工具，把完整定義拉進來再用。
        跟 skill 的漸進式揭露是同一個思路。另外，單次 MCP 工具回傳太大也會被截斷或改存成檔案，避免一次結果就吃掉大量 context。
        （這些門檻與預設值會隨版本調整，以官方文件為準。）</p>

      <h2>第 4 層：Plugin —— 把整套打包</h2>
      <p>Plugin 可以包含 skills、子代理定義、hooks、MCP server 設定，透過 marketplace 安裝。
        Plugin 裡的 skill 會加上命名空間（<code>/plugin名稱:skill名稱</code>），不會跟你自己的撞名。</p>
      <p>這讓「一個劇組的工作方式」變成可以安裝的東西：新專案裝一次，所有人拿到同一套技能、同一套外部連線、同一套守門規則（第 05 章）。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>機制</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>Skill 名片</td><td>資深編劇工作手冊的<b>目錄頁</b>。新人知道有哪些章節，不用整本背下來。</td></tr>
          <tr><td>SKILL.md 全文</td><td>手冊裡的某一章 SOP：「改對白時，先讀角色設定，再逐句檢查……」</td></tr>
          <tr><td>附屬檔</td><td>手冊附錄：口語對照表、改寫範例。遇到才翻。</td></tr>
          <tr><td>Slash command</td><td>導演直接喊口令：「來，出一份第 12 場的分鏡表。」</td></tr>
          <tr><td>只能手動的 skill</td><td>需要導演簽名才能啟動的流程，例如送審版匯出。</td></tr>
          <tr><td>MCP</td><td>和其他部門的<b>系統串接</b>：製片組排程、美術素材庫、分鏡資料庫。</td></tr>
          <tr><td>Tool search</td><td>劇組通訊錄：平常只記部門名稱，要找人時再查分機。</td></tr>
          <tr><td>Plugin</td><td>開拍前一次配好的<b>整套劇組工具箱</b>。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>把編劇專業做成技能包。</b> 對白打磨、節奏分析、分鏡表輸出、Fountain 格式化、選角筆記……
          每個 skill 都是一段可以分享、可以版控的<b>資深編劇經驗</b>。這可能是 Claude Film 最有護城河的部分。</li>
        <li><b>description 是技能的行銷文案。</b> 寫「何時該用」而不是「這是什麼」，把編劇真的會說的話放進去（「對白太書面」「順一下」）。
          寫不好，模型就不會選它。</li>
        <li><b>有副作用的流程只給人按。</b> 匯出送審版、通知演員、更新排程這類動作，設成只能手動觸發。</li>
        <li><b>MCP 接製作端，不要重造系統。</b> 排程、預算、素材庫、分鏡資料庫已經存在於製作公司的系統裡；Claude Film 只需要一層 MCP server 把它們變成工具。
          這也是讓「改劇本會不會打亂拍攝排程」變得可查的方法。</li>
        <li><b>工具和技能都要算 context 帳。</b> 每加一個 MCP、每寫一張名片，都是固定開銷。寧可少而精，配合按需載入。</li>
        <li><b>用 Plugin 交付「劇組設定」。</b> 一部劇的技能、Bible 結構、守門 hook、外部連線打包在一起，新劇組開工就是一行安裝。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>同樣是「對白打磨」的知識，寫進 CLAUDE.md 和寫成 skill，對 context 有什麼不同？各自適合什麼時候？</li>
        <li>「匯出送審版 PDF」應該做成會自動觸發的 skill、只能手動的 skill，還是 MCP 工具？為什麼？</li>
        <li>你的技能從來沒被模型自動選中。最先要檢查的是哪個欄位？</li>
      </ul>
      <p><Link to="/06-subagents">← 06 Subagents</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/08-memory">08 Memory 與持久化 →</Link></p>
    </article>
  );
}
