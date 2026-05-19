import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';

initializeApp();

/**
 * OpenAI key 透過 Firebase Secret Manager 注入。
 *
 * 不要把 key 放在前端 VITE_* 環境變數；Vite 會把它打包進公開 JS。
 */
const openAIKey = defineSecret('OPENAI_API_KEY');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = 'gpt-4.1-mini';
const REGION = 'asia-east1';
const WELCOME_CREDITS = 100;
const QUESTION_CREDIT_COST = 5;

const db = getFirestore();

type SpreadType = 'single' | 'three-card' | 'celtic-cross';
type Locale = 'zh-TW' | 'en';
type CreditPackageId = 'starter' | 'standard' | 'deep';
type SubscriptionTier = 'none' | 'monthly_light' | 'monthly_plus' | 'monthly_pro';

interface CreditProfile {
  userId: string;
  balance: number;
  freeCreditsGranted: boolean;
  subscriptionTier: SubscriptionTier;
  subscriptionStatus: 'none' | 'active' | 'past_due' | 'canceled';
  updatedAt?: number;
}

interface CreditProduct {
  credits: number;
  priceTwd: number;
}

const CREDIT_PACKAGES: Record<CreditPackageId, CreditProduct> = {
  starter: { credits: 500, priceTwd: 99 },
  standard: { credits: 1200, priceTwd: 199 },
  deep: { credits: 3000, priceTwd: 399 },
};

const SUBSCRIPTION_PLANS: Record<Exclude<SubscriptionTier, 'none'>, CreditProduct> = {
  monthly_light: { credits: 1000, priceTwd: 149 },
  monthly_plus: { credits: 2500, priceTwd: 299 },
  monthly_pro: { credits: 6000, priceTwd: 599 },
};

interface TarotCard {
  id: string;
  name: string;
  nameEn: string;
  arcana: string;
  suit?: string;
  number: number;
  imageUrl: string;
  keywords: string[];
  reversedKeywords: string[];
}

interface DrawnCard {
  card: TarotCard;
  isReversed: boolean;
  position: string;
}

interface AIInterpretationRequest {
  spreadType: SpreadType;
  drawnCards: DrawnCard[];
  question: string;
  locale: Locale;
}

interface AIFollowUpRequest {
  originalRequest: AIInterpretationRequest;
  originalInterpretation: string;
  followUpQuestion: string;
  locale: Locale;
}

interface AIInterpretationResponse {
  interpretation: string;
  summary: string;
  suggestedQuestions?: string[];
  tokenUsage?: {
    input: number;
    output: number;
  };
}

interface ChatUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

interface ChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: ChatUsage;
}

function requireUid(uid?: string): string {
  if (!uid) {
    throw new HttpsError('unauthenticated', '請先登入後再使用 AI 占卜');
  }
  return uid;
}

function toMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) return value.toMillis();
  return typeof value === 'number' ? value : undefined;
}

function normalizeCreditProfile(userId: string, data: DocumentData): CreditProfile {
  return {
    userId,
    balance: Number(data.balance ?? 0),
    freeCreditsGranted: Boolean(data.freeCreditsGranted),
    subscriptionTier: (data.subscriptionTier ?? 'none') as SubscriptionTier,
    subscriptionStatus: data.subscriptionStatus ?? 'none',
    updatedAt: toMillis(data.updatedAt),
  };
}

