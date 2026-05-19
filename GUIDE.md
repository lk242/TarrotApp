# 神秘塔羅開發指南

這份文件給後續接手者快速理解架構、資料流與部署責任邊界。

## 分層原則

### Model：`src/models/`

只放純 TypeScript 型別。

- `tarot-card.ts`：牌卡與抽牌結果型別
- `spread.ts`：牌陣定義
- `reading.ts`：占卜紀錄
- `user.ts`：使用者型別

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

Storage：

- `storage-provider.ts`：儲存 provider 介面
- `local-storage-provider.ts`：匿名使用者紀錄
- `firestore-provider.ts`：登入使用者紀錄
- `storage-factory.ts`：依 user.uid 切換 provider

### Controller：`src/controllers/`

把 Service 包裝成 React hook。

- `useAuth.ts`：全站登入狀態、登入登出 callback、錯誤狀態
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
8. Firebase Function 呼叫 OpenAI
9. 前端顯示 Markdown 解讀
10. `getStorageProvider(user?.uid)` 儲存紀錄

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

Secret：

- `OPENAI_API_KEY`

設定 secret：

```bash
firebase functions:secrets:set OPENAI_API_KEY --project mystic-tarot-2026
```

部署：

```bash
firebase deploy --only functions,hosting --project mystic-tarot-2026 --force
```

`firebase.json` 有 predeploy：

```text
npm --prefix "$RESOURCE_DIR" run build
```

所以部署前會自動編譯 `functions/src` 到 `functions/lib`。

## Auth 與 Storage

登入狀態由 `useAuthState()` 訂閱 Firebase Auth。

儲存策略：

- `user.uid` 存在：`FirestoreProvider`
- `user.uid` 不存在：`LocalStorageProvider`

Firestore 路徑：

```text
users/{userId}/readings/{readingId}
```

這個路徑與 Firestore rules 對齊，避免使用者讀寫別人的紀錄。

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
