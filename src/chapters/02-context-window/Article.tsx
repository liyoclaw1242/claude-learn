import { Link } from "react-router-dom";

const COUNT_PY = `import anthropic

client = anthropic.Anthropic()

script = open("my_film.fountain", encoding="utf-8").read()
resp = client.messages.count_tokens(
    model="claude-opus-5-5",
    messages=[{"role": "user", "content": script}],
)
print(resp.input_tokens)   # 這部劇本實際佔多少 token`;

const COMPACT_PY = `# 概念示意：壓縮就是「請模型寫交接摘要，然後用摘要取代歷史」
# （不是 Claude Code 的原始碼，只是機制本身）

def maybe_compact(messages, used_tokens, window):
    if used_tokens < window * 0.85:          # 還沒到門檻，不動
        return messages

    summary = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=8000,
        system="把以下工作對話寫成交接摘要。必須保留：已做的修改、"
               "尚未完成的任務、使用者明確提出的偏好。",
        messages=messages + [{"role": "user", "content": "請產生交接摘要。"}],
    )
    text = next(b.text for b in summary.content if b.type == "text")

    # 整段歷史被一則訊息取代 —— 細節從此只存在於這段摘要裡
    return [{"role": "user", "content": f"[先前對話摘要]\\n{text}"}]`;

