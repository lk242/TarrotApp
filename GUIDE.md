# 神秘塔羅開發指南

這份文件給你在不同電腦或不同環境繼續開發時快速恢復狀態、理解架構、資料流與部署責任邊界。專案目前是私人案，決策優先順序是：能穩定部署、能快速定位問題、API key 不外洩、不同環境好重建。

最新狀態與風險請看：`docs/PROJECT_STATUS.md`。

## 快速恢復開發環境

### 1. 取得原始碼

```bash
git clone https://github.com/lk242/TarrotApp.git
cd TarotApp
```

### 2. 安裝依賴

```bash
npm install
npm install --prefix functions
```

### 3. 建立前端 `.env`

從 `.env.example` 複製一份：

```bash
cp .env.example .env
```

必要設定：

```env
VITE_AI_PROVIDER=functions
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=mystic-tarot-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mystic-tarot-2026
VITE_FIREBASE_STORAGE_BUCKET=mystic-tarot-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_LINE_LIFF_ID=2010137990-R4oOH7sv
```

正式 build 必須使用 `VITE_AI_PROVIDER=functions`。這是安全設計，避免 OpenAI key 被打包進瀏覽器，也避免繞過扣點。

### 4. 建立 Functions `.env`

檔案位置：`functions/.env`

```env
LINE_LOGIN_CHANNEL_ID=2010137990
ADMIN_EMAILS=你的管理者信箱
```

OpenAI key 不放 `.env`，正式環境使用 Firebase Secret：

```bash
firebase functions:secrets:set OPENAI_API_KEY --project mystic-tarot-2026
```

### 5. 啟動本機

```bash
npm run dev
```

預設 port 是 `5175`。若 Codex / Claude 使用 `.claude/launch.json`，也會跑同一個 `npm run dev`。

### 6. 部署前檢查

```bash
npm run lint
npm run build
npm --prefix functions run build
```

### 7. 部署

只改前端：

```bash
npx firebase-tools deploy --only hosting --project mystic-tarot-2026
```

只改 Functions：

```bash
npx firebase-tools deploy --only functions --project mystic-tarot-2026
```

前後端都改：

```bash
npx firebase-tools deploy --only functions,hosting --project mystic-tarot-2026
```

Firestore rules 有改才加：

```bash
npx firebase-tools deploy --only firestore:rules --project mystic-tarot-2026
```

## 開發工作流

1. 先 `git pull --rebase` 同步 GitHub。
2. 開新功能前看 `docs/PROJECT_STATUS.md`，確認目前已知風險。
3. 改前端時先跑 `npm run lint` 與 `npm run build`。
4. 改 Functions 時先跑 `npm --prefix functions run build`。
5. AI、扣點、付款、登入相關改動要部署到測試或正式站後用真實帳號驗證。
6. commit 使用 Conventional Commits，繁中描述。
7. push 前確認 `git status` 不含 `.env`、`dist/`、臨時截圖。

常用 commit 格式：

```text
fix(ai): 修正追問牌名一致性驗證
docs(project): 更新私人開發手冊與狀態紀錄
```

## 目前核心運作模式

### 使用者登入

- 外部瀏覽器：Google / Email Firebase Auth。
- LINE 內建瀏覽器：LIFF 登入，後端 `signInWithLine` 換 Firebase custom token。
- 避免在 LINE in-app browser 直接使用 Google OAuth，否則會遇到 `disallowed_useragent`。

### 占卜與扣點

```text
ReadingPage
  -> useTarotSession
  -> performReading 固定抽牌結果
  -> DrawAnimation 顯示抽牌動畫
  -> FunctionsProvider 呼叫 generateTarotReading
  -> Firebase Function 驗證登入、扣 5 點
  -> OpenAI 生成解讀
  -> 成功：回傳解讀並儲存紀錄
  -> 失敗：退還 5 點
```

### 追問

追問不只是單獨問一句。前端會把完整上下文交給 Functions：

- 原始問題
- 原始牌陣
- 原始抽牌
- 原始 AI 解讀
- 前面所有追問問題
- 前面所有追問指引牌
- 前面所有追問回覆
- 本次新抽出的追問指引牌

後端 `followUpReading` 會：

1. 扣 5 點。
2. 建立追問 prompt。
3. 呼叫 OpenAI。
4. 掃描回覆是否提到不在上下文允許清單內的塔羅牌名。
5. 若提錯牌，丟棄並重試一次。
6. 若仍錯，回傳錯誤並退點。
7. 若正確，清理不必要標題後回傳前端。

前端顯示追問牌時永遠使用實際抽出的 `drawnCard`，不相信 AI 自行宣告的牌名。

## 分層原則

### Model：`src/models/`

只放純 TypeScript 型別。

