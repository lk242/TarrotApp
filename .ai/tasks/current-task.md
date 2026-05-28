# 當前任務狀態

> 最後更新：2026-05-27（追問串流化 + 歷史紀錄追問修復 + 建議方向）

## 已完成（2026-05-22）

### 串流回應（Streaming SSE）
- 新增 `streamTarotReading` Cloud Function（`onRequest` + SSE + `invoker: 'public'`）
- OpenAI API 加上 `stream: true`，逐 chunk 透過 SSE 傳到前端
- 前端 `FunctionsProvider.interpretStream()` 用 `fetch` + `ReadableStream` 接收
- `IAIProvider` 介面新增 `interpretStream?()` 方法（向下相容）
- `useTarotSession` 用 `isStreaming` state 控制（不切換 phase，避免 DOM 卸載閃爍）：
  - 串流開始 → `complete` phase + `isStreaming=true`（單卡渲染 markdown + 游標）
  - 串流結束 → `isStreaming=false`（同一 DOM 無縫切換到 InterpretationSections）
- Firestore 存檔改為背景執行（不 await），消除結尾卡頓
- `ReadingPage` complete phase 根據 `isStreaming` 切換渲染方式
- 串流進行中隱藏：建議追問、自由追問輸入、底部操作列（再占一次/分享/截圖/歷史/推播）
- 串流節流：每 80ms 批次更新 UI（從 ~40次/秒降到 ~12次/秒），減少 marked.parse 開銷

### AI 模型切換：GPT-5.4 → GPT-4o
- GPT-4o 共感力和對話自然度更好，更適合塔羅占卜場景
- 成本更低：$10/1M output（vs GPT-5.4 $15/1M），每次占卜 ~NT$1.1
- 速度更快（token/s 較高）
- `max_completion_tokens` 相容 GPT-4o，無需改其他參數
- ✅ 已部署上線

### buildUserPrompt 多語系化
- 修正：英文/日文占卜時，位置名稱和牌名仍顯示中文的 bug
- `buildUserPrompt` 全面 i18n：位置名稱、牌名、正逆位、牌陣名、位置參考、情境文字
- 英文：`Position "Present": The Hanged Man — Upright`
- 日文：`ポジション「現状」：吊るされた男（The Hanged Man）— 正位置`
- 前端 `prompt-builder.ts` 和 Cloud Functions 同步更新
- ✅ 已部署上線
- 原始 `generateTarotReading` callable 保留作為 fallback
- Cloud Run URL：`https://streamtarotreading-hoqm6svvza-de.a.run.app`
- 認證透過 `verifyAuthToken()` 在程式碼層驗證 Firebase ID Token
- ✅ 已部署上線

### Prompt 心理學＋口語化風格大改版（v2）
- 角色從「三代占卜師」改為「用塔羅牌當工具的心理師朋友」
- 融入榮格原型理論、依附理論、認知行為框架（白話解釋，不掉書袋）
- 口語化語氣：中文「嗯」「其實」、日文「うーん」「実は」、英文 "Look," "honestly,"
- 解讀結構統一為：
  - 🃏 第一印象（直覺反應，朋友聊天口吻）
  - 逐牌解析：牌面故事 → 心理解讀 → 對你說的話
  - 🔮 故事線（心理劇本分析，意識 vs 潛意識）
  - 💡 行動方案（超具體，今天就能做）
  - ⚠️ 盲點提醒（防衛機制、認知盲區）
  - ✨ 最後一句話（溫暖有力量，想截圖收藏）
- 前端 `prompt-builder.ts` 三語系全部更新
- Cloud Functions `buildSystemPrompt` 三語系全部同步更新
- User prompt 加入情境敘述：「問卜者走進占卜室...」
- 回應長度 500-800 字
- ✅ 已部署上線（2026-05-22 hosting + functions deploy complete）
- fix: GPT-5.4 不支援 `max_tokens`，改為 `max_completion_tokens`（已修復並重新部署）
- fix: maxTokens 不足導致回應截斷亂碼 — 主占卜 1800→3500、追問 1000→2000（已部署）

### 定價混合調整（毛利 73-76%）
- 售價小幅上調 + 點數適度下降，全方案毛利穩定在 73-76%
- 點數包：入門 NT$129/400點、標準 NT$269/880點、深度 NT$529/1750點
- 訂閱：月光 NT$199/600點、星辰 NT$399/1280點、神諭 NT$749/2550點
- 贈點僅標準以上方案有，入門/月光無贈點
- Cloud Functions CREDIT_PACKAGES / SUBSCRIPTION_PLANS 同步更新
- ✅ 已部署上線

