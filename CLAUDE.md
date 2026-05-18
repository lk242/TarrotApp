# CLAUDE.md — 神秘塔羅

## 語言
預設使用**繁體中文**回應與撰寫註解、commit 訊息。

## 專案概述
線上塔羅占卜 Web App，結合 78 張韋特塔羅牌與 AI 牌義解讀。

## 技術棧
- React 19 + TypeScript + Vite + Tailwind CSS v4
- Framer Motion（動畫）
- Firebase Auth / Firestore / Functions
- Anthropic Claude API（透過 Firebase Functions proxy）
- marked（Markdown 渲染）

## 架構（MVC）
- **Model** (`src/models/`) — 純型別定義，零框架依賴
- **Service** (`src/services/`) — 業務邏輯，零 React 依賴
- **Controller** (`src/controllers/`) — React Hooks，銜接 Service 與 View
- **View** (`src/views/`) — 純呈現元件

### 重要規則
- View 不能直接呼叫 Firebase、AI API 或 localStorage
- Model 檔案不能 import 任何框架套件
- Controller hooks 不含 JSX

## AI Provider 抽象層
- 介面：`src/services/ai/ai-provider.ts` (`IAIProvider`)
- 工廠：`src/services/ai/ai-factory.ts` (`createAIProvider`)
- 新增 provider 只需實作 `IAIProvider` 並在 factory 註冊

## Storage Provider 抽象層
- 介面：`src/services/storage/storage-provider.ts` (`IStorageProvider`)
- 已登入 → Firestore，匿名 → localStorage

## 常用指令
```bash
npm run dev      # 啟動開發伺服器 (port 5175)
npm run build    # 建置
npm run lint     # ESLint
```

## Commit 格式
Conventional Commits（繁體中文描述）：
```
feat(tarot): 新增凱爾特十字牌陣動畫
fix(ui): 修正逆位牌面文字顯示
```
