# 當前任務

## 專案位置
`C:\Users\forst899\tarot-app`
GitHub: https://github.com/lk242/TarrotApp.git

## 目標
完成 Firebase 設定 + OAuth consent screen 認證

## 當前狀態
- Firebase 專案已建立：`mystic-tarot-2026`
- Firebase Hosting 已部署：`https://mystic-tarot-2026.web.app`
- Firebase Auth 已啟用：電子郵件/密碼 + Google 登入
- Cloud Firestore 已建立：`asia-east1 (Taiwan)`，安全規則已發布
- OpenAI API 已接入並運作正常（gpt-4.1-mini）
- 所有程式碼已完成，待最後設定

## 下一步（優先順序）

### 1. Google OAuth Consent Screen 設定
- 目前 Google 登入會顯示「未驗證應用程式」警告
- 2026-05-19 部署後在 Chrome 自動化測試 Google 登入顯示 `Firebase: Error (auth/network-request-failed).`
- 需確認 Firebase Auth 授權網域包含 `mystic-tarot-2026.web.app`、`mystic-tarot-2026.firebaseapp.com`、`localhost`
- 需要到 Google Cloud Console → APIs & Services → OAuth consent screen 設定
- 設定應用程式名稱、支援信箱、隱私權政策等
- 開發階段先用「測試」模式，加入測試用戶即可
- 正式上線再申請驗證（需要隱私權政策頁面 + 使用條款）

### 2. 新增 localhost 到 Firebase 授權網域
- Firebase Console → Authentication → 設定 → 授權網域
- 確認 `localhost` 已加入（通常預設有）

### 3. 重啟 Dev Server 測試
- `.env` 已有 Firebase config，需重啟 dev server 讓 Vite 讀取新環境變數
- 測試：Email 註冊/登入、Google 登入、占卜紀錄存取 Firestore

### 4. 上線前待辦
- [ ] AI API key 改成後端 proxy（Firebase Functions），不能把 key 放前端
- [ ] Firestore 安全規則從測試模式改為正式規則（已設定用戶隔離規則）
- [ ] Google OAuth 正式驗證申請

## Firebase 專案資訊
| 項目 | 值 |
|------|------|
| Project ID | `mystic-tarot-2026` |
| App ID | `1:599328361392:web:cb1b9f7fb7dade505f6475` |
| Auth Domain | `mystic-tarot-2026.firebaseapp.com` |
| Storage Bucket | `mystic-tarot-2026.firebasestorage.app` |
| Firestore 位置 | `asia-east1 (Taiwan)` |
| Auth 供應商 | Email/Password + Google |
| 支援信箱 | `lukewolf899@gmail.com` |
| 公開名稱 | `Mystic Tarot` |

