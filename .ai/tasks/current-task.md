# 當前任務

## 專案位置
`C:\Users\forst899\tarot-app`
GitHub: https://github.com/lk242/TarrotApp.git

## 目標
加入韋特塔羅牌面圖片 + 完成 Claude API 接入 + Firebase Auth/Firestore

## 下一步（優先順序）

### 1. Claude API 接入（已完成程式碼，待設定 key）
- `ClaudeProvider` 已實作：`src/services/ai/claude-provider.ts`
- 使用 `claude-haiku-4-5-20251001` 模型（最便宜）
- 前端直接呼叫模式（開發用，header: `anthropic-dangerous-direct-browser-access`）
- `getConfiguredProvider()` 讀取 `VITE_AI_PROVIDER` 環境變數自動切換 mock/claude
- **使用者尚未申請 Anthropic API key**，需要到 https://console.anthropic.com/ 申請
- 拿到 key 後建立 `.env`：
  ```
  VITE_AI_PROVIDER=claude
  VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx
  ```
- 上線前必須改成後端 proxy（Firebase Functions），不能把 key 放前端

### 2. Phase 3：Firebase Auth + Firestore Storage
- Google 登入 / 登出
- 已登入 → Firestore 歷史紀錄
- 匿名 → localStorage
- 歷史紀錄頁面 UI（HistoryPage、HistoryCard）

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
- [x] ShuffleAnimation — 牌堆浮現 → 分離左右 → riffle 18 張牌交錯飄落 + 金色光環 → 收攏 → 淡出（無手部，純牌面動畫）
- [x] CutAnimation — 牌堆分兩半 → 交換位置動畫（容器 300px + overflow-hidden 防止遮字）
- [x] DrawAnimation — 互動式抽牌（點擊牌堆 → 飛出 + 3D CSS 翻牌揭示）
- [x] useTarotSession 重構 — useRef 解決 stale closure，回呼式流程銜接
- [x] ReadingPage 全面改版 — 無 AnimatePresence，CSS animate-fade-in/fade-in-up 切換各動畫階段

## 已完成（Phase 4 部分）
- [x] ClaudeProvider 實作（claude-haiku-4-5 模型，前端直呼模式）
- [x] ai-factory.ts 新增 getConfiguredProvider()
- [x] useTarotSession 改用 getConfiguredProvider() 替代寫死 mock
- [x] prompt-builder.ts（系統提示詞 + 使用者提示詞）
- [x] .env.example 更新

## 已完成（牌面圖片）
- [x] 下載 Wikimedia Commons `Rider-Waite-Smith tarot deck (TaionWC)` 78 張 public domain 掃描縮圖
- [x] 圖片放在 `public/cards/`，命名為 `major-00.jpg` ~ `major-21.jpg`、四花色 `*-01.jpg` ~ `*-14.jpg`
- [x] `src/config/tarot-data.ts` 的 `imageUrl` 改為對應 `/cards/{card-id}.jpg`
- [x] `src/views/components/tarot/CardFace.tsx` 顯示牌面圖片，逆位用 CSS `rotate-180`
- [x] 圖片來源紀錄：`public/cards/SOURCE.md`
- [x] 修正 `ShuffleAnimation.tsx` render 中呼叫 `Math.random()` 導致 ESLint 失敗的問題
- [x] 補 `src/styles/legacy-utilities.css`，修正舊 WebView/Tailwind v4 `@layer` utilities 未套用造成整頁跑版
- [x] `CardFace.tsx` 圖片區改用 `aspectRatio`，避免小尺寸牌卡被固定高度撐破

## 注意事項
- ShuffleAnimation 時序（ms）：entering 0→950 / splitting 950→1900 / riffling 1900→3800 / gathering 3800→4700 / withdrawing 4700→5600 → onComplete
- ShuffleAnimation 已移除手部 SVG（使用者認為手畫不好看），改為純牌面動畫 + 金色放射光環
- CutAnimation 容器需 overflow-hidden + 足夠高度（300px），否則牌堆分離時會遮到文字
- DrawAnimation 3D 翻牌：CSS preserve-3d + backface-visibility，rotateY 0°→180°
- Framer Motion v12 與 React StrictMode：不可在 AnimatePresence 內部放 motion 元素做 opacity 動畫，PresenceContext 在 exit 狀態時會阻止 nested motion 的 animate 生效；改用 CSS animation 替代
- ShuffleAnimation 內部也不用 AnimatePresence（同樣的 bug），分牌/riffle 用 motion.div + 條件渲染即可
- 右手鏡射：用 wrapper `<div style={{ transform: 'scaleX(-1)' }}>`，不可在 motion 元素上設 style.transform（會被 WAAPI 覆蓋）
- 開發若遇 hooks order warning → 重啟 dev server（HMR 模組快取衝突）
- dev server 指令：`npm run dev`（port 5175）
- .env 已在 .gitignore，不會推到 GitHub

## 關鍵檔案路徑
| 檔案 | 用途 |
|------|------|
| `src/services/ai/claude-provider.ts` | Claude API 呼叫 |
| `src/services/ai/ai-factory.ts` | AI Provider 工廠 + getConfiguredProvider() |
| `src/services/ai/mock-provider.ts` | Mock 假資料 Provider |
| `src/utils/prompt-builder.ts` | 系統/使用者提示詞建構 |
| `src/controllers/useTarotSession.ts` | 占卜流程 Controller hook |
| `src/views/animations/ShuffleAnimation.tsx` | 洗牌動畫（純牌面） |
| `src/views/animations/CutAnimation.tsx` | 切牌動畫 |
| `src/views/animations/DrawAnimation.tsx` | 抽牌動畫 |
| `src/views/components/tarot/CardFace.tsx` | 牌面顯示元件 |
| `src/views/components/tarot/CardBack.tsx` | SVG 牌背 |
| `src/views/pages/ReadingPage.tsx` | 占卜主頁面 |
| `src/config/tarot-data.ts` | 78 張牌完整資料 |