### AI 模型升級 + 定價改版
- Cloud Functions 模型：`gpt-4.1-mini` → `gpt-5.4` → **`gpt-4o`**（最終選擇）
- `QUESTION_CREDIT_COST` 從 5 改為 20（前端 + Cloud Functions 同步）
- `WELCOME_CREDITS` 從 100 改為 200（新用戶可占卜 10 次）
- 點數包/訂閱方案新增 `bonusCredits` 欄位（階梯式贈點）：
  - 入門 +50 (10%)、標準 +200 (17%)、深度 +800 (27%)
  - 月光 +100 (10%)、星辰 +400 (16%)、神諭 +1500 (25%)
- BillingPage 顯示贈點 badge（✦ 再贈 X 點）
- 三語系 locale 新增 `bonusTag` key、更新方案描述次數

### 價格顯示美化
- `exchange-rate-service.ts` 新增 `friendlyPrice` 函式
- USD：一律 `x.99` 結尾（如 $4.99、$9.99、$19.99）
- JPY：取整到 500 倍數（如 ¥1000、¥1500、¥2500）— ceil 無條件進位
- 加入 PPP 購買力調整倍率：USD ×1.6、JPY ×1.3（避免純匯率換算導致海外區定價過低）
- 倍率常數在 `PPP_MULTIPLIER` 可隨時微調

### 跨語系歷史紀錄
- `Reading` model 新增 `locale?: 'zh-TW' | 'en' | 'ja'` 欄位
- `useTarotSession` 儲存時記錄 `locale: lang`
- HistoryPage 新增語系過濾：
  - 預設僅顯示當前語系紀錄
  - toggle 按鈕切換「顯示全部 / 僅當前語系」
  - 外語紀錄顯示紫色語系標籤（中文/EN/日本語）
  - 日期格式化改用當前 UI 語系
- 三語系 locale 新增 `showAllLangs`、`showCurrentLang`、`langLabel` key
- 舊紀錄（無 locale 欄位）視為 `zh-TW`

### 多專案架構規劃（設計階段）
- 建議方向：Monorepo + shared-core package（auth、credits、i18n、ui）
- 點數共用：統一 creditProfile，新增 source 欄位區分消費來源
- 會員升級：平台級 SubscriptionTier，不同等級解鎖不同產品
- 遷移路徑：Phase 1 抽出 shared-core → Phase 2 新專案引用 → Phase 3 原 app 遷入

## 已完成（2026-05-21 i18n 完整多語系支援）

### i18n 翻譯接入所有頁面 + 動畫 + AI 解讀（已部署）

**頁面層級：**
- Navbar、HomePage、ReadingPage、HistoryPage、BillingPage、AboutPage 全部 i18n 化
- 牌陣標題/描述 `t.spreads[key]`、主題預設問題 `t.topicPrompts[key]`
- 方案名稱/描述 `t.billing.packages[id]`、`t.billing.subscriptions[id]`

**動畫文字：**
- ShuffleAnimation — 5 個階段文字 `t.reading.shuffle*`
- CutAnimation — 切牌中/完成 `t.reading.cut*`
- DrawAnimation — 桌面/手機版選牌提示 `t.reading.draw*`

**牌面位置標籤：**
- 新增 `t.positions`（single/threeCard/celticCross 各自位置名稱）
- CardFace 新增 `positionLabel` prop 覆蓋原始中文
- 逆位標籤從硬編碼改為 `t.reading.reversed`

**AI 解讀多語系：**
- `AIInterpretationRequest.locale` 擴展為 `'zh-TW' | 'en' | 'ja'`
- `useTarotSession` / `useHistoryReadings` 傳入當前 `lang`
- 前端 `prompt-builder.ts` 新增英文/日文完整系統提示詞
- Cloud Functions `buildSystemPrompt` 新增英文/日文完整版

**即時匯率：**
- `exchange-rate-service.ts` — Open Exchange Rates API，localStorage 快取 1 小時
- `useExchangeRate` hook，`convert(twdAmount).display` 動態顯示
- BillingPage 價格依語系自動換算（TWD/USD/JPY）

## 已完成（2026-05-27）

