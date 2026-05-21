# 當前任務狀態

> 最後更新：2026-05-21（i18n 接線完成）

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
- 切語系後 AI 以該語言回覆解讀 ✅

**即時匯率：**
- `exchange-rate-service.ts` — Open Exchange Rates API，localStorage 快取 1 小時
- `useExchangeRate` hook，`convert(twdAmount).display` 動態顯示
- BillingPage 價格依語系自動換算（TWD/USD/JPY）

**型別修正：**
- `Widen<T>` 擴展支援 `number` 字面量寬化

**尚未接入**：AdminPage、AuthModal（管理頁面保持中文即可）

## 已完成（2026-05-21 批次五項）

### Bundle Splitting（已部署）
- `vite.config.ts` 加入 `manualChunks` 函式
- 主 chunk 從 737KB → 26KB
- 拆分出 firebase-core (114KB)、firebase-data (244KB)、framer (132KB)、react-vendor (223KB)

### 截圖分享（已部署）
- `screenshot-service.ts` — html2canvas 截圖 + Web Share API 圖片分享 + download fallback
- `ReadingShareCard.tsx` — 截圖專用卡片元件（固定寬度、品牌元素、離屏渲染）
- ReadingPage 加入「截圖分享」按鈕
- html2canvas 200KB 獨立 chunk，動態載入

### i18n 多語系（已部署）
- `src/services/i18n/` — 語系服務，支援 zh-TW / en / ja
- Locale 檔案 lazy loading（en 2.4KB、ja 2.9KB 獨立 chunk）
- `useI18n` hook + `I18nContext` Provider
- Navbar 語系切換下拉選單
- localStorage 記憶偏好 + 瀏覽器語系自動偵測

### FCM 推播通知（已部署）
- `messaging.ts` — FCM token 請求 + Firestore 儲存 + 前景訊息監聽
- `usePushNotification.ts` — 推播 Controller hook
- `PushPrompt.tsx` — 占卜完成後引導開啟通知
- `firebase-messaging-sw.js` — 背景推播 Service Worker
- 需設定 `VITE_FIREBASE_VAPID_KEY` 環境變數才能啟用

### 管理員儀表板強化（已部署）
- `AdminDashboard.tsx` — 統計總覽元件（四大指標卡片 + 長條圖）
- 新增「統計總覽」Tab（預設頁籤）
- 用戶總數、本月新增、近 7 天活躍、全站總點數
- 近 7 天新用戶趨勢圖、登入方式分佈圖、點數分佈圖
- 純 CSS 長條圖，無需額外圖表套件

## 已完成（2026-05-21）

### 批次功能加強（已部署）
1. **分段式解讀呈現** — `InterpretationSections` 元件，將 AI Markdown 按 `##` 拆段，逐段 fade-in 動畫展開
2. **首頁牌陣標籤** — 單牌加「新手推薦」標籤、凱爾特十字加「深度解析」標籤
3. **歷史趨勢概覽** — `TrendSummary` 元件，顯示累計占卜、近 7 天、最常問主題、最常出現的牌
4. **Code Splitting** — 路由級 lazy import，主 chunk 從 861KB 降至 736KB，各頁面獨立 chunk
5. **錯誤處理改進** — 失敗時顯示「重新嘗試」按鈕
6. **Rate Limiting** — Cloud Function 端 per-user 每分鐘最多 10 次 AI 請求
7. **Analytics 事件追蹤** — `trackEvent` service，追蹤 reading_start/complete/error、follow_up_start

### AI 準確度改進完整串接（已部署）
之前做了前端收集（useQuerentSignals、querent-context model）但沒接到後端：
1. **`AIInterpretationRequest` 加入 `topic` + `querentSummary`** — 前端 + Cloud Function 雙端
2. **Cloud Function `buildUserPrompt` 注入牌的關鍵字** — 每張牌的正/逆位 keywords 加入 prompt
3. **Cloud Function `buildUserPrompt` 注入 topic + querentSummary** — 主題標籤 + 問卜者狀態摘要
4. **強化 system prompt 規則** — 緊扣具體問題、參考關鍵字、融入狀態分析、建議可執行
5. **ReadingPage 串接 useQuerentSignals** — 主題按鈕 → onTopicChange、textarea → onTypingStart、抽牌完成 → buildContext → onDrawComplete
6. **前端 prompt-builder.ts 同步更新** — 關鍵字 + topic + querentSummary（本地開發用）
- 修改檔案：`ai-provider.ts`、`functions/src/index.ts`、`useTarotSession.ts`、`ReadingPage.tsx`、`prompt-builder.ts`

### Open Graph + PWA + 清理（已部署）
1. **Open Graph meta tags** — og:title/description/image + twitter:card，分享到 LINE/FB 有預覽
2. **清理 interpretationHtml** — ReadingPage 移除多餘的 `marked.parse` useMemo
3. **PWA Service Worker** — vite-plugin-pwa + manifest.json + CacheFirst 牌圖快取（30天/200張）
   - 預快取 15 個 JS/CSS/HTML 檔案
   - 執行期快取所有 `/images/` 下的圖片
   - `registerType: 'autoUpdate'` 自動更新
   - 使用者可「加到主畫面」

