# 當前任務

## 目標
Phase 3 — Firebase Auth + Firestore Storage 整合（待開始）

## 下一步
- Phase 3：Firebase Auth + Firestore Storage 整合
  - Google 登入 / 登出
  - 已登入 → Firestore 歷史紀錄
  - 匿名 → localStorage
  - 歷史紀錄頁面 UI（HistoryPage、HistoryCard）
- Phase 4：Claude API 接入（Firebase Functions proxy）

## 已完成（Phase 1）
- [x] Vite + React + TypeScript 專案初始化
- [x] Tailwind CSS v4 + 自訂神秘主題（CSS 變數）
- [x] 78 張塔羅牌完整資料定義（大阿爾克那 22 + 小阿爾克那 56）
- [x] MVC 架構（Model / Service / Controller / View）
- [x] IAIProvider 抽象層 + MockProvider + 工廠模式
- [x] IStorageProvider 抽象層 + LocalStorageProvider
- [x] tarot-engine（洗牌 Fisher-Yates / 切牌 / 抽牌 / 正逆位）
- [x] 4 頁路由（首頁 / 占卜 / 紀錄 / 關於）
- [x] 響應式 Navbar（漢堡選單）
- [x] Canvas 粒子背景動畫
- [x] marked 渲染 Markdown 解讀結果

## 已完成（Phase 2）
- [x] CardBack — SVG 精美牌背（八角星 + 金色邊框 + 角落裝飾）
- [x] ShuffleAnimation — 兩隻占卜師之手（SVG，含金戒指/神秘符文）入場 → 各持半副牌 → riffle 洗牌（18 張牌交錯飛落）→ 收攏 → 退場
- [x] CutAnimation — 牌堆分兩半 → 交換位置動畫
- [x] DrawAnimation — 互動式抽牌（點擊牌堆 → 飛出 + 3D CSS 翻牌揭示）
- [x] useTarotSession 重構 — useRef 解決 stale closure，回呼式流程銜接
- [x] ReadingPage 全面改版 — 無 AnimatePresence，CSS animate-fade-in/fade-in-up 切換各動畫階段
- [x] FeminineHand 纖細女性手重設計 — 單一連續 SVG path 手掌+四指輪廓，自然膚色漸層（#f5dcc3→#d4a574），粉色指甲融入指尖，金戒指+手腕金鐲+掌心符文，拇指 motion.g 彈牌動畫
- [x] SkinTheme 雙主題支援（'natural' | 'ethereal'），可切換自然膚色/半透明靈體風格
- [x] 修正 Framer Motion v12 + React StrictMode + AnimatePresence PresenceContext 導致動畫卡在 opacity:0 的問題
- [x] 修正 motion.svg scaleX(-1) 被 WAAPI 覆蓋 → 改用 wrapper div 處理右手鏡射
- [x] animations.css 新增 fade-in / fade-in-up（fill-mode: both），支援 animationDelay

## 注意事項
- ShuffleAnimation 時序（ms）：entering 0→950 / splitting 950→1900 / riffling 1900→3800 / gathering 3800→4700 / withdrawing 4700→5600 → onComplete
- FeminineHand SVG（100×200 viewBox）：單一連續 path 繪製手掌+四指，小指從手掌側面延伸；拇指獨立 motion.g；右手用 `<div style={{ transform: 'scaleX(-1)' }}>` 包裝做鏡射；支援 SkinTheme 切換
- DrawAnimation 3D 翻牌：CSS preserve-3d + backface-visibility，rotateY 0°→180°
- Framer Motion v12 與 React StrictMode：不可在 AnimatePresence 內部放 motion 元素做 opacity 動畫，PresenceContext 在 exit 狀態時會阻止 nested motion 的 animate 生效；改用 CSS animation 替代
- 開發若遇 hooks order warning → 重啟 dev server（HMR 模組快取衝突）