- `tarot-card.ts`：牌卡與抽牌結果型別
- `spread.ts`：牌陣定義
- `reading.ts`：占卜紀錄
- `user.ts`：使用者型別
- `credits.ts`：點數常數、點數包、訂閱方案與交易型別

規則：Model 不 import React、Firebase、browser API。

### Service：`src/services/`

負責外部服務與業務邏輯，View 不直接呼叫這層之外的 SDK。

AI：

- `ai-provider.ts`：所有 AI provider 的共同介面
- `ai-factory.ts`：依 `VITE_AI_PROVIDER` 建立 provider
- `functions-provider.ts`：正式環境 provider，呼叫 Firebase Functions
- `openai-provider.ts`：前端直呼 OpenAI，僅本機開發使用
- `claude-provider.ts`：前端直呼 Claude，僅本機開發使用
- `mock-provider.ts`：無 key 測 UI 用

Firebase：

- `config.ts`：初始化 app、auth、db、functions、googleProvider
- `auth-service.ts`：Google / Email 登入登出函式

Credits：

- `credits/credit-service.ts`：點數 callable function 與 Firestore user document 即時訂閱
- 只呼叫 Functions 或訂閱 Firestore，不在前端計算可信任餘額
- 購買點數包會取得綠界 checkout 表單欄位，前端用 POST 導轉付款頁
- 訂閱目前只保留 checkout 串接點，不在付款前發放點數

Storage：

- `storage-provider.ts`：儲存 provider 介面
- `local-storage-provider.ts`：匿名使用者紀錄
- `firestore-provider.ts`：登入使用者紀錄
- `storage-factory.ts`：依 user.uid 切換 provider

### Controller：`src/controllers/`

把 Service 包裝成 React hook。

- `useAuth.ts`：全站登入狀態、登入登出 callback、錯誤狀態
- `useCredits.ts`：登入使用者點數狀態、餘額即時更新、手動 refresh
- `useTarotSession.ts`：占卜流程狀態機、AI 解讀、追問、紀錄儲存

Controller 可以使用 React hooks，但不回傳 JSX。

### View：`src/views/`

只負責畫面與使用者互動。

- `pages/`：頁面
- `components/`：共用 UI
- `animations/`：洗牌、切牌、抽牌動畫

View 不直接 import Firebase SDK、OpenAI SDK、localStorage provider。

## 占卜流程

1. 使用者在 `ReadingPage` 選主題或輸入問題
2. `useTarotSession.startReading()` 呼叫 `performReading()`
3. 抽牌結果先固定到 `drawnCardsRef`
4. UI 依序顯示：
   - `shuffling`
   - `cutting`
   - `drawing`
   - `interpreting`
   - `complete`
5. `onDrawComplete()` 建立 `AIInterpretationRequest`
6. `getConfiguredProvider()` 建立 AI provider
7. 正式環境呼叫 `FunctionsProvider`
8. Firebase Function 驗證登入並扣 5 點
9. Firebase Function 呼叫 OpenAI
10. OpenAI 成功後前端顯示 Markdown 解讀
11. OpenAI 失敗時 Function 自動退還 5 點
12. `getStorageProvider(user?.uid)` 儲存紀錄

## AI Provider 分工

正式站：

```text
ReadingPage
  -> useTarotSession
  -> getConfiguredProvider()
  -> FunctionsProvider
  -> Firebase Callable Function
  -> OpenAI API
```

Production 必須使用：

```env
VITE_AI_PROVIDER=functions
```

不要在正式環境使用：

```env
VITE_AI_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
```

因為 Vite 會把 `VITE_*` 打包進公開 JS。

## Firebase Functions

位置：`functions/src/index.ts`

Functions：

- `generateTarotReading`
- `followUpReading`
- `getCreditBalance`
- `createCreditPurchase`
- `createSubscription`
- `ecpayNotify`

Secret：

- `OPENAI_API_KEY`

設定 secret：

```bash
firebase functions:secrets:set OPENAI_API_KEY --project mystic-tarot-2026
```

部署：

```bash
firebase deploy --only firestore:rules,functions,hosting --project mystic-tarot-2026 --force
```

`firebase.json` 有 predeploy：

```text
npm --prefix "$RESOURCE_DIR" run build
```

所以部署前會自動編譯 `functions/src` 到 `functions/lib`。

### 綠界 ECPay

目前一次性點數包已接綠界測試環境。

```text
BillingPage
  -> createCreditPurchase callable
  -> paymentOrders/{orderId} pending
  -> 前端 POST 表單導轉綠界測試付款頁
  -> 綠界 ReturnURL 呼叫 ecpayNotify
  -> 驗證 CheckMacValue / 金額 / 訂單狀態
  -> transaction 入點並寫 creditTransactions
```

重要規則：