### 分享結果到 LINE / 原生分享（已部署）
- `liff-service.ts` 新增 `shareToLine()` — LIFF shareTargetPicker 發送 Flex Message
- `share-service.ts` 新建 — 優先 LINE → Web Share API → 複製剪貼簿
- ReadingPage 底部加「分享結果」按鈕，附狀態提示

### LINE 內建瀏覽器自動登入時序修復（已部署）
- 問題：`tryAutoLineLogin` 和 `onAuthChanged` 是兩個獨立 effect，loading 提前結束
- 修復：合併為單一 effect，首次 auth 回呼後才執行 LINE 自動登入，完成前保持 loading

### 歷史頁分段式解讀（已部署）
- HistoryPage 改用 `InterpretationSections` 元件（animated=false），與占卜頁一致

### 扇形抽牌牌面放大
- 牌寬從 92~124px → 105~150px（放大約 20%）
- 舞台寬度上限 980→1100、扇形半徑 310~460→340~520、扇形角度 112°→115°
- 修改檔案：`src/views/animations/DrawAnimation.tsx`

### LINE 登入按鈕消失問題
- **狀態**：✅ 已修復並部署
- **現象**：從這台電腦（forst899）部署後，LINE 登入按鈕不再顯示
- **根因**：這台電腦的 `.env` 缺少 `VITE_LINE_LIFF_ID` 環境變數
  - `liff-service.ts` 的 `isLineLoginConfigured()` 檢查 `import.meta.env.VITE_LINE_LIFF_ID`
  - 變數不存在 → 回傳 `false` → `AuthModal` 不渲染 LINE 按鈕
- **修復**：在 `.env` 末尾加入 `VITE_LINE_LIFF_ID=2010137990-R4oOH7sv`
- **已部署**：`firebase deploy --only hosting` 完成，LINE 登入已恢復

### 確認 AI 準確度改進已同步
- 從家裡電腦 push 的 remote 版本已包含所有改進：
  - `src/models/querent-context.ts` — 問卜者行為訊號模型
  - `src/controllers/useQuerentSignals.ts` — 行為訊號收集 hook
  - `src/utils/prompt-builder.ts` — 關鍵字注入 + 強化系統提示
  - `functions/src/index.ts` — Cloud Function 端的提示詞改進

## 待處理

### LINE 內建瀏覽器登入時序問題
- **狀態**：部分修復，需進一步測試
- **現象**：使用者報告「先進管理員頁再跳轉到首頁就可以了」才能登入成功
- **推測**：`tryAutoLineLogin` 在 `useAuth` mount 時觸發，但 AuthModal 的 UI 狀態未即時反映登入成功
- **相關檔案**：
  - `src/controllers/useAuth.ts` — `tryAutoLineLogin` effect
  - `src/views/components/auth/AuthModal.tsx` — `wasOpen` ref 關閉邏輯

## 環境資訊

| 項目 | 值 |
|------|------|
| 專案 | mystic-tarot-2026 |
| 區域 | asia-east1 |
| 專案編號 | 599328361392 |
| LIFF ID | 2010137990-R4oOH7sv |
| LINE Channel ID | 2010137990 |
| Firebase CLI | `npx firebase-tools`（非全域安裝） |
| Dev Server | `npm run dev`（port 5175） |
| GitHub | https://github.com/lk242/TarrotApp.git |
| 家裡路徑 | `C:\Users\LK\開發\TarotApp` |
| 公司路徑 | `C:\Users\forst899\tarot-app` |

## 關鍵架構

- **MVC**：Model → Service → Controller → View
- **AI 抽象層**：`IAIProvider` 介面 + factory (`src/services/ai/`)
- **Storage 抽象層**：登入用 Firestore，匿名用 localStorage
- **LINE 登入流程**：LIFF SDK → ID/Access Token → Cloud Function → Custom Token → Firebase Auth

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `functions/src/index.ts` | Cloud Functions（signInWithLine, callClaude 等） |
| `src/services/line/liff-service.ts` | LIFF SDK 封裝 |
| `src/services/firebase/auth-service.ts` | Firebase Auth 服務 |
| `src/controllers/useAuth.ts` | Auth 狀態管理 hook |
| `src/controllers/useTarotSession.ts` | 占卜流程 Controller |
| `src/views/components/auth/AuthModal.tsx` | 登入/註冊 Modal |
| `src/views/pages/ReadingPage.tsx` | 占卜主頁面 |
| `src/models/querent-context.ts` | 問卜者行為訊號模型 |
| `src/controllers/useQuerentSignals.ts` | 行為訊號收集 hook |
| `src/utils/prompt-builder.ts` | AI 提示詞建構（含關鍵字注入） |
