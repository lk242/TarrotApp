# 神秘塔羅 Mystic Tarot

線上塔羅占卜 Web App，結合 78 張韋特塔羅牌、互動式抽牌動畫、Firebase 會員系統與 OpenAI 牌義解讀。

正式站：
https://mystic-tarot-2026.web.app

## 主要功能

- 78 張 Rider-Waite-Smith 韋特塔羅牌面圖片
- 單牌、三牌、凱爾特十字牌陣
- 洗牌、切牌、扇形攤牌、手機滑動抽牌、3D 翻牌動畫
- OpenAI `gpt-4.1-mini` AI 解讀
- AI 追問功能，保留原始牌陣上下文
- Firebase Auth：Google 登入、Email 註冊/登入
- 點數制度：新會員贈送 100 點，每次全新占卜或追問扣 5 點
- 綠界 ECPay 測試環境點數包 checkout 與付款通知入點
- 月訂閱方案頁，定期定額金流保留後續串接點
- 已登入使用者使用 Firestore 同步占卜紀錄
- 匿名使用者使用 localStorage 保存本機紀錄

## 技術棧

- React 19 + TypeScript + Vite
- Tailwind CSS v4 + fallback utilities
- Framer Motion
- Firebase Auth / Firestore / Hosting / Functions
- OpenAI Chat Completions API
- marked Markdown renderer

## 專案架構

本專案採 MVC 分層，避免 View 直接碰 Firebase、OpenAI 或 localStorage。

```text
src/
  models/                 純型別定義，不能 import React/Firebase
  services/               業務邏輯與外部服務封裝
    ai/                   AI provider 抽象與實作
    credits/              點數 callable 與 Firestore 訂閱封裝
    firebase/             Firebase SDK 初始化與 Auth service
    storage/              Firestore/localStorage provider
  controllers/            React hooks，銜接 Service 與 View
  views/                  頁面、元件、動畫，負責呈現與互動
  config/                 塔羅牌資料
  utils/                  prompt、日期、洗牌等工具

functions/
  src/index.ts            Firebase Functions AI proxy
```

詳細分工請看 [GUIDE.md](./GUIDE.md)。

## AI Key 安全策略

正式環境不把 OpenAI API key 放前端。

前端 production 使用：

```env
VITE_AI_PROVIDER=functions
```

瀏覽器呼叫 Firebase Callable Functions：

- `generateTarotReading`
- `followUpReading`
- `getCreditBalance`
- `createCreditPurchase`
- `createSubscription`

Functions 端透過 Firebase Secret Manager 讀取：

```text
OPENAI_API_KEY
```

因此公開 bundle 不包含 `sk-` key。

綠界正式金鑰同樣不能放前端。目前程式只內建綠界官方公開 sandbox 測試資料；正式收款前需改為 Firebase Secret 注入正式 MerchantID / HashKey / HashIV。

## 點數與付費設計

點數帳戶由 Firebase Functions 建立與扣款，前端只負責顯示餘額與方案。

- 新會員首次登入建立 `users/{uid}`，贈送 `100` 點
- 每次 `generateTarotReading` 或 `followUpReading` 先扣 `5` 點
- OpenAI 呼叫失敗會自動退還該次 `5` 點
- 交易紀錄寫入 `users/{uid}/creditTransactions/{transactionId}`
- 前端不可直接寫入餘額或交易紀錄

目前方案定義在 `src/models/credits.ts`：

- 入門補充包：500 點 / NT$99
- 標準靈感包：1200 點 / NT$199
- 深度探索包：3000 點 / NT$399
- 月光方案：每月 1000 點 / NT$149
- 星辰方案：每月 2500 點 / NT$299
- 神諭方案：每月 6000 點 / NT$599

定價基準：

- OpenAI `gpt-4.1-mini` 官方價格：input US$0.40 / 1M tokens、output US$1.60 / 1M tokens
- 以 1 USD 約 NT$32 估算，一次占卜或追問 AI 成本約 NT$0.15 至 NT$0.25
- 推薦主力方案為 NT$199 點數包與 NT$299 月訂閱，能保留毛利吸收 Firebase、付款手續費與客服成本

綠界一次性點數包已接測試環境：

- `createCreditPurchase` 會建立 `paymentOrders/{orderId}` pending 訂單
- 前端收到綠界 checkout 表單欄位後，以 POST 導轉到綠界付款頁
- `ecpayNotify` 接收綠界 `ReturnURL` server-to-server 通知
- webhook 驗證 `CheckMacValue`、訂單金額與處理狀態後才入點
- 綠界測試後台的「模擬付款」通知含 `SimulatePaid=1`，系統只記錄通知，不會入點

訂閱尚未正式串接。`createSubscription` 目前仍只回傳提示訊息；等一次性點數包流程穩定後，再接綠界定期定額。

## 環境變數

建立 `.env`：

```env
VITE_AI_PROVIDER=functions
VITE_ANTHROPIC_API_KEY=
VITE_OPENAI_API_KEY=

VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=mystic-tarot-2026.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=mystic-tarot-2026
VITE_FIREBASE_STORAGE_BUCKET=mystic-tarot-2026.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

本機若要繞過 Functions 測試，可暫時使用 `VITE_AI_PROVIDER=mock`。

## 常用指令

```bash
npm run dev
npm run build
npm run lint
```

Functions：

```bash
npm install --prefix functions
npm --prefix functions run build
```

部署：

```bash
firebase deploy --only firestore:rules,functions,hosting --project mystic-tarot-2026 --force
```

## Firebase 設定

目前專案：

- Project ID：`mystic-tarot-2026`
- Hosting：`https://mystic-tarot-2026.web.app`
- Functions region：`asia-east1`
- Firestore location：`asia-east1`

Firestore 規則採使用者隔離：

```js
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create, update, delete: if false;

  match /readings/{readingId} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }

  match /creditTransactions/{transactionId} {
    allow read: if request.auth != null && request.auth.uid == userId;
    allow write: if false;
  }
}

match /paymentOrders/{orderId} {
  allow read: if request.auth != null && resource.data.userId == request.auth.uid;
  allow create, update, delete: if false;
}
```

## Git 注意事項

- `.env` 不提交
- `dist/` 不提交
- `.firebase/` 不提交
- `functions/lib/` 不提交，部署前由 predeploy build 產生

Commit 訊息使用 Conventional Commits，繁體中文描述，例如：

```text
feat(ai): 新增 Firebase Functions AI proxy
fix(ui): 修正手機抽牌排版
```