- `ReturnURL` 是後端 webhook，收到付款結果後必須回覆 `1|OK`
- `ClientBackURL` 只負責讓使用者回到網站，不可用來入點
- `OrderResultURL` 是前端付款結果，不可作為付款成功依據
- 綠界測試後台「模擬付款」會帶 `SimulatePaid=1`，目前只記錄通知，不會入點
- webhook 重送時若訂單已是 `paid`，transaction 會直接跳過，避免重複入點
- 正式上線前需將官方測試 MerchantID / HashKey / HashIV 改為正式資料，並改用 Firebase Secret

## Auth、Storage 與 Credits

登入狀態由 `useAuthState()` 訂閱 Firebase Auth。

儲存策略：

- `user.uid` 存在：`FirestoreProvider`
- `user.uid` 不存在：`LocalStorageProvider`

Firestore 路徑：

```text
users/{userId}/readings/{readingId}
```

這個路徑與 Firestore rules 對齊，避免使用者讀寫別人的紀錄。

點數路徑：

```text
users/{userId}
users/{userId}/creditTransactions/{transactionId}
paymentOrders/{orderId}
```

點數規則：

- `users/{userId}` 可由本人讀取，但不能由前端建立、修改或刪除
- `creditTransactions` 可由本人讀取，不能由前端寫入
- `paymentOrders` 可由本人讀取，不能由前端寫入
- 100 點新會員贈點、每次扣 5 點、失敗退款都在 Functions transaction 內完成
- 任何真實付費點數都必須等金流 webhook 驗證成功後，由 Admin SDK 寫入

## 付費方案與定價

每次全新占卜或追問都扣 `QUESTION_CREDIT_COST = 5` 點。

點數包：

- 入門補充包：500 點 / NT$99，約 100 次提問
- 標準靈感包：1200 點 / NT$199，約 240 次提問
- 深度探索包：3000 點 / NT$399，約 600 次提問

月訂閱：

- 月光方案：1000 點 / NT$149，約 200 次提問
- 星辰方案：2500 點 / NT$299，約 500 次提問
- 神諭方案：6000 點 / NT$599，約 1200 次提問

以 OpenAI `gpt-4.1-mini` 官方價格 input US$0.40 / 1M tokens、output US$1.60 / 1M tokens 估算，1 USD 約 NT$32 時，單次 AI 成本約 NT$0.15 至 NT$0.25。主推 NT$199 點數包與 NT$299 月訂閱，可保留較穩定毛利來覆蓋 Firebase、付款手續費與客服成本。

一次性點數包金流接法：

1. `createCreditPurchase` 建立 pending order，回傳綠界 checkout action 與 hidden fields
2. 前端動態建立 form，以 POST 導轉到綠界
3. 綠界 `ReturnURL` 呼叫 `ecpayNotify`
4. `ecpayNotify` 驗證 CheckMacValue、金額與付款狀態
5. Admin SDK 在 transaction 中增加點數、寫入 `creditTransactions`

訂閱金流接法：

1. `createSubscription` 建立定期定額付款 session
2. 綠界定期定額付款結果通知 webhook 驗證簽章與付款狀態
3. 記錄訂閱方案、狀態與續扣週期
4. Admin SDK 在 transaction 中增加點數、寫入 `creditTransactions`
5. 訂閱方案另需記錄 `subscriptionTier`、`subscriptionStatus` 與下次發點時間

## UI 與動畫注意事項

- `DrawAnimation` 桌面版使用扇形攤牌
- `DrawAnimation` 手機版使用向上滑動抽牌
- Tailwind v4 responsive utilities 在部分 WebView 不穩，某些響應式判斷使用 `window.innerWidth`
- Framer Motion + React StrictMode 下，避免在 AnimatePresence exit 中依賴巢狀 motion opacity 動畫
- `CardFace` 逆位只旋轉圖片，不旋轉牌名與牌位

## 部署前檢查

```bash
npm run lint
npm run build
npm --prefix functions run build
```

檢查公開 bundle 不含 OpenAI key：

```powershell
$content = Get-Content -Path .\dist\assets\*.js -Raw
$content.Contains('sk-')
```

應回傳 `False`。

## 常見問題

### Google 登入錯誤

檢查 Firebase Authentication authorized domains：

- `localhost`
- `mystic-tarot-2026.web.app`
- `mystic-tarot-2026.firebaseapp.com`

也要確認 Google OAuth consent screen 已設定測試使用者。

### AI 沒回應

檢查：

- `VITE_AI_PROVIDER=functions`
- `OPENAI_API_KEY` secret 已設定
- `generateTarotReading` 已部署在 `asia-east1`
- Firebase 專案是 Blaze

### 紀錄沒有同步

檢查：

- 使用者是否已登入
- Firestore rules 是否允許 `request.auth.uid == userId`
- `storage-factory.ts` 是否收到正確 `user.uid`
