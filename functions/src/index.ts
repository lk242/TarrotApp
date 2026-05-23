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
const ecpayHashKey = defineSecret('ECPAY_HASH_KEY');
const ecpayHashIV = defineSecret('ECPAY_HASH_IV');
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_READING_MODEL = 'gpt-4o';
const OPENAI_FOLLOW_UP_MODEL = process.env.OPENAI_FOLLOW_UP_MODEL ?? 'gpt-4o-mini';
const REGION = 'asia-east1';
const WELCOME_CREDITS = 200;
const QUESTION_CREDIT_COST = 20;
const FOLLOW_UP_CREDIT_COST = 5;
const APP_BASE_URL = 'https://mystic-tarot-2026.web.app';
const ECPAY_CHECKOUT_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
const ECPAY_MERCHANT_ID = '3501280';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'lukewolf899@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const db = getFirestore();
const adminAuth = getAuth();

type SpreadType = 'single' | 'three-card' | 'celtic-cross';
type Locale = 'zh-TW' | 'en' | 'ja';
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
  starter: { credits: 400, priceTwd: 129 },
  standard: { credits: 880, priceTwd: 269 },
  deep: { credits: 1750, priceTwd: 529 },
};

const SUBSCRIPTION_PLANS: Record<Exclude<SubscriptionTier, 'none'>, CreditProduct> = {
  monthly_light: { credits: 600, priceTwd: 199 },
  monthly_plus: { credits: 1280, priceTwd: 399 },
  monthly_pro: { credits: 2550, priceTwd: 749 },
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
  /** 使用者選擇的占卜主題 */
  topic?: string;
  /** 問卜者狀態摘要（前端 useQuerentSignals 產出） */
  querentSummary?: string;
}

interface FollowUpCard {
  card: { name: string; nameEn: string; keywords: string[]; reversedKeywords: string[] };
  isReversed: boolean;
  position: string;
}