## Firestore 安全規則（已發布）
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/readings/{readingId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## 已完成（Phase 1）
- [x] Vite + React 19 + TypeScript + Tailwind CSS v4
- [x] 78 張塔羅牌完整資料定義（大阿爾克那 22 + 小阿爾克那 56）
- [x] MVC 架構（Model / Service / Controller / View）
- [x] IAIProvider 抽象層 + MockProvider + ClaudeProvider + 工廠模式
- [x] IStorageProvider 抽象層 + LocalStorageProvider
- [x] tarot-engine（洗牌 Fisher-Yates / 切牌 / 抽牌 / 正逆位）
- [x] 4 頁路由（首頁 / 占卜 / 紀錄 / 關於）
- [x] 響應式 Navbar（漢堡選單）
- [x] Canvas 粒子背景動畫
- [x] marked 渲染 Markdown 解讀結果

## 已完成（Phase 2）
- [x] CardBack — SVG 精美牌背（八角星 + 金色邊框 + 角落裝飾）
- [x] ShuffleAnimation — 牌堆浮現 → 分離左右 → riffle 18 張牌交錯飄落 + 金色光環 → 收攏 → 淡出
- [x] CutAnimation — 牌堆分兩半 → 交換位置動畫
- [x] DrawAnimation — 互動式抽牌（點擊牌堆 → 飛出 + 3D CSS 翻牌揭示）
- [x] useTarotSession 重構 — useRef 解決 stale closure，回呼式流程銜接
- [x] ReadingPage 全面改版 — CSS animate-fade-in/fade-in-up 切換各動畫階段

## 已完成（Phase 4：AI 接入）
- [x] ClaudeProvider 實作（claude-haiku-4-5 模型，前端直呼模式）
- [x] OpenAIProvider 實作（gpt-4.1-mini 模型，Bearer token 認證）
- [x] ai-factory.ts 整合 Claude + OpenAI + Mock，getConfiguredProvider() 環境變數切換
- [x] useTarotSession 改用 getConfiguredProvider() 替代寫死 mock
- [x] prompt-builder.ts（系統提示詞 + 使用者提示詞）
- [x] OpenAI API key 已設定，AI 解讀正常運作

## 已完成（Phase 5：UX 改善）
- [x] LocalStorageProvider 實作（自動存取最新 50 筆占卜紀錄）
- [x] useTarotSession 占卜完成自動 saveReading()
- [x] HistoryPage 改寫（紀錄清單 + 展開牌面/解讀 + 刪除功能）
- [x] ReadingPage 解讀排版優化（問題回顯、裝飾分隔線、結構化 CSS）
- [x] interpretation-panel CSS 增強（blockquote、list、em 主題樣式）
- [x] prompt-builder 結構化提示詞（逐張解析→綜合解讀→具體建議→箴言）
- [x] 提問頁面 8 個主題選擇圖卡（愛情/事業/財運/整體運勢/身心靈/人際/學業/自由提問）

## 已完成（Phase 6：互動體驗升級）
- [x] DrawAnimation 滑動抽牌（pointer drag 向上滑動 + 進度環 + 金色粒子爆發特效）
- [x] CelticCrossLayout 凱爾特十字正統牌陣排列（CSS Grid，中心交叉疊放）
- [x] prompt-builder 大幅強化（結構化 6 段格式、800+ 字要求、逆位特別解析）
- [x] max_tokens 1500→3000，解讀內容更豐富
- [x] AI 追問功能（followUp API + 建議追問按鈕 + 自由追問輸入框）
- [x] OpenAIProvider.followUp() 方法（帶原始牌陣上下文的深入解讀）
- [x] 追問對話式 UI（對話氣泡 + 自動滾動 + 載入動畫）
- [x] CardFace 放大（w-32→w-44）+ 文字字級全面提升（最小 12px）
- [x] 抽牌動畫牌尺寸 90×142→120×192
- [x] 解讀面板段落/列表統一 font-size: 1rem
- [x] HistoryPage 刪除按鈕移到摘要列（垃圾桶 SVG icon）
- [x] DrawAnimation 改為扇形攤牌選牌（桌面弧形扇 + 手機滑動）
- [x] 選牌粒子爆發特效 + 選完自動進入 3D 逐張翻牌揭示
- [x] DrawAnimation 重寫為真正弧形扇（sin/cos 圓弧定位 + ResizeObserver 自適應）
- [x] Hover 互動（浮起 + 放大 1.2x + 金色 drop-shadow + 選我提示）
- [x] 扇形效能優化：牌數 78→40、hover 改 CSS transition（取代 framer-motion spring）
- [x] 卡片放大 120×192、弧形展角 180°（完整半圓）、選牌消失範圍 ±2
- [x] 手機端恢復向上滑動抽牌模式（牌堆 + 進度環 + 粒子）

## 已完成（Phase 7：會員系統 + UI 改善）
- [x] Firebase Auth 會員系統（Google 登入 + Email 註冊/登入）
- [x] AuthContext + useAuth hook（全域登入狀態管理）
- [x] AuthModal 登入彈窗（Google OAuth + Email 表單 + 註冊/登入切換）
- [x] FirestoreProvider（已登入→Firestore 存取占卜紀錄）
- [x] storage-factory.ts（根據 user.uid 自動選擇 Firestore / localStorage）
- [x] useTarotSession + HistoryPage 整合會員存取
- [x] Navbar 登入狀態顯示（頭像 + 名稱 + 登出）、手機端也支援
- [x] Navbar「開始占卜」改連到首頁（牌陣選擇）而非直接進入單牌
- [x] AboutPage 全面重新設計（核心特色、牌陣介紹、占卜小提示、韋特塔羅歷史、免責聲明）

## 已完成（Phase 8：Firebase 雲端設定）
- [x] Firebase 專案建立（mystic-tarot-2026）
- [x] Firebase Web App 註冊並取得 SDK config
- [x] .env 設定 Firebase config（API key、Auth domain、Project ID 等）
- [x] Firebase Auth 啟用電子郵件/密碼登入
- [x] Firebase Auth 啟用 Google 登入（公開名稱 Mystic Tarot、支援信箱 lukewolf899@gmail.com）
- [x] Cloud Firestore 資料庫建立（asia-east1 Taiwan、Standard 版）
- [x] Firestore 安全規則發布（用戶隔離：users/{userId}/readings/{readingId}）

## 已完成（牌面圖片）
- [x] 下載 Wikimedia Commons Rider-Waite-Smith tarot deck 78 張 public domain 掃描縮圖
- [x] 圖片放在 `public/cards/`，命名為 `major-00.jpg` ~ `major-21.jpg`、四花色 `*-01.jpg` ~ `*-14.jpg`
- [x] `src/config/tarot-data.ts` 的 `imageUrl` 改為對應 `/cards/{card-id}.jpg`
- [x] `src/views/components/tarot/CardFace.tsx` 顯示牌面圖片，逆位用 CSS `rotate-180`
- [x] 圖片來源紀錄：`public/cards/SOURCE.md`
- [x] `CardFace.tsx` 圖片區改用 `aspectRatio`，避免小尺寸牌卡被固定高度撐破

## 注意事項
- ShuffleAnimation 時序（ms）：entering 0→950 / splitting 950→1900 / riffling 1900→3800 / gathering 3800→4700 / withdrawing 4700→5600 → onComplete
- ShuffleAnimation 已移除手部 SVG，改為純牌面動畫 + 金色放射光環
- CutAnimation 容器需 overflow-hidden + 足夠高度（300px）
- DrawAnimation 3D 翻牌：CSS preserve-3d + backface-visibility，rotateY 0°→180°
- Framer Motion v12 與 React StrictMode：不可在 AnimatePresence 內部放 motion 元素做 opacity 動畫；改用 CSS animation 替代
- 開發若遇 hooks order warning → 重啟 dev server（HMR 模組快取衝突）
- dev server 指令：`npm run dev`（port 5175）
- .env 已在 .gitignore，不會推到 GitHub
- Tailwind v4 responsive classes（hidden sm:block）不可靠，改用 window.innerWidth 判斷

## 關鍵檔案路徑
| 檔案 | 用途 |
|------|------|
| `src/services/ai/claude-provider.ts` | Claude API 呼叫 |
| `src/services/ai/openai-provider.ts` | OpenAI API 呼叫（gpt-4.1-mini） |
| `src/services/ai/ai-factory.ts` | AI Provider 工廠 + getConfiguredProvider() |
| `src/services/ai/ai-provider.ts` | IAIProvider 介面定義 |
| `src/services/ai/mock-provider.ts` | Mock 假資料 Provider |
| `src/services/storage/local-storage-provider.ts` | localStorage 存取（匿名用戶） |
| `src/services/storage/firestore-provider.ts` | Firestore 存取（已登入用戶） |
| `src/services/storage/storage-factory.ts` | 根據 user.uid 選擇 storage |
| `src/services/firebase/config.ts` | Firebase 初始化（auth, db, googleProvider） |
| `src/services/firebase/auth-service.ts` | Auth 服務函式 |
| `src/controllers/useAuth.ts` | AuthContext + useAuth hook |
| `src/controllers/useTarotSession.ts` | 占卜流程 Controller hook |
| `src/utils/prompt-builder.ts` | 系統/使用者提示詞建構 |
| `src/views/animations/ShuffleAnimation.tsx` | 洗牌動畫（純牌面） |
| `src/views/animations/CutAnimation.tsx` | 切牌動畫 |
| `src/views/animations/DrawAnimation.tsx` | 抽牌動畫（扇形攤牌） |
| `src/views/components/tarot/CardFace.tsx` | 牌面顯示元件 |
| `src/views/components/tarot/CardBack.tsx` | SVG 牌背 |
| `src/views/components/tarot/CelticCrossLayout.tsx` | 凱爾特十字牌陣排列 |
| `src/views/components/auth/AuthModal.tsx` | 登入/註冊彈窗 |
| `src/views/components/layout/Navbar.tsx` | 導覽列（含登入狀態） |
| `src/views/pages/ReadingPage.tsx` | 占卜主頁面 |
| `src/views/pages/HistoryPage.tsx` | 占卜紀錄頁面 |
| `src/views/pages/AboutPage.tsx` | 關於頁面 |
| `src/config/tarot-data.ts` | 78 張牌完整資料 |
| `src/App.tsx` | 路由 + AuthContext.Provider |
| `.env` | 環境變數（API keys + Firebase config） |