async function ensureCreditAccount(uid: string): Promise<CreditProfile> {
  const userRef = db.doc(`users/${uid}`);

  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data();

    if (!snapshot.exists || !current) {
      const profile = {
        userId: uid,
        balance: WELCOME_CREDITS,
        freeCreditsGranted: true,
        subscriptionTier: 'none',
        subscriptionStatus: 'none',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.set(userRef, profile);
      transaction.create(userRef.collection('creditTransactions').doc(), {
        amount: WELCOME_CREDITS,
        type: 'welcome',
        reason: '新會員登入贈送點數',
        createdAt: FieldValue.serverTimestamp(),
      });
      return {
        userId: uid,
        balance: WELCOME_CREDITS,
        freeCreditsGranted: true,
        subscriptionTier: 'none',
        subscriptionStatus: 'none',
      };
    }

    if (!current.freeCreditsGranted) {
      transaction.update(userRef, {
        balance: FieldValue.increment(WELCOME_CREDITS),
        freeCreditsGranted: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userRef.collection('creditTransactions').doc(), {
        amount: WELCOME_CREDITS,
        type: 'welcome',
        reason: '補發新會員贈送點數',
        createdAt: FieldValue.serverTimestamp(),
      });
      return normalizeCreditProfile(uid, {
        ...current,
        balance: Number(current.balance ?? 0) + WELCOME_CREDITS,
        freeCreditsGranted: true,
      });
    }

    return normalizeCreditProfile(uid, current);
  });
}