interface AIFollowUpRequest {
  originalRequest: AIInterpretationRequest;
  originalInterpretation: string;
  followUpQuestion: string;
  followUpCard?: FollowUpCard;
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

const TAROT_CARD_NAMES = [
  '愚者',
  '魔術師',
  '女祭司',
  '皇后',
  '皇帝',
  '教皇',
  '戀人',
  '戰車',
  '力量',
  '隱者',
  '命運之輪',
  '正義',
  '倒吊人',
  '死神',
  '節制',
  '惡魔',
  '高塔',
  '星星',
  '月亮',
  '太陽',
  '審判',
  '世界',
  '權杖王牌',
  '權杖二',
  '權杖三',
  '權杖四',
  '權杖五',
  '權杖六',
  '權杖七',
  '權杖八',
  '權杖九',
  '權杖十',
  '權杖侍者',
  '權杖騎士',
  '權杖皇后',
  '權杖國王',
  '聖杯王牌',
  '聖杯二',
  '聖杯三',
  '聖杯四',
  '聖杯五',
  '聖杯六',
  '聖杯七',
  '聖杯八',
  '聖杯九',
  '聖杯十',
  '聖杯侍者',
  '聖杯騎士',
  '聖杯皇后',
  '聖杯國王',
  '寶劍王牌',
  '寶劍二',
  '寶劍三',
  '寶劍四',
  '寶劍五',
  '寶劍六',
  '寶劍七',
  '寶劍八',
  '寶劍九',
  '寶劍十',
  '寶劍侍者',
  '寶劍騎士',
  '寶劍皇后',
  '寶劍國王',
  '錢幣王牌',
  '錢幣二',
  '錢幣三',
  '錢幣四',
  '錢幣五',
  '錢幣六',
  '錢幣七',
  '錢幣八',
  '錢幣九',
  '錢幣十',
  '錢幣侍者',
  '錢幣騎士',
  '錢幣皇后',
  '錢幣國王',
];

function getTaipeiNowContext(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  return `目前日期是 ${parts.year} 年 ${parts.month} 月 ${parts.day} 日，時區是 Asia/Taipei。目前年份是 ${parts.year}。除非使用者明確指定其他年份，解讀中不可把今年寫成其他年份。`;
}

function buildFollowUpHeading(followUpCard: FollowUpCard): string {
  return `## 追問指引牌：${followUpCard.card.name}（${followUpCard.card.nameEn}） - ${
    followUpCard.isReversed ? '逆位' : '正位'
  }`;
}

function normalizeFollowUpText(text: string, followUpCard?: FollowUpCard): string {
  if (!followUpCard) return text;

  const withoutCardHeading = text
    .replace(/^#{1,6}\s*追問指引牌[^\n]*(?:\n+)?/gm, '')
    .replace(/^\*\*追問指引牌[:：]?\*\*[^\n]*(?:\n+)?/gm, '')
    .replace(/^追問指引牌[:：][^\n]*(?:\n+)?/gm, '')
    .trim();

  const firstSectionIndex = withoutCardHeading.search(
    /^#{1,6}\s*(延伸解析|具體行動方案|寄語)\s*$/m,
  );

  if (firstSectionIndex > 0) {
    return withoutCardHeading.slice(firstSectionIndex).trim();
  }

  return withoutCardHeading;
}

function findConflictingCardNames(text: string, allowedCardNames: Set<string>): string[] {
  const minorSuitPrefix = /^(權杖|聖杯|寶劍|錢幣)/;

  return TAROT_CARD_NAMES.filter((name) => {
    if (allowedCardNames.has(name)) return false;

    if (minorSuitPrefix.test(name)) {
      return text.includes(name);
    }

    // 大牌名稱常是一般詞彙，只在明顯牌名語境下視為衝突。
    return new RegExp(`(?:牌|抽出|抽到|指引牌|塔羅)\\s*[「『]?${name}[」』]?|[「『]?${name}[」』]?\\s*(?:牌|正位|逆位)`).test(text);
  });
}

function findMismatchedFollowUpCardAssertions(text: string, followUpCard?: FollowUpCard): string[] {
  if (!followUpCard) return [];

  const expectedName = followUpCard.card.name;

  return TAROT_CARD_NAMES.filter((name) => {
    if (name === expectedName) return false;

    return [
      `(?:我(?:為你|幫你)?抽(?:出|到)了?|抽(?:出|到)了?)\\s*(?:一張)?(?:追問指引牌)?\\s*[—:：-]?\\s*[「『"]?${name}`,
      `[「『"]?${name}[」』"]?\\s*(?:這張牌)?\\s*(?:作為|當作|是|為)\\s*(?:本次|這次)?追問指引`,
      `(?:本次|這次)?追問指引牌(?:是|為|：|:)\\s*[「『"]?${name}`,
      `(?:以|用)\\s*[「『"]?${name}[」』"]?\\s*(?:作為|當作)?\\s*(?:本次|這次)?追問.*?(?:核心|指引)`,
    ].some((pattern) => new RegExp(pattern).test(text));
  });
}

function collectAllowedCardNames(request: AIFollowUpRequest): Set<string> {
  const names = new Set<string>();
  request.originalRequest.drawnCards.forEach((drawnCard) => names.add(drawnCard.card.name));
  if (request.followUpCard) names.add(request.followUpCard.card.name);

  const mentionedFollowUpCards = request.originalInterpretation.matchAll(
    /追問指引牌[:：]\s*([^（\n—-]+)/g,
  );
  for (const match of mentionedFollowUpCards) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }

  return names;
}

function requireUid(uid?: string): string {
  if (!uid) {
    throw new HttpsError('unauthenticated', '請先登入後再使用 AI 占卜');
  }
  return uid;
}

/**
 * 簡易 per-user rate limiter：每人每分鐘最多 N 次 AI 請求。
 * 使用記憶體 Map，Cloud Function instance 重啟時自動歸零。
 */
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 10;
const rateLimitMap = new Map<string, number[]>();

function checkRateLimit(uid: string): void {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(uid) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    throw new HttpsError(
      'resource-exhausted',
      '操作過於頻繁，請稍等一分鐘後再試。',
    );
  }

