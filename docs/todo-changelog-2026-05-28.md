# 神秘塔羅 — 功能強化 10 項實作詳解

> 完成日期：2026-05-28
> 涵蓋 commit：`bbc58f2` ~ `7dd625d`（共 8 個 commit）

---

## 目錄

1. [追問遮罩 Bug 修復 + 純對話模式](#1-追問遮罩-bug-修復--純對話模式)
2. [歷史紀錄頁同步支援心靈對話模式](#2-歷史紀錄頁同步支援心靈對話模式)
3. [AI 記憶跨占卜延續](#3-ai-記憶跨占卜延續)
4. [占卜結果分享卡片優化](#4-占卜結果分享卡片優化)
5. [「是非牌陣」快速占卜](#5-是非牌陣快速占卜)
6. [占卜日記功能](#6-占卜日記功能)
7. [每日回顧推播](#7-每日回顧推播)
8. [邀請制 + 社群裂變](#8-邀請制--社群裂變)
9. [塔羅 × 瑪雅跨系統解讀](#9-塔羅--瑪雅跨系統解讀)
10. [首頁引導優化 / 免費體驗流程](#10-首頁引導優化--免費體驗流程)

---

## 1. 追問遮罩 Bug 修復 + 純對話模式

### 問題

追問時全螢幕 loading 遮罩會遮住正在串流的文字，使用者看不到任何回應。

### Bug 修復

**檔案：`ReadingPage.tsx`**

```tsx
// 修復前（遮罩條件過寬）
{(phase === 'interpreting' || isFollowingUp) && (
  <div className="fixed inset-0 z-50 ...">遮罩</div>
)}

// 修復後（只在初次解讀時顯示遮罩）
{phase === 'interpreting' && (
  <div className="fixed inset-0 z-50 ...">遮罩</div>
)}
```

追問改用 inline loading dots（小型跳動圓點），不阻擋串流文字。

### 純對話模式（新功能）

新增「抽牌追問 / 心靈對話」兩種模式切換：

**Model 層**

- `reading.ts` — `FollowUpEntry.drawnCard` 改為 `optional`（`drawnCard?: DrawnCard`）
- `ai-provider.ts` — `AIFollowUpRequest.followUpCard` 改為 `optional`

**Controller 層**

- `useTarotSession.askFollowUp(question, withCard)` — 新增 `withCard` 參數
  - `true`（預設）= 傳統模式，抽一張指引牌
  - `false` = 純對話模式，不抽牌

**View 層**

- `ReadingPage.tsx` — 新增 `followUpMode` state（`'card' | 'chat'`），pill 按鈕切換
- 建議追問按鈕和自由輸入都依模式傳遞 `withCard` 參數

**Cloud Functions**

- `buildFollowUpPrompts()` 依 `followUpCard` 是否存在分兩套 prompt：
  - 有牌：以指引牌為核心的追問 prompt
  - 無牌：對話導向 prompt（不提新牌，以原始牌陣為基礎，心理師對話口吻）

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/models/reading.ts` | `drawnCard` 改 optional |
| `src/services/ai/ai-provider.ts` | `followUpCard` 改 optional |
| `src/controllers/useTarotSession.ts` | `askFollowUp` 加 `withCard` 參數 |
| `src/views/pages/ReadingPage.tsx` | 遮罩條件修正 + 模式切換 UI |
| `functions/src/index.ts` | `buildFollowUpPrompts` 分兩套 |
| `src/services/i18n/locales/*.ts` | 新增 7 個 key |

### i18n key

```
modeCard / modeChat / modeCardHint / modeChatHint / chatPlaceholder / chatButton
```

---

## 2. 歷史紀錄頁同步支援心靈對話模式

### 變更內容

讓 HistoryPage 的追問功能也支援「抽牌追問 / 心靈對話」模式切換，與 ReadingPage 行為一致。

**Controller 層**

```typescript
// useHistoryReadings.ts
const askFollowUp = async (readingId: string, question: string, withCard = true) => {
  // withCard=true → 抽指引牌；false → 純對話
  const extraCard = withCard ? drawExtraCard(usedCardIds) : undefined;
  // ...
};
```

**View 層**

- `HistoryPage.tsx` — 每張 HistoryCard 的追問區加入同樣的 pill 模式切換
- 共用 ReadingPage 已新增的 i18n key（modeCard / modeChat 等）

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/controllers/useHistoryReadings.ts` | `askFollowUp` 加 `withCard` 參數 |
| `src/views/pages/HistoryPage.tsx` | 追問區加入模式切換 UI |

---

## 3. AI 記憶跨占卜延續

### 設計目標

讓 AI 在新占卜時知道使用者「過去問過什麼」，建立「被理解」的連續感。

### 實作方式

**完全在前端完成，不需修改 Cloud Functions。**

`useQuerentSignals.buildContext()` 強化：

```typescript
// 1. 最近 5 筆占卜摘要（含時間標記）
const recentSummaries = sorted.slice(0, 5)
  .filter(r => r.summary)
  .map((r, i) => {
    const daysAgo = Math.floor((Date.now() - r.timestamp) / 86400000);
    const timeLabel = daysAgo === 0 ? '今天' : `${daysAgo} 天前`;
    return `  ${i + 1}. [${timeLabel}] ${r.summary.slice(0, 80)}`;
  });

// 2. 高頻牌統計（最近 10 筆中出現 2+ 次的牌）
const cardCounts = new Map<string, number>();
for (const r of sorted.slice(0, 10)) {
  for (const dc of r.drawnCards) {
    cardCounts.set(dc.card.name, (cardCounts.get(dc.card.name) ?? 0) + 1);
  }
}
const recurringCards = Array.from(cardCounts.entries())
  .filter(([, count]) => count >= 2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3);
```

這些資訊注入 AI prompt 的 `querentSummary` 欄位，AI 可以：
- 引用上次占卜的脈絡（「上次你問感情也出現了這張牌...」）
- 指出反覆出現的牌代表的核心課題
- 連結不同占卜間的心理主題

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/controllers/useQuerentSignals.ts` | 新增摘要讀取 + 高頻牌統計 |

---

## 4. 占卜結果分享卡片優化

### 修改前

- 只有純文字摘要，沒有牌面圖片
- logo 路徑錯誤（`/images/logo.webp`）

### 修改後

**`ReadingShareCard.tsx`** 完全重新設計：

```
┌─────────────────────────────┐
│          [Logo]             │
│        神秘塔羅              │
│─────────────────────────────│
│       ✦ 單牌占卜 ✦           │
│     「我想了解感情...」       │
│                             │
│    ┌──────┐  ┌──────┐       │
│    │ 牌面 │  │ 牌面 │       │
│    │ 圖片 │  │ 圖片 │       │
│    └──────┘  └──────┘       │
│    權杖王牌    聖杯三         │
│     正位       逆位          │
│                             │
│─────────────────────────────│
│    解讀摘要前 120 字...       │
│─────────────────────────────│
│  ✦ mystic-tarot-2026.web.app │
└─────────────────────────────┘
```

關鍵技術細節：
- **全部使用 inline style**（html2canvas 不一定能讀取 Tailwind class）
- **牌面圖片**加 `crossOrigin="anonymous"`（確保 html2canvas 可跨域讀取）
- **自適應牌面尺寸**：`drawnCards.length > 3 ? 64px : 88px`（凱爾特十字 10 張牌不會溢出）
- **逆位牌面**：`transform: rotate(180deg)` 旋轉圖片（但名稱和標籤不旋轉）
- **Logo 路徑修正**：`/images/logo.webp` → `/images/theme/logo.webp`

**Props 新增 i18n 支援**：

```tsx
interface Props {
  // ...既有 props
  brandName?: string;      // 品牌名（預設 '神秘塔羅'）
  uprightLabel?: string;   // 正位文字
  reversedLabel?: string;  // 逆位文字
}
```

ReadingPage 傳入：`brandName={t.appName}`、`uprightLabel={t.reading.upright}`、`reversedLabel={t.reading.reversed}`

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/views/components/tarot/ReadingShareCard.tsx` | 完全重寫排版 |
| `src/views/pages/ReadingPage.tsx` | 傳入 i18n props |

---

## 5.「是非牌陣」快速占卜

### 設計

新增 `yes-no` 牌陣類型 — 單張牌快速回答 Yes 或 No，消耗較少額度（10 點 vs 一般 20 點）。

### Model 層

**`src/models/spread.ts`**

```typescript
export type SpreadType = 'single' | 'three-card' | 'celtic-cross' | 'yes-no';

// SPREADS 新增：
'yes-no': {
  type: 'yes-no',
  name: '是非占卜',
  cardCount: 1,
  positions: [{ index: 0, name: '神諭', description: '宇宙對你問題的直接回應' }],
}
```

**`src/models/credits.ts`**

```typescript
export const YES_NO_CREDIT_COST = 10;  // 新增
```

### Cloud Functions

1. **SpreadType 同步**：`type SpreadType = ... | 'yes-no'`

2. **專屬 AI prompt** — `buildYesNoSystemPrompt(locale)`：
   - 精簡 200-300 字回覆
   - 結構：YES/NO 判定 → 主要根據 → 行動建議
   - 三語系（zh-TW / en / ja）

3. **計費分流**：
   ```typescript
   const creditCost = data.spreadType === 'yes-no'
     ? YES_NO_CREDIT_COST   // 10 點
     : QUESTION_CREDIT_COST; // 20 點
   ```

4. **退款也用動態 cost**（不再硬編碼）

### View 層

**`HomePage.tsx`**

- Grid 從 `md:grid-cols-3` 改為 `sm:grid-cols-2 md:grid-cols-4`
- 是非牌陣卡片加綠色 badge：`快問快答`

**`ReadingPage.tsx`**

- `readingCost` 變數取代所有硬編碼的 `QUESTION_CREDIT_COST`
- 按鈕文字動態顯示正確的消耗額度

**`DrawAnimation.tsx`**

- `SPREAD_POS_KEY` 新增 `'yes-no': 'yesNo'`

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/models/spread.ts` | 新增 yes-no 定義 |
| `src/models/credits.ts` | 新增 YES_NO_CREDIT_COST |
| `src/views/pages/HomePage.tsx` | 4 欄 grid + 綠色 badge |
| `src/views/pages/ReadingPage.tsx` | readingCost 動態計算 |
| `src/views/animations/DrawAnimation.tsx` | SPREAD_POS_KEY 新增 |
| `functions/src/index.ts` | 專屬 prompt + 計費分流 |
| `src/services/i18n/locales/*.ts` | spreads.yesNo / positions.yesNo |

---

## 6. 占卜日記功能

### 設計

使用者可在歷史紀錄的每筆占卜下方寫筆記，記錄心得、後續驗證或情緒變化。

### Model 層

```typescript
// reading.ts
interface Reading {
  // ...既有欄位
  userNotes?: string;  // 新增
}
```

### Controller 層

**`useHistoryReadings.ts`** — 新增 `updateNotes` callback：

```typescript
const updateNotes = useCallback(async (readingId: string, notes: string) => {
  // 1. 即時更新 UI state
  setReadings(prev => prev.map(r =>
    r.id === readingId ? { ...r, userNotes: notes } : r
  ));
  // 2. 背景寫入 Firestore
  const storage = getStorageProvider(user?.uid);
  await storage.updateReading(readingId, { userNotes: notes });
}, [user]);
```

### View 層

**`HistoryPage.tsx`** — 每張 HistoryCard 新增 NotesSection：

- **折疊式設計**：點「筆記」展開，再點收合
- **防抖自動儲存**：使用者停止輸入 1.5 秒後自動存檔
- **離開自動存**：`onBlur` 事件觸發立即儲存
- **儲存狀態**：顯示「✓ 已儲存」提示，3 秒後淡出

```typescript
// 防抖 1.5s 自動存
useEffect(() => {
  const timer = setTimeout(() => {
    if (notesValue !== reading.userNotes) {
      onUpdateNotes(reading.id, notesValue);
      setNotesSaved(true);
    }
  }, 1500);
  return () => clearTimeout(timer);
}, [notesValue]);
```

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/models/reading.ts` | 新增 `userNotes` 欄位 |
| `src/controllers/useHistoryReadings.ts` | 新增 `updateNotes` |
| `src/views/pages/HistoryPage.tsx` | NotesSection UI |
| `src/services/i18n/locales/*.ts` | notesLabel / notesPlaceholder / notesSaved |

---

## 7. 每日回顧推播

### 設計

每天早上 9:00 推送通知給昨天有占卜的用戶，提醒他們回顧解讀，增加用戶回訪率。

### Cloud Functions 實作

**`dailyReadingReview`** — 使用 `onSchedule`（Cloud Scheduler）：

```typescript
export const dailyReadingReview = onSchedule(
  {
    schedule: '0 9 * * *',        // 每天 09:00
    timeZone: 'Asia/Taipei',      // 台灣時區
    region: REGION,
  },
  async () => { ... }
);
```

**流程**：

```
1. 查詢 collectionGroup('readings')
     WHERE timestamp >= 48小時前
       AND timestamp <= 24小時前
   → 取得昨天有占卜的用戶

2. 按 userId 分組，每人只取最新一筆

3. 對每位用戶：
   a. 讀取 users/{uid}/fcmTokens（所有已註冊的裝置）
   b. 發送 FCM multicast 推播：
      - title: "✦ 回顧昨天的指引"
      - body: 占卜摘要前 60 字
      - data.url: "/history"（前端 SW 的 notificationclick 會跳轉）

4. 清除無效 tokens：
   - messaging/invalid-registration-token
   - messaging/registration-token-not-registered
   → 自動從 Firestore 刪除，避免日後浪費推播額度
```

**推播內容範例**：
```
✦ 回顧昨天的指引
你在感情上可能正經歷一段需要放手的過程，權杖十逆位暗示你承擔了太多…
```

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `functions/src/index.ts` | 新增 `dailyReadingReview` onSchedule |

### 相關 API

- `firebase-admin/messaging` — `getMessaging().sendEachForMulticast()`
- `firebase-functions/v2/scheduler` — `onSchedule()`
- 首次部署自動啟用 `cloudscheduler.googleapis.com`

---

## 8. 邀請制 + 社群裂變

### 設計

邀請好友加入，雙方各得 50 額度。透過邀請碼機制實現，含防作弊。

### Firestore 資料結構

```
users/{uid}
├── referralCode: "ABCD1234"        // 邀請碼
├── referralCount: 3                 // 已邀請人數
├── referredBy: "inviterUid"         // 被誰邀請
├── referredByCode: "WXYZ5678"       // 使用的邀請碼

referralCodes/{code}                 // 反查索引
├── uid: "inviterUid"
├── createdAt: Timestamp
```

### Cloud Functions

**`getReferralCode`**（onCall）

```typescript
// 首次呼叫時自動生成邀請碼（uid 前 8 碼大寫）
const code = uid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase();
// 寫入 users/{uid}.referralCode + referralCodes/{code} 反查
```

**`applyReferralCode`**（onCall） — 含完整防作弊：

```typescript
// 檢查鏈：
1. userData.referredBy 存在？ → '你已經使用過邀請碼了'
2. userData.referralCode === code？ → '不能使用自己的邀請碼'
3. referralCodes/{code} 存在？ → '邀請碼不存在'
4. codeDoc.uid === uid？ → '不能使用自己的邀請碼'（雙重防護）

// 交易式更新（Transaction）防止併發：
transaction.update(userRef, { balance: +50, referredBy: ... });
transaction.update(referrerRef, { balance: +50, referralCount: +1 });
// 雙方各寫入 creditTransactions 紀錄
```

### Controller 層

**`useReferral.ts`**（新檔案）

```typescript
export function useReferral() {
  // 狀態：referralCode, referralLink, loading, applying, error, applied, reward
  // 方法：applyCode(code), copyLink()

  // mount 時自動取得邀請碼
  useEffect(() => {
    getReferralCodeFn().then(result => setReferralCode(result.data.code));
  }, [user]);

  // 邀請連結
  const referralLink = `${window.location.origin}?ref=${referralCode}`;
}
```

### View 層

**`BillingPage.tsx`** — 底部新增 ReferralSection（僅登入用戶）：

```
┌─────────────────────────────────┐
│  🎁 邀請好友，雙方得獎勵         │
│                                 │
│  你的邀請碼：ABCD1234            │
│  [📋 複製邀請連結]               │
│                                 │
│  輸入好友的邀請碼：[________]     │
│  [兌換]                          │
│                                 │
│  ✓ 成功！你獲得了 50 額度         │
└─────────────────────────────────┘
```

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/controllers/useReferral.ts` | 新檔案 |
| `src/views/pages/BillingPage.tsx` | ReferralSection |
| `functions/src/index.ts` | getReferralCode + applyReferralCode |
| `src/services/i18n/locales/*.ts` | referral 相關 8 個 key |

---

## 9. 塔羅 × 瑪雅跨系統解讀

### 背景

使用者可能同時使用塔羅 app（mystic-tarot-2026.web.app）和瑪雅 app（stellar-maya-2026.web.app），兩者共用同一個 Firebase 專案。瑪雅 app 會在 Firestore `users/{uid}.mayaProfile` 存放使用者的星系印記。

### 實作方式

**完全在 Cloud Functions 後端完成，前端零修改。**

1. 新增瑪雅資料查找表（20 圖騰 × 3 語系 + 13 調性 × 3 語系 + 20 組關鍵字）
2. 新增 `buildMayaContext(uid, locale)` 非同步函式
3. 四個占卜端點都注入瑪雅脈絡

**`buildMayaContext` 函式**：

```typescript
async function buildMayaContext(uid: string, locale: Locale): Promise<string> {
  // 1. 讀取 Firestore users/{uid}
  const userDoc = await db.collection('users').doc(uid).get();
  const profile = userDoc.data()?.mayaProfile;
  if (!profile?.signature) return '';  // 無瑪雅資料 → graceful fallback

  // 2. 查找圖騰/調性名稱和關鍵字
  const sealName = MAYA_SEAL_NAMES[signature.seal]?.[lang];
  const toneName = MAYA_TONE_NAMES[signature.tone]?.[lang];
  // ...五方位名稱

  // 3. 組成三語系 prompt 段落
  return `**問卜者的瑪雅星系印記（13月亮曆）：**
Kin ${signature.kin} — ${toneName}${sealName}
核心能量關鍵字：${keywords}
五方位：引導=${guideName}、支持=${supportName}、挑戰=${challengeName}、隱藏=${hiddenName}
（請將問卜者的瑪雅能量原型自然融入塔羅解讀中...）`;
}
```

**AI 指引重點**：
- 自然融合瑪雅能量原型（如「你與生俱來的白鏡能量，讓你特別善於看穿表象...」）
- 不講解瑪雅曆理論（使用者不一定了解）
- 作為心理學洞察的深層維度（像是感應到更深的靈魂藍圖）

**注入位置**：附加在 user prompt 末尾

```typescript
const mayaContext = await buildMayaContext(uid, data.locale);
const userPrompt = `${buildUserPrompt(data)}${mayaContext}`;
```

### 瑪雅資料格式（Firestore）

```json
{
  "mayaProfile": {
    "kin": 185,
    "signature": {
      "kin": 185, "seal": 5, "tone": 3,
      "guide": 9, "support": 10, "challenge": 15, "hidden": 16,
      "color": "red", "wavespell": 15, "wavespellSeal": 15
    },
    "birthDate": "1990-03-15"
  }
}
```

### 效果範例

AI 解讀中可能出現：

> 「...有趣的是，你的內在核心能量帶有紅蛇的生命力特質——生存本能特別強，很擅長感知危險和機會。這跟星幣騎士正位出現在你的『近未來』位置形成了有趣的共鳴：你天生的直覺本能正在引導你走向更務實的財務規劃方向...」

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `functions/src/index.ts` | 瑪雅資料表 + buildMayaContext + 四端點注入 |

---

## 10. 首頁引導優化 / 免費體驗流程

### 設計目標

讓未登入用戶也能完整體驗洗牌/切牌/抽牌的互動流程（免費），看到牌面後引導註冊。

### Controller 層

**`useTarotSession.ts`** — `onDrawComplete` 修改：

```typescript
const onDrawComplete = useCallback(async (ctx) => {
  // 未登入用戶：顯示牌面但不呼叫 AI
  if (!user) {
    setPhase('complete');
    setInterpretation('');  // 空解讀 → 觸發 View 的 trial 區塊
    return;
  }
  // 已登入用戶：正常流程（扣點 → AI 解讀）
  setPhase('interpreting');
  // ...
}, []);
```

### View 層

**`ReadingPage.tsx`** — 三處修改：

**1. 開始按鈕：未登入也可點擊**

```tsx
<button
  onClick={startReading}
  disabled={user ? (!canAsk || creditLoading) : false}  // 訪客不 disabled
>
  {user
    ? `☉ ${t.reading.startButton.replace('{cost}', String(readingCost))}`
    : `✦ ${t.reading.freeTrialButton}`  // "免費體驗抽牌"
  }
</button>
```

**2. 試用引導區塊：完成但無解讀時顯示**

```tsx
{phase === 'complete' && !interpretation && !user && (
  <div>
    {/* 顯示已翻開的牌面 */}
    {drawnCards.map(dc => <CardFace ... />)}

    {/* 登入 CTA */}
    <h3>✦ 你的牌已翻開</h3>
    <p>登入或註冊即可獲得免費 AI 解讀額度</p>
    <Link to="/billing">免費註冊，解鎖解讀</Link>
    <p>新會員自動獲得 200 解讀額度</p>

    {/* 再占一次 */}
    <button onClick={reset}>↻ 再占一次</button>
  </div>
)}
```

**3. 錯誤訊息只對登入用戶顯示**

```tsx
{(error || (blockedReason && user)) && ( ... )}
```

### i18n key

```
reading.freeTrialButton  = '免費體驗抽牌'
reading.trialTitle       = '你的牌已翻開'
reading.trialDesc        = '登入或註冊即可獲得免費 AI 解讀額度，解鎖完整的塔羅指引'
reading.trialCTA         = '免費註冊，解鎖解讀'
reading.trialHint        = '新會員自動獲得 200 解讀額度'
```

### 使用者流程

```
訪客進入 → 選主題 → 點「✦ 免費體驗抽牌」
→ 洗牌動畫 → 切牌動畫 → 扇形牌陣選牌
→ 牌面翻開揭示（完整動畫體驗）
→ 顯示牌面 + 登入 CTA 引導
→ 點「免費註冊，解鎖解讀」→ 跳轉 /billing
→ 註冊後獲得 200 額度 → 回來占卜取得 AI 解讀
```

### 涉及檔案

| 檔案 | 變更 |
|------|------|
| `src/controllers/useTarotSession.ts` | onDrawComplete 未登入分支 |
| `src/views/pages/ReadingPage.tsx` | 按鈕 + trial 區塊 + 錯誤顯示 |
| `src/services/i18n/locales/*.ts` | 5 個 trial 相關 key |

---

## 附錄：Commit 紀錄

| Commit | 訊息 | 對應 TODO |
|--------|------|-----------|
| (之前) | feat(chat): 追問遮罩修復 + 純對話模式 | #1 |
| (之前) | feat(history): 歷史頁同步心靈對話 | #2 |
| (之前) | feat(memory): AI 跨占卜記憶 | #3 |
| `bbc58f2` | feat(share): 重新設計分享卡片 | #4 |
| `d923edd` | feat(spread): 新增是非占卜牌陣 | #5 |
| `fa8f0a8` | feat(history): 新增占卜日記功能 | #6 |
| `9e74b1b` | feat(push): 新增每日回顧推播排程 | #7 |
| `e0fad2e` | feat(referral): 新增邀請制裂變 | #8 |
| `7dd625d` | feat(maya): 塔羅 × 瑪雅跨系統解讀 | #9 |
| `bc456bc` | feat(trial): 免費體驗抽牌流程 | #10 |

---

## 附錄：部署狀態

| 項目 | 狀態 | URL |
|------|------|-----|
| Firebase Hosting | ✅ 已部署 | https://mystic-tarot-2026.web.app |
| Cloud Functions (19 個) | ✅ 已部署 | asia-east1 |
| Cloud Scheduler | ✅ 自動啟用 | dailyReadingReview 每日 09:00 |

所有功能均已通過 `tsc` 編譯 + `vite build` + 瀏覽器實測。
