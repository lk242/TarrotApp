import { createHash, randomBytes } from 'node:crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
const APP_BASE_URL = 'https://mystic-tarot-2026.web.app';
const ECPAY_CHECKOUT_URL = 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
const ECPAY_MERCHANT_ID = '3002607';
const ECPAY_HASH_KEY = 'pwFHCqoQZGmho4w6';
const ECPAY_HASH_IV = 'EkRm7iFT261dpevs';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'lukewolf899@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const db = getFirestore();
const adminAuth = getAuth();

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

interface EcpayCheckoutField {
  name: string;
  value: string;
}

interface PaymentOrder {
  userId: string;
  type: 'credit_package';
  packageId: CreditPackageId;
  credits: number;
  amountTwd: number;
  status: 'pending' | 'paid' | 'failed' | 'expired';
  provider: 'ecpay';
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

interface LineIdTokenPayload {
  sub?: string;
  name?: string;
  picture?: string;
  aud?: string;
}

interface LineProfileResponse {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
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

function requireAdmin(email?: string): string {
  const normalizedEmail = email?.toLowerCase();
  if (!normalizedEmail || !ADMIN_EMAILS.includes(normalizedEmail)) {
    throw new HttpsError('permission-denied', '你沒有管理點數的權限');
  }
  return normalizedEmail;
}

function requireLineChannelId(): string {
  const channelId = process.env.LINE_LOGIN_CHANNEL_ID ?? '';
  if (!channelId) {
    throw new HttpsError('failed-precondition', 'LINE_LOGIN_CHANNEL_ID 尚未設定');
  }
  return channelId;
}

async function verifyLineIdToken(idToken: string): Promise<LineIdTokenPayload> {
  const channelId = requireLineChannelId();
  const params = new URLSearchParams();
  params.set('id_token', idToken);
  params.set('client_id', channelId);

  const response = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LINE verify failed (${response.status}):`, errorBody);
    throw new HttpsError('unauthenticated', `LINE 登入驗證失敗: ${errorBody}`);
  }

  const payload = (await response.json()) as LineIdTokenPayload;
  if (!payload.sub) {
    throw new HttpsError('unauthenticated', 'LINE 登入資料無效：缺少 user id');
  }
  if (payload.aud !== channelId) {
    console.error(`LINE aud mismatch: expected=${channelId}, got=${payload.aud}`);
    throw new HttpsError('unauthenticated', 'LINE 登入資料無效：channel 不符');
  }

  return payload;
}

async function getLineProfileByAccessToken(accessToken: string): Promise<LineIdTokenPayload> {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`LINE profile API failed (${response.status}):`, errorBody);
    throw new HttpsError('unauthenticated', 'LINE access token 驗證失敗');
  }

  const profile = (await response.json()) as LineProfileResponse;
  if (!profile.userId) {
    throw new HttpsError('unauthenticated', 'LINE 使用者資料無效');
  }

  return {
    sub: profile.userId,
    name: profile.displayName,
    picture: profile.pictureUrl,
  };
}

async function ensureLineFirebaseUser(payload: LineIdTokenPayload): Promise<string> {
  if (!payload.sub) {
    throw new HttpsError('unauthenticated', 'LINE 使用者資料缺少 user id');
  }

  const uid = `line:${payload.sub}`;

  try {
    const user = await adminAuth.getUser(uid);
    const needsUpdate =
      (payload.name && user.displayName !== payload.name) ||
      (payload.picture && user.photoURL !== payload.picture);

    if (needsUpdate) {
      await adminAuth.updateUser(uid, {
        displayName: payload.name,
        photoURL: payload.picture,
      });
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'auth/user-not-found'
    ) {
      await adminAuth.createUser({
        uid,
        displayName: payload.name,
        photoURL: payload.picture,
      });
    } else {
      throw error;
    }
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

function formatTaipeiDate(date = new Date()): Record<string, string> {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((parts, part) => {
      parts[part.type] = part.value;
      return parts;
    }, {});
}

function toEcpayDate(date = new Date()): string {
  const parts = formatTaipeiDate(date);
  return `${parts.year}/${parts.month}/${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function createMerchantTradeNo(): string {
  // 綠界 MerchantTradeNo 限 20 碼英數字且不可重複。
  return `T${Date.now().toString(36).toUpperCase()}${randomBytes(3).toString('hex').toUpperCase()}`.slice(
    0,
    20,
  );
}

function ecpayEncode(value: string): string {
  return encodeURIComponent(value)
    .toLowerCase()
    .replace(/%20/g, '+')
    .replace(/%21/g, '!')
    .replace(/%28/g, '(')
    .replace(/%29/g, ')')
    .replace(/%2a/g, '*')
    .replace(/%2d/g, '-')
    .replace(/%2e/g, '.')
    .replace(/%5f/g, '_');
}

function createEcpayCheckMacValue(params: Record<string, string | number>): string {
  const serialized = Object.entries(params)
    .filter(([key]) => key !== 'CheckMacValue')
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  const raw = `HashKey=${ECPAY_HASH_KEY}&${serialized}&HashIV=${ECPAY_HASH_IV}`;
  return createHash('sha256').update(ecpayEncode(raw)).digest('hex').toUpperCase();
}

function createEcpayCheckoutFields(params: Record<string, string | number>): EcpayCheckoutField[] {
  const signedParams = {
    ...params,
    CheckMacValue: createEcpayCheckMacValue(params),
  };
  return Object.entries(signedParams).map(([name, value]) => ({ name, value: String(value) }));
}

function getRequestBody(request: { body?: unknown; rawBody?: Buffer }): Record<string, string> {
  if (request.body && typeof request.body === 'object') {
    return Object.fromEntries(
      Object.entries(request.body).map(([key, value]) => [key, String(value)]),
    );
  }

  const raw = request.rawBody?.toString('utf8') ?? '';
  return Object.fromEntries(new URLSearchParams(raw).entries());
}

async function grantPurchasedCredits(orderId: string, body: Record<string, string>): Promise<void> {
  const orderRef = db.doc(`paymentOrders/${orderId}`);

  await db.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    const order = orderSnapshot.data() as PaymentOrder | undefined;

    if (!orderSnapshot.exists || !order) {
      throw new Error('payment order not found');
    }

    if (order.status === 'paid') {
      return;
    }

    if (order.status !== 'pending') {
      throw new Error(`payment order is ${order.status}`);
    }

    if (Number(body.TradeAmt) !== order.amountTwd) {
      throw new Error('trade amount mismatch');
    }

    const userRef = db.doc(`users/${order.userId}`);
    transaction.update(orderRef, {
      status: 'paid',
      providerTradeNo: body.TradeNo ?? '',
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      notifyPayload: body,
    });
    transaction.update(userRef, {
      balance: FieldValue.increment(order.credits),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(userRef.collection('creditTransactions').doc(), {
      amount: order.credits,
      type: 'purchase',
      reason: `綠界點數包付款：${order.packageId}`,
      paymentOrderId: orderId,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
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

async function getRecentCreditTransactions(uid: string) {
  const snapshot = await db
    .collection(`users/${uid}/creditTransactions`)
    .orderBy('createdAt', 'desc')
    .limit(10)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      amount: Number(data.amount ?? 0),
      type: String(data.type ?? 'adjustment'),
      reason: String(data.reason ?? ''),
      createdAt: toMillis(data.createdAt) ?? 0,
    };
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

你必須提供清楚且有深度的解讀，回應長度約 450 到 650 字。請嚴格依照以下 Markdown 格式結構回應：

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
        1800,
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

請根據原始牌陣和之前解讀，針對追問提供具體的分析與建議。回應長度約 250 到 350 字，使用 Markdown 格式。

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
        1000,
      );

      return toResponse(result.text, result.usage);
    } catch (error) {
      await refundQuestionCredits(uid, 'AI 追問失敗退還點數');
      throw error;
    }
  },
);

export const signInWithLine = onCall({ region: REGION }, async (request) => {
  const idToken = String(request.data?.idToken ?? '').trim();
  const accessToken = String(request.data?.accessToken ?? '').trim();

  if (!idToken && !accessToken) {
    throw new HttpsError('invalid-argument', '缺少 LINE 登入憑證');
  }

  // 優先用 ID token 驗證；若沒有則用 access token 取 profile
  const payload = idToken
    ? await verifyLineIdToken(idToken)
    : await getLineProfileByAccessToken(accessToken);

  const uid = await ensureLineFirebaseUser(payload);
  const customToken = await adminAuth.createCustomToken(uid, {
    provider: 'line',
    lineSub: payload.sub,
  });

  await ensureCreditAccount(uid);
  return { customToken };
});

export const getCreditBalance = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth?.uid);
  return ensureCreditAccount(uid);
});

export const adminCheckAccess = onCall({ region: REGION }, async (request) => {
  const email = requireAdmin(request.auth?.token.email as string | undefined);
  return { email };
});

export const adminFindCreditUser = onCall({ region: REGION }, async (request) => {
  requireAdmin(request.auth?.token.email as string | undefined);

  const query = String(request.data?.query ?? '').trim();
  if (!query) {
    throw new HttpsError('invalid-argument', '請輸入使用者 email 或 uid');
  }

  const authUser = query.includes('@')
    ? await adminAuth.getUserByEmail(query)
    : await adminAuth.getUser(query);
  const profile = await ensureCreditAccount(authUser.uid);
  const transactions = await getRecentCreditTransactions(authUser.uid);

  return {
    user: {
      uid: authUser.uid,
      email: authUser.email ?? '',
      displayName: authUser.displayName ?? '',
      photoURL: authUser.photoURL ?? '',
      disabled: authUser.disabled,
    },
    profile,
    transactions,
  };
});

export const adminAdjustCredits = onCall({ region: REGION }, async (request) => {
  const adminEmail = requireAdmin(request.auth?.token.email as string | undefined);
  const userId = String(request.data?.userId ?? '').trim();
  const amount = Number(request.data?.amount);
  const reason = String(request.data?.reason ?? '').trim().slice(0, 200);

  if (!userId || !Number.isInteger(amount) || amount === 0 || Math.abs(amount) > 100000) {
    throw new HttpsError('invalid-argument', '調整點數格式不正確');
  }

  if (!reason) {
    throw new HttpsError('invalid-argument', '請填寫調整原因');
  }

  await adminAuth.getUser(userId);
  await ensureCreditAccount(userId);

  const userRef = db.doc(`users/${userId}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data();
    const balance = Number(current?.balance ?? 0);
    const nextBalance = balance + amount;

    if (nextBalance < 0) {
      throw new HttpsError('failed-precondition', '扣點後餘額不能小於 0');
    }

    transaction.update(userRef, {
      balance: nextBalance,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(userRef.collection('creditTransactions').doc(), {
      amount,
      type: 'adjustment',
      reason,
      adminEmail,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  const profile = await ensureCreditAccount(userId);
  const transactions = await getRecentCreditTransactions(userId);
  return { profile, transactions };
});

export const createCreditPurchase = onCall({ region: REGION }, async (request) => {
  const uid = requireUid(request.auth?.uid);
  await ensureCreditAccount(uid);

  const packageId = request.data?.packageId as CreditPackageId | undefined;
  if (!packageId || !CREDIT_PACKAGES[packageId]) {
    throw new HttpsError('invalid-argument', '點數包不存在');
  }

  const product = CREDIT_PACKAGES[packageId];
  const orderId = createMerchantTradeNo();
  const orderRef = db.doc(`paymentOrders/${orderId}`);
  await orderRef.create({
    userId: uid,
    type: 'credit_package',
    packageId,
    credits: product.credits,
    amountTwd: product.priceTwd,
    status: 'pending',
    provider: 'ecpay',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const params = {
    MerchantID: ECPAY_MERCHANT_ID,
    MerchantTradeNo: orderId,
    MerchantTradeDate: toEcpayDate(),
    PaymentType: 'aio',
    TotalAmount: product.priceTwd,
    TradeDesc: 'MysticTarotCredits',
    ItemName: `神秘塔羅${product.credits}點`,
    ReturnURL: `https://${REGION}-mystic-tarot-2026.cloudfunctions.net/ecpayNotify`,
    ChoosePayment: 'ALL',
    EncryptType: 1,
    ClientBackURL: `${APP_BASE_URL}/billing?payment=pending&orderId=${orderId}`,
    CustomField1: uid.slice(0, 50),
    CustomField2: packageId,
  };

  return {
    orderId,
    checkout: {
      action: ECPAY_CHECKOUT_URL,
      fields: createEcpayCheckoutFields(params),
    },
    message: `已建立綠界測試訂單 ${orderId}，付款成功並收到綠界 ReturnURL 通知後會自動入點。`,
  };
});

export const ecpayNotify = onRequest({ region: REGION }, async (request, response) => {
  if (request.method !== 'POST') {
    response.status(405).send('0|Method Not Allowed');
    return;
  }

  const body = getRequestBody(request);
  const receivedCheckMacValue = body.CheckMacValue;
  const expectedCheckMacValue = createEcpayCheckMacValue(body);

  if (!receivedCheckMacValue || receivedCheckMacValue !== expectedCheckMacValue) {
    response.status(400).send('0|CheckMacValueError');
    return;
  }

  const orderId = body.MerchantTradeNo;
  if (!orderId) {
    response.status(400).send('0|Missing MerchantTradeNo');
    return;
  }

  const orderRef = db.doc(`paymentOrders/${orderId}`);

  try {
    if (body.SimulatePaid === '1') {
      await orderRef.set(
        {
          status: 'pending',
          lastSimulatedNotifyAt: FieldValue.serverTimestamp(),
          notifyPayload: body,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      response.status(200).send('1|OK');
      return;
    }

    if (body.RtnCode === '1') {
      await grantPurchasedCredits(orderId, body);
      response.status(200).send('1|OK');
      return;
    }

    await orderRef.set(
      {
        status: 'failed',
        failedAt: FieldValue.serverTimestamp(),
        notifyPayload: body,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    response.status(200).send('1|OK');
  } catch (error) {
    console.error('ECPay notify failed:', error);
    response.status(500).send('0|ServerError');
  }
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