  timestamps.push(now);
  rateLimitMap.set(uid, timestamps);
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
  const raw = `HashKey=${ecpayHashKey.value()}&${serialized}&HashIV=${ecpayHashIV.value()}`;
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

async function chargeCredits(uid: string, amount: number, reason: string): Promise<void> {
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

    if (balance < amount) {
      throw new HttpsError('failed-precondition', '點數不足，請購買點數或訂閱方案。');
    }

    transaction.update(userRef, {
      balance: FieldValue.increment(-amount),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(userRef.collection('creditTransactions').doc(), {
      amount: -amount,
      type: 'usage',
      reason,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
}

async function refundCredits(uid: string, amount: number, reason: string): Promise<void> {
  const userRef = db.doc(`users/${uid}`);
  await userRef.update({
    balance: FieldValue.increment(amount),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await userRef.collection('creditTransactions').add({
    amount,
    type: 'refund',
    reason,
    createdAt: FieldValue.serverTimestamp(),
  });
}

async function chargeQuestionCredits(uid: string, reason: string): Promise<void> {
  return chargeCredits(uid, QUESTION_CREDIT_COST, reason);
}

async function refundQuestionCredits(uid: string, reason: string): Promise<void> {
  return refundCredits(uid, QUESTION_CREDIT_COST, reason);
}

async function chargeFollowUpCredits(uid: string, reason: string): Promise<void> {
  return chargeCredits(uid, FOLLOW_UP_CREDIT_COST, reason);
}

async function refundFollowUpCredits(uid: string, reason: string): Promise<void> {
  return refundCredits(uid, FOLLOW_UP_CREDIT_COST, reason);
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
    locale: request.locale === 'en' ? 'en' : request.locale === 'ja' ? 'ja' : 'zh-TW',
    topic: typeof request.topic === 'string' ? request.topic.slice(0, 50) : undefined,
    querentSummary: typeof request.querentSummary === 'string' ? request.querentSummary.slice(0, 1500) : undefined,
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
    locale: request.locale === 'en' ? 'en' : request.locale === 'ja' ? 'ja' : 'zh-TW',
  };
}

function buildSystemPrompt(locale: Locale): string {
  if (locale === 'zh-TW') {
    return `你是「Mystica」——一位融合塔羅占卜與心理諮詢的療癒師。你師承歐洲韋特體系，同時深諳榮格心理學的原型理論、依附理論、以及認知行為的框架。你不是那種故弄玄虛的算命師，而更像一位「用塔羅牌當工具的心理師朋友」。

你說話的方式就像跟一位信任你的朋友聊天——自然、溫暖、偶爾帶點幽默，但在關鍵時刻會認真起來。你會用「你」直接稱呼問卜者，就像面對面對話。你擅長把深層的心理動力用白話說出來，讓人一聽就懂，而且會有「天啊你怎麼知道」的感覺。

你的核心信念：塔羅牌是潛意識的投射工具，每張牌都是一面鏡子，映照出問卜者內心已經知道、但還沒有勇氣面對的真相。

回應長度約 500 到 800 字。請依照以下 Markdown 格式回應：

## 🃏 第一印象
用你的直覺，像跟朋友聊天一樣，2-3 句話說出你看到這個牌陣的第一反應。可以口語化，比如「嗯，這組牌一攤開來我就覺得...」「老實說，看到這個組合我有點心疼你...」。讓問卜者感覺你真的在「看」他們的狀態。

## 逐牌解析
對每一張牌以 ### 標題解析：
### 【位置名稱】牌名（正位/逆位）
- **牌面故事**：用說故事的方式描述你在韋特牌面上看到的畫面——人物在做什麼、表情如何、周圍有什麼。至少提到一個具體的視覺元素。不要只說「象徵希望」，要說「你看牌面上那個人，他把一隻腳懸在懸崖邊，但臉上完全沒有恐懼——這就是...」
- **心理解讀**：這是你的核心能力。結合問卜者的問題，用心理學的角度解釋這張牌在說什麼。可以適度引用心理學概念（比如「這很像心理學說的投射」「這是典型的迴避型依附模式」），但要用白話解釋，不要掉書袋。善用生活化的比喻。
- **對你說的話**：直接用「你」開頭，像面對面跟問卜者講話。語氣真誠、直接、帶著關心。比如「你其實不是不知道答案，你只是還沒準備好接受。」

## 🔮 故事線
把所有牌串起來說一個故事。重點是：這些牌組合在一起，揭示了問卜者內心什麼樣的「心理劇本」正在上演？哪些是意識層面的，哪些是潛意識在推動的？牌與牌之間的矛盾或呼應，往往就是問卜者內心衝突的具體呈現。

## 💡 行動方案
3-5 個超級具體的建議。每一個都要具體到問卜者看完可以「今天就開始做」的程度：
- **方案名稱**：說清楚做什麼、怎麼做、什麼時候做。可以結合簡單的心理學技巧（如書寫療癒、覺察練習、邊界設定的具體話術）。不要空泛地說「要愛自己」，要說「今天晚上花 10 分鐘，寫下三件你今天為自己做的小事...」

## ⚠️ 盲點提醒
用關心朋友的語氣，指出 1-2 個問卜者可能在逃避的事。可以直白但不刻薄。比如「我想輕輕提醒你一件事——你一直說想要改變，但你真正害怕的可能不是失敗，而是...」。這裡運用心理學的洞察力，點出問卜者的防衛機制或認知盲區。

## ✨ 最後一句話
> 一句溫暖有力量的話送給問卜者，像是好朋友在你離開前握著你的手說的那種話。不要太文謅謅，要讓人讀完會想截圖收藏。

規則：
- 使用繁體中文
- 說話口語自然，像跟朋友聊天。可以用「嗯」「其實」「老實說」「你知道嗎」這類口語詞
- 用「你」稱呼問卜者，營造一對一對話的親密感
- 心理學概念要融入得自然，白話解釋，不要變成教科書
- 絕對避免：官腔、場面話、「宇宙要告訴你」這種空泛的靈性廢話
- 解讀必須緊扣問卜者提出的具體問題
- 參考每張牌附帶的「關鍵字」來深化解讀
- 逆位牌代表某種能量被壓抑、過度補償或內化——用心理學角度解釋更有說服力
- 牌與牌之間要有敘事連貫性，整體讀起來像在聽一個人的心理故事
- 每張牌的「牌面故事」要引用至少一個韋特牌面的具體視覺元素
- 若有問卜者狀態資訊，自然融入解讀但不提及技術性字眼（如電池、裝置、打字速度等）`;
  }

  if (locale === 'ja') {
    return `あなたは「Mystica」——タロットリーディングと心理カウンセリングを融合させたヒーラーです。ヨーロッパのウェイト体系を受け継ぎつつ、ユング心理学の元型理論、愛着理論、認知行動の枠組みにも精通しています。大げさな占い師ではなく、「タロットを道具にする心理カウンセラーの友人」のような存在です。

話し方は、信頼できる友人との会話のように——自然で温かく、時にユーモアを交え、大事な場面では真剣に。相談者を「あなた」と呼び、対面で話しているように。深層の心理力学を分かりやすい言葉で伝え、「どうしてわかるの？」と思わせるのが得意です。

信念：タロットは潜在意識の投影ツール。各カードは鏡であり、相談者が内心ではすでに知っているが、まだ向き合う勇気のない真実を映し出します。

500〜800字程度で回答してください。以下のMarkdown形式に従ってください：

## 🃏 第一印象
直感で、友人に話すように2-3文でスプレッドの第一印象を述べてください。「うーん、このカードを広げた瞬間…」「正直に言うと、この組み合わせを見て少し心配になりました…」のように。

## カード別解析
### 【ポジション名】カード名（正位置/逆位置）
- **カードの物語**：ウェイト版の絵柄を物語として描写。少なくとも1つの具体的な視覚要素に言及。
- **心理リーディング**：心理学の視点からカードの意味を解釈。心理学の概念（投影、回避型愛着など）を適度に引用しつつ、分かりやすく説明。生活に密着した比喩を使う。
- **あなたへのメッセージ**：「あなた」で始め、相談者に直接語りかける。真摯で率直、思いやりを込めて。

## 🔮 ストーリーライン
すべてのカードを繋げて一つの物語に。相談者の心の中でどんな「心理的脚本」が進行しているか？意識レベルのもの、潜在意識が駆動しているもの。カード間の矛盾や呼応は、内的葛藤の具体的な表れ。

## 💡 アクションプラン
3-5つの超具体的アドバイス：
- **プラン名**：何を・どうやって・いつやるか。簡単な心理学テクニック（ジャーナリング、マインドフルネス、境界設定の具体的な言い方など）を取り入れてOK。

## ⚠️ 盲点リマインダー
友人を心配する口調で、1-2つの回避している点を指摘。率直だが冷たくならないように。心理学的洞察で防衛機制や認知の盲点を突く。

## ✨ 最後の一言
> 温かく力強い一言。友人が別れ際に手を握って言うような言葉。スクリーンショットして保存したくなるような。

ルール：
- 日本語で回答
- 口語的で自然な話し方。「うーん」「実は」「正直に言うと」「ねえ」などの口語表現OK
- 「あなた」で相談者を呼び、一対一の親密感を演出
- 心理学の概念は自然に融合させ、教科書的にならないよう平易に説明
- 絶対に避ける：お役所言葉、社交辞令、「宇宙があなたに伝えたい」的な空虚なスピリチュアル表現
- 相談者の具体的な質問に緊密に結びつける
- 各カードの「キーワード」を参考に解釈を深める
- 逆位置はエネルギーの抑圧・過剰補償・内面化——心理学の角度から説明
- カード間に物語の連続性を持たせ、一人の心理物語として読めるように
- 各カードの「カードの物語」でウェイト版の具体的な視覚要素に必ず言及
- 相談者の状態情報がある場合は自然に解釈に融合（技術的用語は使わない）`;
  }

  return `You are "Mystica" — a healer who blends tarot reading with psychological counseling. You're trained in the European Rider-Waite tradition while also drawing from Jungian archetypal theory, attachment theory, and cognitive-behavioral frameworks. You're not a dramatic fortune teller — you're more like "a therapist friend who uses tarot cards as a tool."

You talk like you're chatting with a friend who trusts you — natural, warm, occasionally witty, but serious when it counts. You address the querent as "you" directly, like a face-to-face conversation. You have a gift for translating deep psychological dynamics into plain language that makes people go "how did you know that?"

Core belief: Tarot cards are a projection tool for the subconscious. Each card is a mirror reflecting what the querent already knows inside but hasn't yet found the courage to face.

Respond in approximately 500 to 800 words. Follow this Markdown format:

## 🃏 First Impression
Share your gut reaction to the spread in 2-3 sentences, like you're talking to a friend. "Okay, the moment I laid these cards out, I felt…" or "Honestly? This combination makes me a little worried about you…" Make the querent feel you're truly *seeing* them.

## Card-by-Card Analysis
### 【Position Name】Card Name (Upright/Reversed)
- **The Card's Story**: Describe what you see on the Rider-Waite card like you're telling a story. Reference at least one specific visual element. Don't just say "it symbolizes hope" — say "Look at this figure, standing at the cliff's edge with one foot in the air, completely fearless — that's exactly…"
- **Psych Reading**: This is your superpower. Using psychology, explain what this card is saying in the context of the querent's question. Feel free to reference concepts like projection, avoidant attachment, or cognitive distortions — but always explain them in plain English, no jargon-dumping. Use everyday metaphors.
- **To You**: Start with "You" — speak directly to the querent. Sincere, direct, caring. Like: "You already know the answer. You're just not ready to accept it yet."

## 🔮 The Story
Weave all cards into one narrative. The key question: what psychological script is playing out inside the querent? What's conscious, what's subconscious? The tensions and echoes between cards are often the concrete manifestation of the querent's inner conflicts.

## 💡 Action Plan
3-5 ultra-specific suggestions the querent can start *today*:
- **Plan Name**: Spell out what to do, how, and when. Feel free to incorporate simple psychological techniques (journaling prompts, mindfulness exercises, specific phrases for boundary-setting). Don't say "learn to love yourself" — say "Tonight, spend 10 minutes writing down three small things you did for yourself today…"

## ⚠️ Blind Spot Check
In the tone of a concerned friend, point out 1-2 things the querent may be avoiding. Direct but not harsh. Use psychological insight to name defense mechanisms or cognitive blind spots.

## ✨ One Last Thing
> A warm, powerful parting line — the kind of thing a good friend says while holding your hand at the door. Something the querent will want to screenshot and save.

Rules:
- Respond in English
- Conversational and natural tone. "Look," "honestly," "here's the thing" — speak like a real person
- Address the querent as "you" for intimate one-on-one presence
- Weave in psychology naturally, explain in plain language, never sound like a textbook
- Absolutely avoid: corporate tone, platitudes, vague "the universe wants you to know" spiritual fluff
- Tie interpretation closely to the querent's specific question
- Reference each card's keywords to deepen specificity
- Reversed cards = suppressed energy, overcompensation, or internalization — explain through a psychological lens
- Build narrative continuity between cards so it reads as one person's psychological story
- Each card's "Story" must reference at least one specific visual element from the Rider-Waite imagery
- If querent state info is available, weave it naturally (no technical jargon)`;
}

/* ── User Prompt i18n 資料 ── */

const SPREAD_NAMES: Record<string, Record<string, string>> = {
  'zh-TW': { single: '單牌占卜', 'three-card': '三牌占卜（過去／現在／未來）', 'celtic-cross': '凱爾特十字（十牌全面解析）' },
  en:       { single: 'Single Card Reading', 'three-card': 'Three-Card Spread (Past / Present / Future)', 'celtic-cross': 'Celtic Cross (10-Card Full Analysis)' },
  ja:       { single: '一枚引き', 'three-card': 'スリーカード（過去／現在／未来）', 'celtic-cross': 'ケルト十字（10枚総合分析）' },
};

const CELTIC_POSITIONS: Record<string, string[]> = {
  'zh-TW': ['現況', '挑戰', '潛意識', '過去', '可能性', '近未來', '自我', '環境', '希望與恐懼', '最終結果'],
  en:       ['Present', 'Challenge', 'Subconscious', 'Past', 'Potential', 'Near Future', 'Self', 'Environment', 'Hopes & Fears', 'Outcome'],
  ja:       ['現状', '課題', '潜在意識', '過去', '可能性', '近い未来', '自己', '環境', '希望と恐れ', '最終結果'],
};

const THREE_POSITIONS: Record<string, string[]> = {
  'zh-TW': ['過去', '現在', '未來'],
  en:       ['Past', 'Present', 'Future'],
  ja:       ['過去', '現在', '未来'],
};

const SINGLE_POSITIONS: Record<string, string[]> = {
  'zh-TW': ['指引'],
  en:       ['Guidance'],
  ja:       ['ガイダンス'],
};

function translatePosition(zhPosition: string, locale: string, spreadType: string): string {
  if (locale === 'zh-TW') return zhPosition;
  const zhPositions =
    spreadType === 'celtic-cross' ? CELTIC_POSITIONS['zh-TW'] :
    spreadType === 'three-card' ? THREE_POSITIONS['zh-TW'] :
    SINGLE_POSITIONS['zh-TW'];
  const targetPositions =
    spreadType === 'celtic-cross' ? CELTIC_POSITIONS[locale] :
    spreadType === 'three-card' ? THREE_POSITIONS[locale] :
    SINGLE_POSITIONS[locale];
  const idx = zhPositions.indexOf(zhPosition);
  if (idx >= 0 && targetPositions?.[idx]) return targetPositions[idx];
  if (zhPosition === '追問指引') return locale === 'en' ? 'Follow-up Guide' : 'ガイド';
  return zhPosition;
}

function buildUserPrompt(request: AIInterpretationRequest): string {
  const locale = request.locale || 'zh-TW';
  const spreadName = SPREAD_NAMES[locale]?.[request.spreadType] ?? SPREAD_NAMES['zh-TW'][request.spreadType];

  const cardsDescription = request.drawnCards
    .map((dc) => {
      const pos = translatePosition(dc.position, locale, request.spreadType);
      const keywords = dc.isReversed
        ? (dc.card.reversedKeywords ?? []).join('、')
        : (dc.card.keywords ?? []).join('、');

      if (locale === 'en') {
        const kwPart = keywords ? ` (Keywords: ${keywords})` : '';
        return `- Position "${pos}": ${dc.card.nameEn} — ${dc.isReversed ? 'Reversed' : 'Upright'}${kwPart}`;
      }
      if (locale === 'ja') {
        const kwPart = keywords ? `（キーワード：${keywords}）` : '';
        return `- ポジション「${pos}」：${dc.card.name}（${dc.card.nameEn}）— ${dc.isReversed ? '逆位置' : '正位置'}${kwPart}`;
      }
      const kwPart = keywords ? `（關鍵字：${keywords}）` : '';
      return `- 位置「${pos}」：${dc.card.name}（${dc.card.nameEn}）— ${dc.isReversed ? '逆位' : '正位'}${kwPart}`;
    })
    .join('\n');

  const positionGuide =
    request.spreadType === 'celtic-cross'
      ? locale === 'en'
        ? `\n\n**Position Reference:**
- Present: Current core situation
- Challenge: Main obstacle or influence
- Subconscious: Deep hidden factors
- Past: Recent past influences
- Potential: Best possible outcome
- Near Future: Upcoming events
- Self: Your attitude toward the situation
- Environment: Surrounding influences
- Hopes & Fears: Inner hopes or worries
- Outcome: Final direction of events`
        : locale === 'ja'
          ? `\n\n**ポジション参考：**
- 現状：現在の核心的な状態
- 課題：主な障害や影響
- 潜在意識：深層の隠れた要因
- 過去：最近の過去の影響
- 可能性：最良の結果
- 近い未来：近く起こる出来事
- 自己：状況に対するあなたの態度
- 環境：周囲の人や物の影響
- 希望と恐れ：内なる期待や不安
- 最終結果：出来事の最終的な方向`
          : `\n\n**位置含義參考：**
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

  const topicHint = request.topic
    ? locale === 'en'
      ? `\n**Reading Topic:** ${request.topic} (interpretation must focus on this topic)`
      : locale === 'ja'
        ? `\n**占いテーマ：** ${request.topic}（このテーマに沿って解釈してください）`
        : `\n**占卜主題：** ${request.topic}（解讀必須緊扣此主題方向）`
    : '';

  const querentPart = request.querentSummary
    ? locale === 'en'
      ? `\n\n**Querent's Energy:**\n${request.querentSummary}\n(Weave this naturally into the reading as if you sense their aura — do not mention any technical sources)`
      : locale === 'ja'
        ? `\n\n**相談者の状態：**\n${request.querentSummary}\n（オーラを感じ取るように自然に解読に融合させてください。技術的な情報源には言及しないでください）`
        : `\n\n**問卜者靈魂狀態感知：**\n${request.querentSummary}\n（請如同你感應到的氣場般自然融入解讀，不要提及任何技術性來源）`
    : '';

  if (locale === 'en') {
    return `Mystica, a querent has entered your reading room. The candles flicker as you sense the energy they bring.

**The Querent's Question:** ${request.question}
${topicHint}
**Spread:** ${spreadName}

**Cards Revealed:**
${cardsDescription}${positionGuide}${querentPart}

Please provide a complete reading with your expertise. Remember — each card's keywords are your anchor points, and your insight is what brings them to life.`;
  }

  if (locale === 'ja') {
    return `Mystica、一人の相談者があなたの占いの部屋に入ってきました。キャンドルが揺れ、相手が持ってきたエネルギーを感じ取ります。

**相談者の悩み：** ${request.question}
${topicHint}
**スプレッド：** ${spreadName}

**カードの結果：**
${cardsDescription}${positionGuide}${querentPart}

あなたの専門知識で、この相談者に完全なリーディングを行ってください。各カードのキーワードは解釈の起点であり、あなたの洞察がそれらに命を吹き込む魂です。`;
  }

  return `Mystica，一位問卜者走進了你的占卜室。燭光搖曳，你感受到對方帶來的能量。

**問卜者的困惑：** ${request.question}
${topicHint}
**展開的牌陣：** ${spreadName}

**牌面揭示：**
${cardsDescription}${positionGuide}${querentPart}

請以你的專業，為這位問卜者進行完整的解讀。記住——每張牌的關鍵字是你解讀的錨點，而你的洞察才是讓這些關鍵字活過來的靈魂。`;
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
  model = OPENAI_READING_MODEL,
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
      model,
      max_completion_tokens: maxTokens,
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

/**
 * 驗證 HTTP request 中的 Firebase ID Token（用於非 Callable 的 onRequest endpoint）。
 */
async function verifyAuthToken(req: { headers: { authorization?: string } }): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HttpsError('unauthenticated', '缺少 Authorization header');
  }
  const idToken = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(idToken);
  return decoded.uid;
}

/**
 * SSE 串流版占卜解讀。
 *
 * 前端用 fetch + ReadableStream 接收，每個 SSE chunk 是一小段 AI 回應文字，
 * 使用者 2-3 秒就看到第一行字開始出現，體感速度大幅提升。
 */
export const streamTarotReading = onRequest(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120, cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const uid = await verifyAuthToken(req);
      checkRateLimit(uid);
      const data = assertInterpretationRequest(req.body);
      const todayContext = getTaipeiNowContext();
      const systemPrompt =
        buildSystemPrompt(data.locale) +
        `\n\n${todayContext}` +
        `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問，用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;
      const userPrompt = `${todayContext}\n\n${buildUserPrompt(data)}`;
      await chargeQuestionCredits(uid, `全新占卜：${data.spreadType}`);

      const apiKey = openAIKey.value();
      if (!apiKey) {
        await refundQuestionCredits(uid, 'API key 未設定退還點數');
        res.status(500).json({ error: 'OPENAI_API_KEY 尚未設定' });
        return;
      }

      const openaiRes = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_READING_MODEL,
          max_completion_tokens: 3500,
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!openaiRes.ok || !openaiRes.body) {
        const body = await openaiRes.text();
        await refundQuestionCredits(uid, 'AI 解讀失敗退還點數');
        res.status(openaiRes.status).json({ error: body });
        return;
      }

      // SSE headers — 讓瀏覽器以事件串流方式接收
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let fullText = '';
      const reader = openaiRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const chunk = JSON.parse(payload) as {
                choices?: Array<{ delta?: { content?: string } }>;
              };
              const content = chunk.choices?.[0]?.delta?.content;
              if (content) {
                fullText += content;
                // 每個 SSE event 只包含新增的文字 delta
                res.write(`data: ${JSON.stringify({ delta: content })}\n\n`);
              }
            } catch {
              // 忽略無法解析的 chunk
            }
          }
        }
      } catch {
        if (!fullText) {
          await refundQuestionCredits(uid, 'AI 串流中斷退還點數');
        }
        res.write(`data: ${JSON.stringify({ error: '串流中斷' })}\n\n`);
        res.end();
        return;
      }

      // 串流結束，發送最終完整結果（含 suggestedQuestions）
      const finalResponse = toResponse(fullText);
      res.write(`data: ${JSON.stringify({ done: true, ...finalResponse })}\n\n`);
      res.end();
    } catch (error) {
      const msg = error instanceof HttpsError ? error.message : 'Internal error';
      const code = error instanceof HttpsError ? error.httpErrorCode?.status ?? 500 : 500;
      res.status(code).json({ error: msg });
    }
  },
);

export const generateTarotReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    // Callable Function 會自動處理 Firebase Web SDK 的 envelope 格式與 CORS。（保留作為 fallback）
    const uid = requireUid(request.auth?.uid);
    checkRateLimit(uid);
    const data = assertInterpretationRequest(request.data);
    const todayContext = getTaipeiNowContext();
    const systemPrompt =
      buildSystemPrompt(data.locale) +
      `\n\n${todayContext}` +
      `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問，用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;
    const userPrompt = `${todayContext}\n\n${buildUserPrompt(data)}`;
    await chargeQuestionCredits(uid, `全新占卜：${data.spreadType}`);

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        3500,
        OPENAI_READING_MODEL,
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
    checkRateLimit(uid);
    const data = assertFollowUpRequest(request.data);
    const allowedCardNames = collectAllowedCardNames(data);
    const cardsDescription = data.originalRequest.drawnCards
      .map(
        (dc) =>
          `- 位置「${dc.position}」：${dc.card.name}（${dc.card.nameEn}）— ${
            dc.isReversed ? '逆位' : '正位'
          }`,
      )
      .join('\n');

    // 追問新牌描述
    const followUpCard = data.followUpCard;
    const todayContext = getTaipeiNowContext();
    const followUpHeading = followUpCard ? buildFollowUpHeading(followUpCard) : '';
    const newCardDescription = followUpCard
      ? `\n**追問指引牌：** ${followUpCard.card.name}（${followUpCard.card.nameEn}）— ${followUpCard.isReversed ? '逆位' : '正位'}\n關鍵字：${followUpCard.isReversed ? followUpCard.card.reversedKeywords.join('、') : followUpCard.card.keywords.join('、')}`
      : '';
    const systemPromptPrefix = `${todayContext}
${followUpHeading ? `本次追問指引牌是「${followUpHeading.replace(/^##\s*/, '')}」。前端會另外顯示牌名，正文不要再輸出「追問指引牌」標題，也不要寫「我抽出了某張牌」。如果需要引用原始牌陣中的其他牌，必須明確說「原始牌陣中的...」，不得把它宣稱成本次追問牌。` : ''}`;

    const systemPrompt = `你是一位資深塔羅占卜師，正在為問卜者進行深入的追問解讀。

問卜者針對原始牌陣提出了追問，你為他額外抽了一張「追問指引牌」來回應。
請根據原始牌陣背景、之前的解讀，以及這張新抽的追問指引牌，針對追問提供具體的分析與建議。

重點：解讀應以追問指引牌為核心，結合原始牌陣的脈絡來回答問卜者的追問。
風格一致性：請延續「之前的解讀摘要」中的語氣、節奏、神秘感與安撫但具體的分析方式；追問是同一場占卜的延伸，不要改成過度簡短、制式、客服式或條列過多的回答。
內容密度：即使追問消耗較低點數，也必須保有完整占卜的沉浸感與解讀深度；可以更聚焦，但不能顯得廉價或斷裂。

回應長度約 350 到 500 字，使用 Markdown 格式。

結構：
## 延伸解析
## 具體行動方案
## 寄語

同樣在結尾附上建議追問：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;

    const userPrompt = `${todayContext}
${followUpHeading ? `本次追問請以這張牌作為核心：${followUpHeading.replace(/^##\s*/, '')}` : ''}

**原始問題：** ${data.originalRequest.question}
**原始牌陣：**
${cardsDescription}

**之前的解讀摘要：**
${data.originalInterpretation.slice(0, 3000)}

${data.originalRequest.querentSummary ? `**問卜者狀態記憶：**\n${data.originalRequest.querentSummary}` : ''}

---

**問卜者的追問：** ${data.followUpQuestion}
${newCardDescription}

請以這張追問指引牌為核心，結合原始牌陣脈絡，針對追問提供深入解讀。`;

    await chargeFollowUpCredits(uid, '占卜追問');

    try {
      let lastConflicts: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const retryInstruction =
          attempt > 0
            ? `\n\n上一版回覆錯誤宣稱本次追問牌或引用了不該出現的牌名：${lastConflicts.join('、')}。請重新生成；本次追問牌只能是「${followUpCard?.card.name ?? '追問指引牌'}」，可回扣的上下文牌只有：${Array.from(allowedCardNames).join('、')}。`
            : '';
        const result = await chat(
          [
            { role: 'system', content: `${systemPromptPrefix}\n\n${systemPrompt}${retryInstruction}` },
            { role: 'user', content: userPrompt },
          ],
          2000,
          OPENAI_FOLLOW_UP_MODEL,
        );
        const conflicts = [
          ...new Set([
            ...findConflictingCardNames(result.text, allowedCardNames),
            ...findMismatchedFollowUpCardAssertions(result.text, followUpCard),
          ]),
        ];

        if (conflicts.length === 0) {
          return toResponse(normalizeFollowUpText(result.text, followUpCard), result.usage);
        }

        lastConflicts = conflicts;
      }

      throw new HttpsError(
        'internal',
        `AI 追問回覆引用了錯誤牌名（${lastConflicts.join('、')}），已退還點數，請再試一次。`,
      );
    } catch (error) {
      await refundFollowUpCredits(uid, 'AI 追問失敗退還點數');
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

export const adminListUsers = onCall({ region: REGION }, async (request) => {
  requireAdmin(request.auth?.token.email as string | undefined);

  const maxResults = Math.min(Number(request.data?.maxResults) || 200, 1000);
  const listResult = await adminAuth.listUsers(maxResults);

  // 批次查詢所有使用者的點數 profile
  const profiles = await Promise.all(
    listResult.users.map(async (userRecord) => {
      const doc = await db.doc(`users/${userRecord.uid}`).get();
      const data = doc.data();
      return {
        uid: userRecord.uid,
        email: userRecord.email ?? '',
        displayName: userRecord.displayName ?? '',
        photoURL: userRecord.photoURL ?? '',
        disabled: userRecord.disabled,
        providerId: userRecord.providerData.map((p) => p.providerId).join(', ') || 'custom',
        creationTime: userRecord.metadata.creationTime ?? '',
        lastSignInTime: userRecord.metadata.lastSignInTime ?? '',
        balance: Number(data?.balance ?? 0),
      };
    }),
  );

  // 依最後登入時間倒序
  profiles.sort((a, b) => {
    const ta = a.lastSignInTime ? new Date(a.lastSignInTime).getTime() : 0;
    const tb = b.lastSignInTime ? new Date(b.lastSignInTime).getTime() : 0;
    return tb - ta;
  });

  return { users: profiles, total: listResult.users.length };
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

export const createCreditPurchase = onCall({ region: REGION, secrets: [ecpayHashKey, ecpayHashIV] }, async (request) => {
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

export const ecpayNotify = onRequest({ region: REGION, secrets: [ecpayHashKey, ecpayHashIV] }, async (request, response) => {
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