async function chargeQuestionCredits(uid: string, reason: string): Promise<void> {
  const userRef = db.doc(`users/${uid}`);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data();
    let balance = Number(current?.balance ?? 0);
    let freeCreditsGranted = Boolean(current?.freeCreditsGranted);

    if (!snapshot.exists || !current) {
      balance = WELCOME_CREDITS;
      freeCreditsGranted = true;
      transaction.set(userRef, {
        userId: uid,
        balance,
        freeCreditsGranted,
        subscriptionTier: 'none',
        subscriptionStatus: 'none',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userRef.collection('creditTransactions').doc(), {
        amount: WELCOME_CREDITS,
        type: 'welcome',
        reason: '新會員登入贈送點數',
        createdAt: FieldValue.serverTimestamp(),
      });
    } else if (!freeCreditsGranted) {
      balance += WELCOME_CREDITS;
      freeCreditsGranted = true;
      transaction.update(userRef, {
        balance,
        freeCreditsGranted,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userRef.collection('creditTransactions').doc(), {
        amount: WELCOME_CREDITS,
        type: 'welcome',
        reason: '補發新會員贈送點數',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    if (balance < QUESTION_CREDIT_COST) {
      throw new HttpsError('failed-precondition', '點數不足，請購買點數或訂閱方案。');
    }

    transaction.update(userRef, {
      balance: FieldValue.increment(-QUESTION_CREDIT_COST),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(userRef.collection('creditTransactions').doc(), {
      amount: -QUESTION_CREDIT_COST,
      type: 'usage',
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

async function refundQuestionCredits(uid: string, reason: string): Promise<void> {
  const userRef = db.doc(`users/${uid}`);
  await userRef.update({
    balance: FieldValue.increment(QUESTION_CREDIT_COST),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await userRef.collection('creditTransactions').add({
    amount: QUESTION_CREDIT_COST,
    type: 'refund',
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function assertInterpretationRequest(data: unknown): AIInterpretationRequest {
  const request = data as Partial<AIInterpretationRequest>;
  if (
    !request ||
    typeof request.question !== 'string' ||
    !Array.isArray(request.drawnCards) ||
    !['single', 'three-card', 'celtic-cross'].includes(String(request.spreadType))
  ) {
    throw new HttpsError('invalid-argument', '占卜請求格式不正確');
  }

  return {
    spreadType: request.spreadType as SpreadType,
    drawnCards: request.drawnCards,
    // 限制可控輸入長度，避免單次 callable 被超長 prompt 濫用。
    question: request.question.slice(0, 1000),
    locale: request.locale === 'en' ? 'en' : 'zh-TW',
  };
}

function assertFollowUpRequest(data: unknown): AIFollowUpRequest {
  const request = data as Partial<AIFollowUpRequest>;
  if (
    !request ||
    typeof request.followUpQuestion !== 'string' ||
    typeof request.originalInterpretation !== 'string' ||
    !request.originalRequest
  ) {
    throw new HttpsError('invalid-argument', '追問請求格式不正確');
  }

  return {
    originalRequest: assertInterpretationRequest(request.originalRequest),
    originalInterpretation: request.originalInterpretation.slice(0, 5000),
    followUpQuestion: request.followUpQuestion.slice(0, 1000),
    locale: request.locale === 'en' ? 'en' : 'zh-TW',
  };
}

function buildSystemPrompt(locale: Locale): string {
  if (locale === 'zh-TW') {
    return `你是一位擁有深厚塔羅知識、擅長心靈引導的資深占卜師。你的解讀風格兼具神秘感與實用性，讓問卜者感到被理解並獲得清晰的方向。

你必須提供深度且完整的解讀，回應長度至少 800 字。請嚴格依照以下 Markdown 格式結構回應：

## 牌陣總覽
用 2-3 句話概述這次牌陣傳達的核心能量與整體氛圍。

## 逐牌解析
對每一張牌分別以 ### 標題詳細解析。

## 整體綜合解讀
將所有牌串連成一個完整的故事線，分析牌與牌之間的關聯與互動。

## 具體建議
提供 3-5 點可實際執行的建議。

## 需要留意的面向
指出 1-2 個問卜者可能忽略或需要警惕的面向。

## 箴言
> 用一句富有詩意且深刻的箴言作為結語。

規則：
- 使用繁體中文
- 語氣溫暖但帶有神秘感
- 避免空洞的場面話
- 逆位牌要特別說明其能量轉變與提醒意義`;
  }

  return 'You are a skilled tarot reader. Provide a detailed, insightful interpretation based on the drawn cards, spread positions, and the querent question. Use Markdown formatting with clear sections.';
}

function buildUserPrompt(request: AIInterpretationRequest): string {
  const spreadName =
    request.spreadType === 'single'
      ? '單牌占卜'
      : request.spreadType === 'three-card'
        ? '三牌占卜（過去／現在／未來）'
        : '凱爾特十字（十牌全面解析）';

  const cardsDescription = request.drawnCards
    .map(
      (dc) =>
        `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${
          dc.isReversed ? '逆位' : '正位'
        }`,
    )
    .join('\n');

  const positionGuide =
    request.spreadType === 'celtic-cross'
      ? `\n\n**位置含義參考：**
- 現況：目前的核心狀態
- 挑戰：面臨的主要障礙或影響
- 潛意識：深層的隱藏因素
- 過去：近期過往的影響
- 可能性：最佳可能的結果
- 近未來：即將發生的事件
- 自我：問卜者對情況的態度
- 環境：周圍人事物的影響
- 希望與恐懼：內心的期盼或擔憂
- 最終結果：事件的最終走向`
      : '';

  return `**問題：** ${request.question}

**牌陣：** ${spreadName}

**抽出的牌：**
${cardsDescription}${positionGuide}

請提供完整且深度的塔羅解讀。`;
}

function parseSuggestedQuestions(text: string): string[] {
  // 建議追問用 HTML 註解包住，前端渲染 Markdown 前會移除，不會顯示在解讀正文。
  const match = text.match(/<!-- SUGGESTED_QUESTIONS:([\s\S]*?)-->/);
  if (!match) return [];
  return match[1]
    .split('\n')
    .map((line) => line.replace(/^[\s\-*\d.]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function cleanText(text: string): string {
  return text.replace(/<!-- SUGGESTED_QUESTIONS:[\s\S]*?-->/g, '').trim();
}

async function chat(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number,
): Promise<{ text: string; usage?: ChatUsage }> {
  const apiKey = openAIKey.value();
  if (!apiKey) {
    throw new HttpsError('failed-precondition', 'OPENAI_API_KEY 尚未設定');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new HttpsError('internal', `OpenAI API 錯誤 (${response.status}): ${body}`);
  }

  const data = (await response.json()) as ChatResponse;
  return {
    text: data.choices?.[0]?.message?.content ?? '',
    usage: data.usage,
  };
}

function toResponse(text: string, usage?: ChatUsage): AIInterpretationResponse {
  // 前後端共用同樣 response shape，前端 provider 可以無縫替換 mock/openai/functions。
  const suggestedQuestions = parseSuggestedQuestions(text);
  const cleanedText = cleanText(text);
  const lines = cleanedText.trim().split('\n').filter(Boolean);
  const summary = lines[lines.length - 1]?.replace(/^[#*>\s]+/, '') || '';

  return {
    interpretation: cleanedText,
    summary,
    suggestedQuestions,
    tokenUsage: usage
      ? { input: usage.prompt_tokens, output: usage.completion_tokens }
      : undefined,
  };
}

export const generateTarotReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    // Callable Function 會自動處理 Firebase Web SDK 的 envelope 格式與 CORS。
    const uid = requireUid(request.auth?.uid);
    const data = assertInterpretationRequest(request.data);
    const systemPrompt =
      buildSystemPrompt(data.locale) +
      `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問，用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;
    const userPrompt = buildUserPrompt(data);
    await chargeQuestionCredits(uid, `全新占卜：${data.spreadType}`);

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        3000,
      );

      return toResponse(result.text, result.usage);
    } catch (error) {
      await refundQuestionCredits(uid, 'AI 解讀失敗退還點數');
      throw error;
    }
  },
);

export const followUpReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    // 追問沿用原始牌陣與前次解讀摘要，避免 AI 忘記上下文。
    const uid = requireUid(request.auth?.uid);
    const data = assertFollowUpRequest(request.data);
    const cardsDescription = data.originalRequest.drawnCards
      .map(
        (dc) =>
          `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${
            dc.isReversed ? '逆位' : '正位'
          }`,
      )
      .join('\n');

    const systemPrompt = `你是一位資深塔羅占卜師，正在為問卜者進行深入的追問解讀。

請根據原始牌陣和之前解讀，針對追問提供更深入、更具體的分析與建議。回應長度至少 400 字，使用 Markdown 格式。

結構：
## 深入解析
## 具體行動方案
## 寄語

同樣在結尾附上建議追問：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;

    const userPrompt = `**原始問題：** ${data.originalRequest.question}
**牌陣中的牌：**
${cardsDescription}

**之前的解讀摘要：**
${data.originalInterpretation.slice(0, 1500)}

---

**問卜者的追問：** ${data.followUpQuestion}

請針對這個追問提供深入解讀。`;

    await chargeQuestionCredits(uid, '占卜追問');

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        2000,
      );

      return toResponse(result.text, result.usage);
    } catch (error) {
      await refundQuestionCredits(uid, 'AI 追問失敗退還點數');
      throw error;
    }
  },
);

export const getCreditBalance = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth?.uid);
  return ensureCreditAccount(uid);
});

export const createCreditPurchase = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth?.uid);
  await ensureCreditAccount(uid);

  const packageId = request.data?.packageId as CreditPackageId | undefined;
  if (!packageId || !CREDIT_PACKAGES[packageId]) {
    throw new HttpsError('invalid-argument', '點數包不存在');
  }

  const product = CREDIT_PACKAGES[packageId];
  return {
    message: `已選擇 ${product.credits} 點 / NT$${product.priceTwd}。金流尚未串接，接上 Stripe 或綠界 checkout 後會在 webhook 驗證付款再入點。`,
  };
});

export const createSubscription = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth?.uid);
  await ensureCreditAccount(uid);

  const planId = request.data?.planId as Exclude<SubscriptionTier, 'none'> | undefined;
  if (!planId || !SUBSCRIPTION_PLANS[planId]) {
    throw new HttpsError('invalid-argument', '訂閱方案不存在');
  }

  const product = SUBSCRIPTION_PLANS[planId];
  return {
    message: `已選擇每月 ${product.credits} 點 / NT$${product.priceTwd}。金流尚未串接，接上訂閱 webhook 後才會啟用方案並發放每月點數。`,
  };
});