export default function Article() {
  return (
    <article>
      <h1>02 · Context Window：上下文是唯一的記憶</h1>

      <p>第 01 章的結論是：模型沒有狀態，<code>messages[]</code> 就是它的全部記憶，而且每次呼叫都整份重送。
        這章接著問：<b>這份記憶能多大？滿了怎麼辦？</b></p>
      <blockquote>
        模型看不見的東西，對它來說就不存在。<br />
        Agent 設計有一大半是在決定：<b>此刻該讓模型看見什麼。</b>
      </blockquote>

      <h2>第 0 層：Token 與 Context Window</h2>
      <p>模型讀寫的單位是 <b>token</b>，大約是「一個詞的一部分」。英文大約 3–4 個字母一個 token；
        中文的比例跟英文不同，而且依 tokenizer 而異。所以<b>不要用字數估算，要實際量</b>：</p>
      <pre>{COUNT_PY}</pre>
      <p>在 Claude Code 裡，輸入 <code>/context</code> 可以直接看到目前視窗的用量，以及被哪些部分吃掉。</p>
      <p><b>Context window</b> 是單次呼叫能處理的 token 上限，輸入（整份 messages + system + tools）和這次的輸出都算在內。
        目前的 Claude 模型視窗很大（最高到百萬 token 等級），單部電影劇本一次放得下。
        但視窗大不代表問題消失 —— 下面會看到，問題往往在<b>塞滿之前</b>就出現了。</p>

      <h2>第 1 層：視窗裡裝了什麼</h2>
      <table>
        <thead><tr><th>內容</th><th>特性</th><th>對編劇場景的意義</th></tr></thead>
        <tbody>
          <tr><td>system prompt</td><td>固定、每次都帶</td><td>Claude Film 的「職業規範」放這裡</td></tr>
          <tr><td>工具定義</td><td>固定；工具越多越大（MCP 尤其明顯）</td><td>工具不是越多越好，每個都有成本</td></tr>
          <tr><td>CLAUDE.md</td><td>開場自動載入</td><td>Series Bible 的「目錄」，不是全文</td></tr>
          <tr><td>對話與模型回覆</td><td>持續累積</td><td>審稿意見、改寫討論</td></tr>
          <tr><td><b>工具結果</b></td><td><b>通常是最大宗</b>；只增不減</td><td>每讀一次全文 = 多一份副本</td></tr>
        </tbody>
      </table>

      <h2>第 2 層：為什麼會「忘記」—— 三個原因</h2>
      <ol>
        <li><b>硬上限</b>：塞不下就必須刪減或壓縮。被移出視窗的內容，模型就看不到了。</li>
        <li><b>注意力稀釋</b>：還沒塞滿，品質就可能先下降。內容越長、越多重複和雜訊，模型越難精準抓到中間某個細節。
          這是漸進的，不是到某個點突然斷掉。</li>
        <li><b>有損壓縮</b>：壓縮會把歷史換成摘要，而摘要一定會丟細節。丟掉的細節要嘛重新讀回來（花 context），要嘛就真的遺失了。</li>
      </ol>
      <p>場景第 3 步那件事值得再強調：<b>改稿 → 重讀全文 → 再改 → 再重讀</b>，每一輪都在視窗裡多疊一份幾乎一樣的劇本。
        對寫程式來說，一個檔案通常不大；對劇本來說，「一個檔案」可能就是整部片。這是 Claude Film 會比 Claude Code 更早撞牆的地方。</p>

      <h2>第 3 層：Compaction 的機制</h2>
      <p>Claude Code 在用量接近上限時會<b>自動壓縮</b>，你也可以手動輸入 <code>/compact</code>，後面附上「請特別保留什麼」的指示。
        想完全重來就用 <code>/clear</code>。</p>
      <p>壓縮的本質非常樸素：</p>
      <pre>{COMPACT_PY}</pre>
      <p>重點在 system 裡的「必須保留什麼」—— <b>什麼算重要，由領域決定</b>。寫程式的 Agent 會保留「改了哪些檔案、測試是否通過」；
        編劇 Agent 應該保留的東西完全不同（見下面的設計啟示）。</p>
      <p>（Claude API 本身也提供伺服器端的壓縮功能，以及「清除舊工具結果」的 context editing 功能。原理相同，只是改由 API 執行。）</p>

      <h2>第 4 層：Claude Code 的五種策略</h2>
      <table>
        <thead><tr><th>策略</th><th>做法</th><th>代價</th></tr></thead>
        <tbody>
          <tr><td><b>按需讀取</b></td><td>不預先載入專案；模型用 Grep / Glob 搜尋，再用 Read 的 offset / limit 只讀需要的片段</td><td>多幾次工具呼叫</td></tr>
          <tr><td><b>壓縮</b></td><td>自動或 <code>/compact</code>：把歷史換成摘要</td><td>有損</td></tr>
          <tr><td><b>子代理</b></td><td>重度閱讀交給獨立視窗，只回傳結論（第 06 章）</td><td>子代理看不到主對話的細節</td></tr>
          <tr><td><b>外部記憶</b></td><td>重要資訊寫進檔案；CLAUDE.md 開場自動載入（第 08 章）</td><td>要有人維護這些檔案</td></tr>
          <tr><td><b>Prompt caching</b></td><td>不變的前綴不重算</td><td>只省錢和時間，<b>不增加容量</b></td></tr>
        </tbody>
      </table>
      <p>Claude Code 的主軸是第一種：<b>agentic search</b>。它不幫專案建向量索引、也不預先塞檔案，而是給模型好用的搜尋工具，讓它自己決定看什麼。
        這也呼應第 01 章的分工：決策權在模型，Harness 負責提供好用的「眼睛」。</p>

      <h2>影視類比</h2>
      <table>
        <thead><tr><th>Context 概念</th><th>片場</th></tr></thead>
        <tbody>
          <tr><td>Context window</td><td><b>編劇的桌面</b>。桌子再大也有邊，堆太多紙就找不到要的那一張。</td></tr>
          <tr><td>注意力稀釋</td><td>桌上同時攤著五個版本的劇本，你很難確定自己看的是哪一版的哪一頁。</td></tr>
          <tr><td>Compaction</td><td><b>「前情提要」</b>。三分鐘濃縮一整季 —— 有效，但一定會漏掉某些伏筆。</td></tr>
          <tr><td>按需讀取</td><td>場記查<b>場次表</b>找到第 7 場，而不是從頭翻整本。</td></tr>
          <tr><td>子代理</td><td>派助理去讀整本，交回<b>一頁讀書報告</b>。</td></tr>
          <tr><td>外部記憶</td><td><b>Series Bible</b>、角色設定集、修訂紀錄 —— 換了編劇室成員也能接手。</td></tr>
        </tbody>
      </table>

      <h2>對 Claude Film 的設計啟示</h2>
      <ol>
        <li><b>讓劇本「可定址」。</b> 場次編號、角色出場索引、伏筆清單，都應該能用工具直接查。
          例如 <code>read_scene(n)</code>、<code>find_mentions("小美")</code>、<code>get_outline()</code> —— 這些工具決定了模型能不能按需讀取，而不是每次都讀全文。</li>
        <li><b>改稿工具回傳 diff，不回傳全文。</b> 避免「每改一次就多一份劇本副本」。</li>
        <li><b>設計編劇專用的壓縮規則。</b> 必須保留：已埋的伏筆和尚未回收的懸念、角色的關鍵設定、已確認的修改決策、導演/製片的明確意見。
          可以丟掉：改寫過程中的試錯、已被否決的版本。</li>
        <li><b>Bible 外部化並自動維護。</b> 角色設定、場次表、修訂紀錄寫進檔案，每次改稿後由工具或 hook 自動更新（第 05 章）。</li>
        <li><b>需要讀全文的分析交給子代理。</b> 一致性檢查、節奏分析、角色弧線追蹤 —— 讀全文、只回報結論。</li>
      </ol>

      <h2>自我檢核</h2>
      <ul>
        <li>視窗有一百萬 token，為什麼還需要擔心 context 管理？請舉兩個理由。</li>
        <li>壓縮之後模型「忘記」了某個伏筆。這是模型的問題，還是 Harness 的問題？可以怎麼修？</li>
        <li>如果 Claude Film 一次只能給模型 3 個工具，你會選哪 3 個，讓它不必讀全文也能回答大多數劇本問題？</li>
      </ul>
      <p><Link to="/01-agent-loop">← 01 Agent Loop</Link>　·　<Link to="/">回目錄</Link>　·　<Link to="/03-system-prompt">03 System Prompt 與 CLAUDE.md →</Link></p>
    </article>
  );
}
