# 神秘塔羅 — 功能強化待辦清單

> 建立日期：2026-05-28
> 優先順序：由上到下依序執行

---

## Phase 1：短期高效益（本週）

### 1. ✅ 追問遮罩 Bug 修復 + 純對話模式
- [x] 追問時全螢幕遮罩改為僅初次解讀時顯示
- [x] 新增「抽牌追問 / 心靈對話」模式切換
- [x] 後端 prompt 依模式分流（有牌 vs 無牌）
- [x] 三語系 i18n 支援

### 2. ✅ 歷史紀錄頁同步支援心靈對話模式
- [x] `useHistoryReadings.askFollowUp` 加入 `withCard` 參數
- [x] HistoryPage 追問區加入模式切換 UI（與 ReadingPage 一致）
- [x] 後端 prompt 已在 TODO #1 中支援 chat mode 分支（共用同一組 Cloud Functions）
- [x] i18n 共用 ReadingPage 已新增的 key（modeCard / modeChat / chatPlaceholder / chatButton）

### 3. ✅ AI 記憶跨占卜延續
- [x] `useQuerentSignals.buildContext` 強化記憶：讀取最近 5 筆占卜摘要（含時間標記）
- [x] 新增高頻牌統計：最近 10 筆中出現 2 次以上的牌自動標記為核心課題
- [x] 記憶內容直接注入 AI prompt 的 querentSummary（不需新增 Firestore 子集合）
- [x] 舊用戶無摘要時 graceful fallback（不影響現有流程）
- [x] 不需修改 Cloud Functions（querentSummary 已在 prompt 中使用）

### 4. ✅ 占卜結果分享卡片優化
- [x] `ReadingShareCard` 加入牌面圖片（目前只有文字摘要）
- [x] 重新設計排版：牌面 + 問題 + 解讀摘要 + 品牌 logo
- [x] 確保 html2canvas 正確渲染牌面圖片（inline style + crossOrigin + useCORS）
- [ ] 測試社群分享預覽（LINE / Facebook OG meta）— 需實際占卜後驗證

---

## Phase 2：中期功能（下週）

### 5. ✅ 「是非牌陣」快速占卜
- [x] `src/models/spread.ts` 新增 `yes-no` 牌陣定義（單牌，位置名「神諭」）
- [x] 新增專屬 AI prompt（簡短回答 Yes/No + 200-300 字解析，三語系）
- [x] 消耗 10 點（低門檻）
- [x] 首頁 / 牌陣選擇加入入口（綠色「快問快答」標籤）
- [x] Cloud Functions 新增 `YES_NO_CREDIT_COST = 10` + 退款邏輯
- [x] 三語系 i18n（zh-TW / en / ja）

### 6. 占卜日記功能
- [ ] `Reading` model 新增 `userNotes?: string` 欄位
- [ ] HistoryPage 每筆紀錄下方加入「寫筆記」展開區域
- [ ] Firestore 儲存 / 讀取筆記
- [ ] 筆記內容可選擇性回饋給下次占卜的 `querentSummary`
- [ ] 三語系 i18n

### 7. 每日回顧推播
- [ ] Cloud Functions 定時任務（Cloud Scheduler）：每日早上 9 點觸發
- [ ] 查詢 24 小時前有占卜紀錄的用戶，發送推播通知
- [ ] 推播內容：占卜摘要 + 「回顧昨天的指引」CTA
- [ ] 點擊推播跳轉到對應的歷史紀錄

---

## Phase 3：長期方向（規劃中）

### 8. 邀請制 + 社群裂變
- [ ] `users/{uid}` 新增 `referralCode` 欄位
- [ ] 邀請連結產生 + 分享 UI
- [ ] 被邀請者註冊時雙方各得 50 點
- [ ] Cloud Functions 處理邀請獎勵發放 + 防作弊

### 9. 塔羅 × 瑪雅跨系統解讀
- [ ] 占卜時讀取使用者的瑪雅 Kin（若已設定）
- [ ] AI prompt 融合瑪雅圖騰能量 + 塔羅牌義
- [ ] 需 maya-app 和 tarot-app 共用 Firestore 資料

### 10. 首頁引導優化 / 免費體驗流程
- [ ] 未登入用戶可進行一次免費占卜（前半段解讀）
- [ ] 註冊後解鎖完整解讀
- [ ] A/B 測試轉換率

---

## 備註

- 每項完成後獨立 commit + deploy
- 修改 Cloud Functions 需同步部署 `npx firebase-tools deploy --only functions`
- 前端修改需 `npm run build` + `npx firebase-tools deploy --only hosting`
