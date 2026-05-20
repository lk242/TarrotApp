# 專案狀態紀錄

最後更新：2026-05-21

## 目前已完成改動

### LINE 內建瀏覽器登入

- 新增 LINE LIFF 登入路徑，避免 Google OAuth 在 LINE in-app browser 觸發 `disallowed_useragent`。
- 前端透過 LIFF 取得 LINE 使用者 token。
- 後端 `signInWithLine` 驗證 LINE token 後簽發 Firebase custom token。
- 正式 LIFF ID：`2010137990-R4oOH7sv`
- 正式 LIFF URL：`https://liff.line.me/2010137990-R4oOH7sv`

### 點數與管理者占卜扣點

- 正式 AI provider 固定走 Firebase Functions。
- `generateTarotReading` 與 `followUpReading` 都在 Functions 端扣點。
- AI 呼叫失敗會自動退還本次點數。
- 前端 build 防護：正式 build 若不是 `VITE_AI_PROVIDER=functions` 會失敗，避免 API key 外洩或繞過扣點。

### AI 等待體驗

- 占卜解讀與追問期間加入全頁遮罩與 loading 動畫。
- 避免使用者在 AI 回覆期間誤以為頁面卡住。

### 扇形抽牌

- 桌機扇形抽牌改為 bounded layout。
- 限制最大舞台寬度與半徑，避免寬螢幕時牌組被推到畫面下方。
- 卡牌尺寸改為依舞台寬度縮放。
- 半圓扇形改為較收斂的角度，避免左右與底部溢出。

### 追問上下文

- 同一次占卜結果頁的連續追問，現在會把以下內容一起送給 AI：
  - 原始問題
  - 原始牌陣與所有原始牌
  - 原始 AI 解讀
  - 前面每次追問的問題
  - 前面每次追問的追問指引牌
  - 前面每次追問的 AI 回覆
- 歷史紀錄頁的追問也同步使用相同上下文格式。

### 追問牌名一致性

- 前端固定用實際抽出的 `drawnCard` 顯示追問牌，不相信 AI 自行輸出的牌名。
- AI 回覆中的「追問指引牌」標題與開場白會被前端清理，避免重複或錯誤顯示。
- 後端會掃描 AI 原始追問回覆，如果提到不在上下文允許清單中的塔羅牌名，會丟棄該回覆並重試一次。
- 允許清單包含：
  - 本次追問牌
  - 原始牌陣中的牌
  - 前面追問上下文中已出現的追問牌
- 如果重試後仍引用錯誤牌名，Functions 會回傳錯誤並退點，不會存入錯誤解讀。

### 開發環境一致性

- `npm run dev` 固定使用 Vite port `5175`。
- `.claude/launch.json` 改回可攜式 `npm run dev`，避免寫死本機絕對路徑。

## 已驗證項目

- `npm --prefix functions run build`
- `npm run build`
- `npm run lint`
- Firebase Hosting 已部署。
- Firebase Functions 已部署。

## 目前部署資訊

- Firebase project：`mystic-tarot-2026`
- Hosting：`https://mystic-tarot-2026.web.app`
- Functions region：`asia-east1`
- Firestore：`asia-east1`
- AI model：`gpt-4.1-mini`

## 後續可能遇到的問題

### 追問 AI 仍可能出錯

目前已用「牌名衝突偵測 + 重試 + 退點」防住明顯錯牌，但模型仍可能在不直接提牌名的情況下，用錯牌義方向寫解析。後續若要更嚴格，可以把追問解讀改成 JSON schema，例如要求回傳：

```json
{
  "usedCardName": "聖杯八",
  "usedCardId": "cups-08",
  "sections": {
    "延伸解析": "...",
    "具體行動方案": "...",
    "寄語": "..."
  }
}
```

後端只接受 `usedCardId` 等於本次追問牌的結果，再轉成 Markdown 給前端。

### 牌名衝突偵測可能誤判

大牌名稱例如「力量」「世界」「太陽」也可能是日常詞彙。現階段只有在明顯牌名語境中才判定衝突；小牌如「權杖四」「聖杯八」則直接掃描。若未來出現誤判，再把驗證改成 structured output。

### firebase-functions 版本警告

部署時會出現 `firebase-functions` outdated warning。暫時不影響部署，但未來需要安排一次套件升級與回歸測試。

### Bundle 體積警告

Vite build 會提示主 bundle 超過 500 kB。短期不影響功能；若行動網路載入變慢，可把 LIFF、Firebase、管理頁或塔羅資料做 code splitting。

### 綠界仍是測試環境

目前一次性點數包仍使用綠界測試環境設定。正式收款前必須：

- 改成正式 MerchantID / HashKey / HashIV。
- 把金流密鑰搬到 Firebase Secret。
- 用正式金流做小額全流程測試。

### 訂閱尚未完成

訂閱方案頁已有介面與 callable 入口，但定期定額實際扣款與週期發點尚未完整串接。

### 舊紀錄不會自動修復

已存入 Firestore 的舊 AI 錯誤文字不會自動改寫。前端會盡量清理顯示，但如果舊紀錄正文已經用錯牌義解析，仍需重新追問或手動清資料。

### LINE 與 Google 登入路徑要分流

LINE in-app browser 內不要走 Google OAuth。若使用者從 LINE 開站，優先使用 LIFF 登入；外部瀏覽器才使用 Google 登入。

## 不應提交的本機檔案

- `.env`
- `functions/.env`
- `dist/`
- `functions/lib/`
- `.firebase/`
- 臨時截圖或測試圖片，除非已確認是正式產品素材。