### 追問串流化（Streaming SSE）
- 新增 `streamFollowUpReading` Cloud Function（`onRequest` + SSE + `invoker: 'public'`）
- 與 `streamTarotReading` 相同的 SSE 模式，使用追問專用 prompt + 卡牌名稱驗證
- 卡牌名稱衝突時自動重試：發送 `{ retry: true }` 事件，前端清空累積文字後接收第二次串流
- `IAIProvider` 介面新增 `followUpStream?()` 方法
- `FunctionsProvider` 新增 `followUpStream()` 實作，處理 SSE + retry 事件
- `useTarotSession.askFollowUp` 優先使用 `followUpStream`，保留 `followUp` 作為 fallback
- 串流期間即時更新 `followUps` state，追問回覆逐字出現（80ms 節流）
- 移除未使用的 `buildFollowUpHeading` 函式（修正 lint 警告）
- Endpoint URL：`https://asia-east1-mystic-tarot-2026.cloudfunctions.net/streamFollowUpReading`
- ✅ 已部署上線（2026-05-27 functions + hosting deploy complete）

### 歷史紀錄追問修復 + 串流化
- **Bug 修復**：`useHistoryReadings.askFollowUp` 中 `storage.updateReading` 是 `await` 的，若寫入失敗會阻止 `setReadings` UI 更新 → 改為先更新 UI，storage 放背景
- `useHistoryReadings` 也加入 `followUpStream` 串流支援，與正常占卜流程一致
- 新增 `isStreaming` state 供 UI 顯示串流狀態
- ✅ 已部署上線（2026-05-27 hosting deploy complete）

### 歷史紀錄頁建議方向按鈕
- `useHistoryReadings` 新增 `suggestedQuestions` state，追問完成後從 AI 回應取得
- `HistoryCard` 追問區塊上方顯示建議方向按鈕（與正常流程 ReadingPage 一致）
- 點擊建議按鈕可直接發起追問
- ✅ 已部署上線（2026-05-27 hosting deploy complete）

### 建議方向持久化儲存
- `Reading` model 新增 `suggestedQuestions?: string[]` 欄位
- `FollowUpEntry` model 新增 `suggestedQuestions?: string[]` 欄位
- `useTarotSession`：初次占卜存檔時一併寫入 `suggestedQuestions`；追問也存入 FollowUpEntry
- `useHistoryReadings`：追問完成後把 `suggestedQuestions` 寫入 reading + followUpEntry
- `HistoryPage`：優先用 controller 最新狀態，否則讀 `reading.suggestedQuestions` 已儲存值
- 舊紀錄無此欄位不影響（向下相容），新占卜 / 新追問會自動存入
- ✅ 已部署上線（2026-05-27 hosting deploy complete）

## 已完成（2026-05-26）

### 追問牌名不一致根因修復
- **根本原因**：`assertFollowUpRequest()` 回傳時漏掉 `followUpCard`，導致 AI 完全不知道追問指引牌是哪張
- 修復：`assertFollowUpRequest` 加回 `followUpCard: request.followUpCard ?? undefined`
- 追問模型維持 `gpt-4o-mini`（追問僅 5 點，成本需控制；根因是 followUpCard 遺失，不是模型問題）
- 新增 `buildFollowUpPrompts()` 函式，追問 prompt 三語系化（zh-TW / en / ja）
- System prompt 加入「絕對規則」明確約束牌名：AI 必須以指定的追問指引牌為核心
- `collectAllowedCardNames` 同時收集中英文牌名，提升衝突偵測覆蓋率
- ✅ 已部署上線（2026-05-26 followUpReading deploy complete）

### 綠界正式環境切換
- Checkout URL：`payment-stage` → `payment.ecpay.com.tw`
- MerchantID：`3002607`（測試）→ `3501280`（正式）
- HashKey / HashIV 從程式碼硬編碼改為 `defineSecret()` + Firebase Secret Manager
- ✅ 已部署上線

### 手機抽牌牌堆視覺 + 歷史頁 i18n
- 手機抽牌牌堆數量隨抽取減少（`Math.min(remaining - 1, 2)`）
- 硬編碼中文改 i18n：`drawMobileSwipeNth`、`drawMobileTapFallback`、`drawMobileAllDrawn`
- 歷史頁牌陣 badge 改用 `t.spreads[key].name`
- ✅ 已部署上線

## 已完成（2026-05-22 UI 修正批次）

### 手機抽牌牌堆視覺隨抽取減少
- `MobileSwipeDraw` 底層牌堆數量改為 `Math.min(remaining - 1, 2)`
- 三牌占卜：3 層 → 2 層 → 1 張；凱爾特十字：滿 3 層逐漸減少
- 硬編碼中文改 i18n：`drawMobileSwipeNth`、`drawMobileTapFallback`、`drawMobileAllDrawn`
- 三語系 locale 新增對應 key

