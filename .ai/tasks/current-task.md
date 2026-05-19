# 當前任務狀態

> 最後更新：2026-05-20

## 進行中

### LINE 內建瀏覽器登入時序問題
- **狀態**：部分修復，需進一步測試
- **現象**：使用者報告「先進管理員頁再跳轉到首頁就可以了」才能登入成功
- **推測**：`tryAutoLineLogin` 在 `useAuth` mount 時觸發，但 AuthModal 的 UI 狀態未即時反映登入成功
- **可能原因**：`wasOpen` ref 邏輯在 LIFF 自動登入完成前就已檢查過，導致 modal 不會自動關閉
- **相關檔案**：
  - `src/controllers/useAuth.ts` — `tryAutoLineLogin` effect
  - `src/views/components/auth/AuthModal.tsx` — `wasOpen` ref 關閉邏輯
- **待確認**：access token 回退已部署，需在 LINE 內建瀏覽器中重新測試

## 最近完成（2026-05-20）

### LINE 登入完整修復
- **問題**：LINE 內建瀏覽器中 LINE 登入失敗（外部瀏覽器正常）
- **根因**：LIFF SDK 的 ID token 在 LINE 內建瀏覽器中快速過期，`liff.getIDToken()` 回傳過期 token
- **修復方案**：
  1. 前端 `liff-service.ts` 新增 JWT 過期檢查 + access token 回退機制
  2. `auth-service.ts` 改為傳送 `{type, token}` 格式
  3. `useAuth.ts` 新增 `tryAutoLineLogin()` 自動登入效果
  4. Cloud Function `signInWithLine` 支援 access token（透過 LINE Profile API `/v2/profile`）
- **修改檔案**：
  - `src/services/line/liff-service.ts` — JWT expiry check + access token fallback
  - `src/services/firebase/auth-service.ts` — `{type, token}` payload
  - `src/controllers/useAuth.ts` — auto-login effect
  - `src/views/components/auth/AuthModal.tsx` — 使用新 API
  - `functions/src/index.ts` — access token + LINE Profile API

### GCP IAM 權限修復
- Cloud Functions v2 使用 Compute Engine SA (`599328361392-compute@developer.gserviceaccount.com`)
- 授予 `iam.serviceAccountTokenCreator` 角色
- 所有 Cloud Run 服務設定 `allUsers` 為 `run.invoker`

### 追問功能修復
- 修正追問（follow-up）功能無反應的問題

### Firebase 部署
- 已部署 hosting + functions 至 `mystic-tarot-2026` (asia-east1)

## 環境資訊

| 項目 | 值 |
|------|------|
| 專案 | mystic-tarot-2026 |
| 區域 | asia-east1 |
| 專案編號 | 599328361392 |
| LIFF ID | 2010137990-R4oOH7sv |
| LINE Channel ID | 2010137990 |
| 實際路徑 | `C:\Users\LK\開發\TarotApp` |
| Claude Code 工作目錄 | `C:\Users\LK\TarotApp`（需用 pushd 切換） |
| Firebase CLI | `npx firebase-tools`（非全域安裝） |
| Dev Server | `npm run dev`（port 5175） |
| GitHub | https://github.com/lk242/TarrotApp.git |

## 關鍵架構

- **MVC**：Model (`src/models/`) → Service (`src/services/`) → Controller (`src/controllers/`) → View (`src/views/`)
- **AI 抽象層**：`IAIProvider` 介面 + factory (`src/services/ai/`)
- **Storage 抽象層**：登入用 Firestore，匿名用 localStorage (`src/services/storage/`)
- **LINE 登入流程**：LIFF SDK → ID/Access Token → Cloud Function (`signInWithLine`) → Custom Token → Firebase Auth

## 關鍵檔案

| 檔案 | 用途 |
|------|------|
| `functions/src/index.ts` | Cloud Functions（signInWithLine, callClaude 等） |
| `src/services/line/liff-service.ts` | LIFF SDK 封裝 |
| `src/services/firebase/auth-service.ts` | Firebase Auth 服務 |
| `src/services/firebase/config.ts` | Firebase 初始化 |
| `src/controllers/useAuth.ts` | Auth 狀態管理 hook |
| `src/controllers/useTarotSession.ts` | 占卜流程 Controller |
| `src/views/components/auth/AuthModal.tsx` | 登入/註冊 Modal |
| `src/views/pages/ReadingPage.tsx` | 占卜主頁面 |
| `src/services/ai/ai-factory.ts` | AI Provider 工廠 |
| `src/utils/prompt-builder.ts` | AI 提示詞建構 |