### 歷史頁牌陣名稱 i18n
- `HistoryPage` badge 從 `spread?.name`（永遠中文）改為 `t.spreads[key].name`
- 英文顯示 "Celtic Cross"、日文顯示 "ケルト十字" 等

### 「再占一次」按鈕風格統一
- 原本紫色漸層實心底 + 白字，與旁邊邊框按鈕風格不搭
- 改為金色邊框 + 半透明底，三個按鈕統一邊框風格

### 綠界正式環境切換
- Checkout URL：`payment-stage` → `payment.ecpay.com.tw`
- MerchantID：`3002607`（測試）→ `3501280`（正式）
- HashKey / HashIV 從程式碼硬編碼改為 `defineSecret()` + Firebase Secret Manager
- `createCreditPurchase` 和 `ecpayNotify` 加上 `secrets: [ecpayHashKey, ecpayHashIV]`
- Secrets 已透過 `firebase-tools functions:secrets:set` 寫入
- ✅ 已部署上線（2026-05-22 hosting + functions deploy complete）

### 瑪雅網站全站視覺升級
- 新增 `CosmicProgress` 載入元件（星塵動畫 + 進度條）
- CSS 新增 float / shimmer / glow-pulse / fade-in 動畫 keyframes
- 所有頁面加入 Framer Motion stagger / spring 入場動畫
- SealCard hover 旋轉圖騰 + 發光脈衝效果
- GalacticSignatureView 十字佈局 CSS 連線 + Kin 數字發光
- Navbar 活動連結發光底線 + logo hover 效果
- 卡片 hover 漸層邊框 + 光暈效果
- 涵蓋：HomePage、DailyPage、ComboPage、AboutPage、BillingPage、Navbar、SealCard、GalacticSignatureView
- ✅ 已部署上線（2026-05-27 stellar-maya-2026.web.app）

## 已完成（2026-05-28）

### 追問遮罩 Bug 修復 + 純對話模式
- **Bug 修復**：追問時全螢幕 loading 遮罩遮住串流文字 → 遮罩條件從 `phase === 'interpreting' || isFollowingUp` 改為僅 `phase === 'interpreting'`，追問用 inline loading dots
- **純對話模式（chat mode）**：追問區新增「抽牌追問 / 心靈對話」模式切換
  - `FollowUpEntry.drawnCard` 改為 optional（reading.ts）
  - `AIFollowUpRequest.followUpCard` 改為 optional（ai-provider.ts）
  - `useTarotSession.askFollowUp` 新增 `withCard` 參數，`false` 時跳過抽牌
  - `buildFollowUpContext` 和 `collectUsedCardIds`（useTarotSession.ts / useHistoryReadings.ts）支援 optional drawnCard
  - ReadingPage 新增 `followUpMode` state + toggle UI（pill 按鈕切換）
  - 建議追問按鈕和自由輸入都依據模式傳 `withCard` 參數
  - 三語系 i18n 新增 7 個 key：modeCard / modeChat / modeCardHint / modeChatHint / chatPlaceholder / chatButton
  - HistoryPage 已有 optional guard，不需修改
  - 後端 Cloud Functions 已原生支援 optional followUpCard
- ✅ build 通過，待部署

## 待處理

### LINE 內建瀏覽器登入時序問題
- **狀態**：部分修復，需進一步測試
- **現象**：使用者報告「先進管理員頁再跳轉到首頁就可以了」才能登入成功
- **相關檔案**：`src/controllers/useAuth.ts`、`src/views/components/auth/AuthModal.tsx`

### 多專案整併（Phase 1）
- 待使用者確認後開始抽出 shared-core
- 優先順序：auth → credits → i18n → ui

## 環境資訊

| 項目 | 值 |
|------|------|
| 專案 | mystic-tarot-2026 |
| 區域 | asia-east1 |
| LIFF ID | 2010137990-R4oOH7sv |
| Firebase CLI | `npx firebase-tools`（非全域安裝） |
| Dev Server | `npm run dev`（port 5175） |
| GitHub | https://github.com/lk242/TarrotApp.git |
| 公司路徑 | `C:\Users\forst899\tarot-app` |

## 關鍵架構

- **MVC**：Model → Service → Controller → View
- **AI 抽象層**：`IAIProvider` 介面 + factory (`src/services/ai/`)
- **Storage 抽象層**：登入用 Firestore，匿名用 localStorage
- **匯率服務**：`exchange-rate-service.ts` + `useExchangeRate` hook
- **LINE 登入流程**：LIFF SDK → ID/Access Token → Cloud Function → Custom Token → Firebase Auth
