import { createHash, randomBytes } from 'node:crypto';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Timestamp, getFirestore, type DocumentData } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

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
const YES_NO_CREDIT_COST = 10;
const FOLLOW_UP_CREDIT_COST = 5;
const APP_BASE_URL = 'https://mystic-tarot-2026.web.app';
const ECPAY_CHECKOUT_URL = 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
const ECPAY_MERCHANT_ID = '3501280';
const ECPAY_CHOOSE_PAYMENT = 'Credit';
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'lukewolf899@gmail.com')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const db = getFirestore();
const adminAuth = getAuth();

type SpreadType = 'single' | 'three-card' | 'celtic-cross' | 'yes-no';
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
  // 加入中文和英文牌名，兩者都可能出現在 AI 回覆中
  request.originalRequest.drawnCards.forEach((drawnCard) => {
    names.add(drawnCard.card.name);
    if (drawnCard.card.nameEn) names.add(drawnCard.card.nameEn);
  });
  if (request.followUpCard) {
    names.add(request.followUpCard.card.name);
    if (request.followUpCard.card.nameEn) names.add(request.followUpCard.card.nameEn);
  }

  const mentionedFollowUpCards = request.originalInterpretation.matchAll(
    /追問指引牌[:：]\s*([^（\n—-]+)/g,
  );
  for (const match of mentionedFollowUpCards) {
    const name = match[1]?.trim();
    if (name) names.add(name);
  }

  return names;
}

function buildFollowUpPrompts(
  data: AIFollowUpRequest,
  followUpCard: FollowUpCard | undefined,
  todayContext: string,
  locale: Locale,
): { systemPrompt: string; userPrompt: string } {
  // 追問牌名（中英都帶，確保 AI 不會搞混）
  const cardIdentity = followUpCard
    ? `${followUpCard.card.name}（${followUpCard.card.nameEn}）— ${
        locale === 'en' ? (followUpCard.isReversed ? 'Reversed' : 'Upright')
        : locale === 'ja' ? (followUpCard.isReversed ? '逆位置' : '正位置')
        : (followUpCard.isReversed ? '逆位' : '正位')
      }`
    : '';
  const cardKeywords = followUpCard
    ? (followUpCard.isReversed ? followUpCard.card.reversedKeywords : followUpCard.card.keywords).join(locale === 'ja' ? '、' : ', ')
    : '';

  // 原始牌陣描述（locale-aware）
  const cardsDescription = data.originalRequest.drawnCards
    .map((dc) => {
      const pos = dc.position;
      const dir = locale === 'en' ? (dc.isReversed ? 'Reversed' : 'Upright')
        : locale === 'ja' ? (dc.isReversed ? '逆位置' : '正位置')
        : (dc.isReversed ? '逆位' : '正位');
      return locale === 'en'
        ? `- Position "${pos}": ${dc.card.nameEn} (${dc.card.name}) — ${dir}`
        : locale === 'ja'
          ? `- ポジション「${pos}」：${dc.card.name}（${dc.card.nameEn}）— ${dir}`
          : `- 位置「${pos}」：${dc.card.name}（${dc.card.nameEn}）— ${dir}`;
    })
    .join('\n');

  if (locale === 'en') {
    const cardRule = followUpCard
      ? `CRITICAL CONSTRAINT: The follow-up guide card is "${cardIdentity}". You MUST base your interpretation on THIS card ONLY. Do NOT mention or claim any other card as the follow-up guide card. The frontend already displays the card name, so do NOT write "I drew..." or output the card name as a heading.`
      : '';

    const systemPrompt = followUpCard
      ? `${todayContext}
${cardRule}

You are a seasoned tarot reader conducting a follow-up interpretation.

The querent asked a follow-up question about their original spread. You drew one additional "guide card" to answer it.
Interpret based on: the original spread context, previous interpretation, and this new guide card.

Key rules:
- Focus on the guide card (${followUpCard.card.nameEn}) as the core of your interpretation
- Maintain the same warm, insightful tone from the previous reading — this is a continuation, not a new session
- Keep the immersive depth even though this is a follow-up

Response length: 350-500 words in Markdown.

Structure:
## Extended Analysis
## Action Plan
## Closing Words

End with suggested follow-ups:
<!-- SUGGESTED_QUESTIONS:
- Question one
- Question two
- Question three
-->`
      : `${todayContext}

You are a seasoned tarot reader continuing a soul conversation with the querent.

The querent wants to explore their question further through dialogue — no additional card was drawn this time.
Base your response on: the original spread context and previous interpretation.

Key rules:
- Respond as a warm, insightful counselor who uses the original spread as the foundation
- Do NOT mention drawing any new card — this is a pure dialogue mode
- Maintain the same tone from the previous reading — this is a continuation, not a new session
- Offer psychological insight, concrete advice, and empathetic understanding

Response length: 350-500 words in Markdown.

Structure:
## Extended Analysis
## Action Plan
## Closing Words

End with suggested follow-ups:
<!-- SUGGESTED_QUESTIONS:
- Question one
- Question two
- Question three
-->`;

    const userPrompt = `${todayContext}

**Original Question:** ${data.originalRequest.question}
**Original Spread:**
${cardsDescription}

**Previous Interpretation:**
${data.originalInterpretation.slice(0, 3000)}

${data.originalRequest.querentSummary ? `**Querent Context:**\n${data.originalRequest.querentSummary}` : ''}

---

**Follow-up Question:** ${data.followUpQuestion}
${followUpCard ? `\n**Follow-up Guide Card:** ${cardIdentity}\nKeywords: ${cardKeywords}\n\nBase your interpretation on the guide card "${followUpCard.card.nameEn}" and the original spread context.` : '\nRespond based on the original spread context and your understanding of the querent. Do not reference any new card.'}`;

    return { systemPrompt, userPrompt };
  }

  if (locale === 'ja') {
    const cardRule = followUpCard
      ? `【絶対ルール】本追加質問のガイドカードは「${cardIdentity}」です。このカードのみを追加質問カードとして解釈してください。他のカードを追加質問カードと称してはいけません。フロントエンドがカード名を表示するため、「引いたカードは...」やカード名の見出しを書かないでください。`
      : '';

    const systemPrompt = followUpCard
      ? `${todayContext}
${cardRule}

あなたはベテランのタロットリーダーで、追加質問の解釈を行っています。

質問者は元のスプレッドについて追加質問をしました。あなたは追加の「ガイドカード」を1枚引きました。
元のスプレッド、以前の解釈、そしてこの新しいガイドカードに基づいて解釈してください。

重要なルール：
- ガイドカード（${followUpCard.card.nameEn}）を解釈の中心にすること
- 前回のリーディングと同じ温かく洞察力のあるトーンを維持すること
- 追加質問でも没入感のある深さを保つこと

回答の長さ：350〜500文字、Markdown形式。

構成：
## 延伸解析
## 具体的なアクションプラン
## メッセージ

最後に追加質問の提案：
<!-- SUGGESTED_QUESTIONS:
- 質問1
- 質問2
- 質問3
-->`
      : `${todayContext}

あなたはベテランのタロットリーダーで、質問者との心の対話を続けています。

質問者は対話を通じてさらに探求したいと考えています — 今回は追加のカードを引いていません。
元のスプレッドと以前の解釈に基づいて回答してください。

重要なルール：
- 元のスプレッドを基盤として、温かく洞察力のあるカウンセラーとして応答すること
- 新しいカードを引いたとは言わないこと — これは純粋な対話モードです
- 前回のリーディングと同じトーンを維持すること
- 心理的な洞察、具体的なアドバイス、共感的な理解を提供すること

回答の長さ：350〜500文字、Markdown形式。

構成：
## 延伸解析
## 具体的なアクションプラン
## メッセージ

最後に追加質問の提案：
<!-- SUGGESTED_QUESTIONS:
- 質問1
- 質問2
- 質問3
-->`;

    const userPrompt = `${todayContext}

**元の質問：** ${data.originalRequest.question}
**元のスプレッド：**
${cardsDescription}

**前回の解釈：**
${data.originalInterpretation.slice(0, 3000)}

${data.originalRequest.querentSummary ? `**質問者の状態：**\n${data.originalRequest.querentSummary}` : ''}

---

**追加質問：** ${data.followUpQuestion}
${followUpCard ? `\n**追加質問ガイドカード：** ${cardIdentity}\nキーワード：${cardKeywords}\n\nガイドカード「${followUpCard.card.nameEn}」を中心に、元のスプレッドの脈絡と合わせて解釈してください。` : '\n元のスプレッドの脈絡と質問者への理解に基づいて回答してください。新しいカードには言及しないでください。'}`;

    return { systemPrompt, userPrompt };
  }

  // zh-TW（預設）
  const cardRule = followUpCard
    ? `【絕對規則】本次追問指引牌是「${cardIdentity}」。你必須以這張牌為核心來解讀，不得提及或宣稱其他任何牌是本次追問指引牌。前端會另外顯示牌名，正文不要再輸出「追問指引牌」標題，也不要寫「我抽出了某張牌」。如果需要引用原始牌陣中的其他牌，必須明確說「原始牌陣中的...」。`
    : '';

  const systemPrompt = followUpCard
    ? `${todayContext}
${cardRule}

你是一位資深塔羅占卜師，正在為問卜者進行深入的追問解讀。

問卜者針對原始牌陣提出了追問，你為他額外抽了一張「追問指引牌」來回應。
請根據原始牌陣背景、之前的解讀，以及這張新抽的追問指引牌，針對追問提供具體的分析與建議。

重點規則：
- 解讀必須以追問指引牌「${followUpCard.card.name}」為核心
- 風格一致性：延續之前的語氣、節奏、神秘感；追問是同一場占卜的延伸
- 內容密度：保有完整占卜的沉浸感與解讀深度

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
-->`
    : `${todayContext}

你是一位資深塔羅占卜師，正在與問卜者進行心靈對話。

問卜者希望透過對話進一步探索內心，這次沒有額外抽牌。
請根據原始牌陣背景和之前的解讀來回應。

重點規則：
- 以原始牌陣為基礎，用溫暖而有洞察力的口吻回應
- 不要提到抽了新的牌 — 這是純對話模式
- 延續之前的語氣和神秘感，這是同一場占卜的延伸
- 提供心理層面的洞見、具體建議與同理心

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

**原始問題：** ${data.originalRequest.question}
**原始牌陣：**
${cardsDescription}

**之前的解讀摘要：**
${data.originalInterpretation.slice(0, 3000)}

${data.originalRequest.querentSummary ? `**問卜者狀態記憶：**\n${data.originalRequest.querentSummary}` : ''}

---

**問卜者的追問：** ${data.followUpQuestion}
${followUpCard ? `\n**追問指引牌：** ${cardIdentity}\n關鍵字：${cardKeywords}\n\n請以追問指引牌「${followUpCard.card.name}」為核心，結合原始牌陣脈絡，針對追問提供深入解讀。` : '\n請根據原始牌陣脈絡和對問卜者的理解來回應，不要提及任何新抽的牌。'}`;

  return { systemPrompt, userPrompt };
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
      reason: `綠界AI塔羅解讀服務方案付款：${order.packageId}`,
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
        reason: '新會員登入贈送服務額度',
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
        reason: '補發新會員贈送服務額度',
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
        reason: '新會員登入贈送服務額度',
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
        reason: '補發新會員贈送服務額度',
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    if (balance < amount) {
      throw new HttpsError('failed-precondition', '服務額度不足，請購買解讀方案或訂閱方案。');
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
    followUpCard: request.followUpCard ?? undefined,
    locale: request.locale === 'en' ? 'en' : request.locale === 'ja' ? 'ja' : 'zh-TW',
  };
}

function buildYesNoSystemPrompt(locale: Locale): string {
  if (locale === 'zh-TW') {
    return `你是「Mystica」——一位經驗豐富的塔羅占卜師，擅長快速是非判斷。

這是一次「是非占卜」——問卜者問了一個 Yes/No 問題，你抽出了一張牌來回應。

回應格式（約 200-300 字，簡潔有力）：

## ✦ 神諭
用一個大大的 **Yes ✓** 或 **No ✗** 開頭（根據牌面判斷），接著用 1-2 句話點出核心判斷依據。

## 🃏 牌面解讀
簡潔描述這張牌在這個問題脈絡下的含義。正位傾向 Yes，逆位傾向 No，但也要看牌義本身。比如正位的「塔」仍可能偏 No。用白話解釋，像跟朋友聊天。

## 💡 小提醒
一個具體的建議或提醒，讓問卜者知道在這個 Yes/No 之後可以怎麼行動。

規則：
- 使用繁體中文
- 語氣口語自然
- 不要空泛的靈性話語
- 整體回應控制在 200-300 字`;
  }
  if (locale === 'ja') {
    return `あなたは「Mystica」——経験豊富なタロットリーダーで、素早いイエス・ノー判断を得意としています。

これは「イエス・ノー占い」です。相談者がYes/Noの質問をし、あなたが1枚のカードを引きました。

回答フォーマット（約200〜300字、簡潔で力強く）：

## ✦ 神託
大きく **Yes ✓** または **No ✗** で始めて、1〜2文で核心的な判断根拠を述べてください。

## 🃏 カード解読
この質問の文脈でこのカードが意味することを簡潔に説明してください。正位置はYes寄り、逆位置はNo寄りですが、カードの意味自体も考慮してください。

## 💡 アドバイス
具体的なアドバイスを1つ。

ルール：
- 日本語で回答
- 口語的で自然な語調
- 200〜300字に収める`;
  }
  // en
  return `You are "Mystica" — an experienced tarot reader skilled at quick Yes/No judgments.

This is a "Yes/No Reading." The querent asked a Yes/No question and you drew one card.

Response format (about 200-300 words, concise and powerful):

## ✦ Oracle
Start with a big **Yes ✓** or **No ✗** (based on the card), then 1-2 sentences explaining the core reasoning.

## 🃏 Card Insight
Briefly explain what this card means in the context of this question. Upright leans Yes, reversed leans No, but consider the card's inherent meaning too. Speak casually, like talking to a friend.

## 💡 Quick Tip
One specific, actionable suggestion.

Rules:
- Respond in English
- Casual, natural tone
- Keep it 200-300 words total`;
}

function buildSystemPrompt(locale: Locale, spreadType?: string): string {
  // 是非占卜使用精簡專屬 prompt
  if (spreadType === 'yes-no') {
    return buildYesNoSystemPrompt(locale);
  }
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
  'zh-TW': { single: '單牌占卜', 'three-card': '三牌占卜（過去／現在／未來）', 'celtic-cross': '凱爾特十字（十牌全面解析）', 'yes-no': '是非占卜（Yes / No）' },
  en:       { single: 'Single Card Reading', 'three-card': 'Three-Card Spread (Past / Present / Future)', 'celtic-cross': 'Celtic Cross (10-Card Full Analysis)', 'yes-no': 'Yes / No Reading' },
  ja:       { single: '一枚引き', 'three-card': 'スリーカード（過去／現在／未来）', 'celtic-cross': 'ケルト十字（10枚総合分析）', 'yes-no': 'イエス・ノー占い' },
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

const YES_NO_POSITIONS: Record<string, string[]> = {
  'zh-TW': ['神諭'],
  en:       ['Oracle'],
  ja:       ['神託'],
};

function translatePosition(zhPosition: string, locale: string, spreadType: string): string {
  if (locale === 'zh-TW') return zhPosition;
  const zhPositions =
    spreadType === 'yes-no' ? YES_NO_POSITIONS['zh-TW'] :
    spreadType === 'celtic-cross' ? CELTIC_POSITIONS['zh-TW'] :
    spreadType === 'three-card' ? THREE_POSITIONS['zh-TW'] :
    SINGLE_POSITIONS['zh-TW'];
  const targetPositions =
    spreadType === 'yes-no' ? YES_NO_POSITIONS[locale] :
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
        buildSystemPrompt(data.locale, data.spreadType) +
        `\n\n${todayContext}` +
        `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問，用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;
      const userPrompt = `${todayContext}\n\n${buildUserPrompt(data)}`;
      const creditCost = data.spreadType === 'yes-no' ? YES_NO_CREDIT_COST : QUESTION_CREDIT_COST;
      await chargeCredits(uid, creditCost, `全新占卜：${data.spreadType}`);

      const apiKey = openAIKey.value();
      if (!apiKey) {
        await refundCredits(uid, creditCost, 'API key 未設定退還服務額度');
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
        await refundCredits(uid, creditCost, 'AI 解讀失敗退還服務額度');
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
          await refundCredits(uid, creditCost, 'AI 串流中斷退還服務額度');
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

/**
 * SSE 串流版追問解讀。
 *
 * 與 streamTarotReading 相同的 SSE 模式，但使用追問專用 prompt + 卡牌名稱驗證。
 * 第一次串流完成後若偵測到卡牌名稱衝突，會自動重試一次（第二次也串流）。
 */
export const streamFollowUpReading = onRequest(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120, cors: true, invoker: 'public' },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const uid = await verifyAuthToken(req);
      checkRateLimit(uid);
      const data = assertFollowUpRequest(req.body);
      const allowedCardNames = collectAllowedCardNames(data);
      const locale = data.locale ?? 'zh-TW';
      const followUpCard = data.followUpCard;
      const todayContext = getTaipeiNowContext();

      const { systemPrompt, userPrompt } = buildFollowUpPrompts(
        data, followUpCard, todayContext, locale,
      );

      await chargeFollowUpCredits(uid, '占卜追問');

      const apiKey = openAIKey.value();
      if (!apiKey) {
        await refundFollowUpCredits(uid, 'API key 未設定退還服務額度');
        res.status(500).json({ error: 'OPENAI_API_KEY 尚未設定' });
        return;
      }

      // SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      let lastConflicts: string[] = [];

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const retryInstruction =
          attempt > 0
            ? `\n\n上一版回覆錯誤宣稱本次追問牌或引用了不該出現的牌名：${lastConflicts.join('、')}。請重新生成；本次追問牌只能是「${followUpCard?.card.name ?? '追問指引牌'}」，可回扣的上下文牌只有：${Array.from(allowedCardNames).join('、')}。`
            : '';

        const openaiRes = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENAI_FOLLOW_UP_MODEL,
            max_completion_tokens: 2000,
            stream: true,
            messages: [
              { role: 'system', content: `${systemPrompt}${retryInstruction}` },
              { role: 'user', content: userPrompt },
            ],
          }),
        });

        if (!openaiRes.ok || !openaiRes.body) {
          const body = await openaiRes.text();
          if (attempt === 0) {
            await refundFollowUpCredits(uid, 'AI 追問失敗退還服務額度');
          }
          res.write(`data: ${JSON.stringify({ error: body })}\n\n`);
          res.end();
          return;
        }

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
                  res.write(`data: ${JSON.stringify({ delta: content })}\n\n`);
                }
              } catch {
                // 忽略無法解析的 chunk
              }
            }
          }
        } catch {
          if (!fullText) {
            await refundFollowUpCredits(uid, 'AI 追問串流中斷退還服務額度');
          }
          res.write(`data: ${JSON.stringify({ error: '串流中斷' })}\n\n`);
          res.end();
          return;
        }

        // 驗證卡牌名稱
        const conflicts = [
          ...new Set([
            ...findConflictingCardNames(fullText, allowedCardNames),
            ...findMismatchedFollowUpCardAssertions(fullText, followUpCard),
          ]),
        ];

        if (conflicts.length === 0) {
          // 驗證通過，發送最終結果
          const normalized = normalizeFollowUpText(fullText, followUpCard);
          const finalResponse = toResponse(normalized);
          res.write(`data: ${JSON.stringify({ done: true, ...finalResponse })}\n\n`);
          res.end();
          return;
        }

        // 卡牌名稱衝突，需要重試
        lastConflicts = conflicts;

        if (attempt === 0) {
          // 通知前端將重試（前端需清空已累積文字）
          res.write(`data: ${JSON.stringify({ retry: true, reason: `卡牌名稱衝突：${conflicts.join('、')}` })}\n\n`);
        }
      }

      // 兩次都失敗
      await refundFollowUpCredits(uid, 'AI 追問回覆引用錯誤牌名退還服務額度');
      res.write(`data: ${JSON.stringify({ error: `AI 追問回覆引用了錯誤牌名（${lastConflicts.join('、')}），已退還服務額度，請再試一次。` })}\n\n`);
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
      buildSystemPrompt(data.locale, data.spreadType) +
      `\n\n${todayContext}` +
      `\n\n在解讀結束後，請額外用以下格式附上 3 個建議追問，用 HTML 註解包起來：
<!-- SUGGESTED_QUESTIONS:
- 問題一
- 問題二
- 問題三
-->`;
    const userPrompt = `${todayContext}\n\n${buildUserPrompt(data)}`;
    const creditCost = data.spreadType === 'yes-no' ? YES_NO_CREDIT_COST : QUESTION_CREDIT_COST;
    await chargeCredits(uid, creditCost, `全新占卜：${data.spreadType}`);

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
      await refundCredits(uid, creditCost, 'AI 解讀失敗退還服務額度');
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
    const locale = data.locale ?? 'zh-TW';

    // 追問新牌描述（locale-aware）
    const followUpCard = data.followUpCard;
    const todayContext = getTaipeiNowContext();

    const { systemPrompt, userPrompt } = buildFollowUpPrompts(
      data, followUpCard, todayContext, locale,
    );

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
            { role: 'system', content: `${systemPrompt}${retryInstruction}` },
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
        `AI 追問回覆引用了錯誤牌名（${lastConflicts.join('、')}），已退還服務額度，請再試一次。`,
      );
    } catch (error) {
      await refundFollowUpCredits(uid, 'AI 追問失敗退還服務額度');
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
    throw new HttpsError('invalid-argument', '解讀服務方案不存在');
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
    TradeDesc: 'MysticTarotAIReadingService',
    ItemName: `神秘塔羅AI塔羅解讀服務方案${product.priceTwd}元`,
    ReturnURL: `https://${REGION}-mystic-tarot-2026.cloudfunctions.net/ecpayNotify`,
    ChoosePayment: ECPAY_CHOOSE_PAYMENT,
    EncryptType: 1,
    ClientBackURL: `${APP_BASE_URL}/billing?payment=pending&orderId=${orderId}`,
    OrderResultURL: `${APP_BASE_URL}/billing?payment=result&orderId=${orderId}`,
    NeedExtraPaidInfo: 'N',
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
    message: `已選擇每月 ${product.credits} 服務額度 / NT$${product.priceTwd}。金流尚未串接，接上訂閱 webhook 後才會啟用方案並發放每月服務額度。`,
  };
});

// ═══════════════════════════════════════════════════════════
// ██  瑪雅曆 — Cloud Functions
// ═══════════════════════════════════════════════════════════

const MAYA_DAILY_COST = 10;
const MAYA_COMBO_COST = 20;
const MAYA_SIGNATURE_COST = 20;
const MAYA_AI_MODEL = 'gpt-4o';

// ── 瑪雅曆靜態資料（Cloud Function 端簡化版） ─────────

const SEAL_NAMES_ZH = [
  '', '紅龍', '白風', '藍夜', '黃種子', '紅蛇',
  '白世界橋', '藍手', '黃星星', '紅月', '白狗',
  '藍猴', '黃人', '紅天行者', '白巫師', '藍鷹',
  '黃戰士', '紅地球', '白鏡', '藍風暴', '黃太陽',
];
const SEAL_NAMES_EN = [
  '', 'Red Dragon', 'White Wind', 'Blue Night', 'Yellow Seed', 'Red Serpent',
  'White World-Bridger', 'Blue Hand', 'Yellow Star', 'Red Moon', 'White Dog',
  'Blue Monkey', 'Yellow Human', 'Red Skywalker', 'White Wizard', 'Blue Eagle',
  'Yellow Warrior', 'Red Earth', 'White Mirror', 'Blue Storm', 'Yellow Sun',
];
const SEAL_KEYWORDS_ZH = [
  [],
  ['誕生', '滋養', '存在'], ['精神', '溝通', '呼吸'], ['豐盛', '夢想', '直覺'],
  ['開花', '目標', '覺察'], ['生命力', '本能', '生存'], ['死亡', '等化', '機會'],
  ['完成', '知曉', '療癒'], ['優雅', '藝術', '美'], ['淨化', '流動', '宇宙之水'],
  ['愛', '忠誠', '心'], ['魔法', '幻象', '遊戲'], ['自由意志', '智慧', '影響'],
  ['空間', '探索', '覺醒'], ['永恆', '魅力', '接受'], ['視野', '創造', '心智'],
  ['智能', '勇氣', '提問'], ['進化', '導航', '同步'], ['無限', '秩序', '反射'],
  ['催化', '能量', '自我轉化'], ['啟蒙', '生命', '宇宙之火'],
];
const SEAL_KEYWORDS_EN = [
  [],
  ['Birth', 'Nurtures', 'Being'], ['Spirit', 'Communicates', 'Breath'],
  ['Abundance', 'Dreams', 'Intuition'], ['Flowering', 'Targets', 'Awareness'],
  ['Life Force', 'Instinct', 'Survival'], ['Death', 'Equalizes', 'Opportunity'],
  ['Accomplishment', 'Knows', 'Healing'], ['Elegance', 'Art', 'Beauty'],
  ['Purifies', 'Flow', 'Universal Water'], ['Love', 'Loyalty', 'Heart'],
  ['Magic', 'Illusion', 'Play'], ['Free Will', 'Wisdom', 'Influence'],
  ['Space', 'Explores', 'Wakefulness'], ['Timelessness', 'Enchants', 'Receptivity'],
  ['Vision', 'Creates', 'Mind'], ['Intelligence', 'Fearlessness', 'Questioning'],
  ['Evolution', 'Navigation', 'Synchronicity'], ['Endlessness', 'Order', 'Reflects'],
  ['Catalyzes', 'Energy', 'Self-Generation'], ['Enlightens', 'Life', 'Universal Fire'],
];
const TONE_NAMES_ZH = [
  '', '磁性', '月亮', '電力', '自我存在', '超頻',
  '韻律', '共鳴', '銀河星系', '太陽', '行星',
  '光譜', '水晶', '宇宙',
];
const TONE_NAMES_EN = [
  '', 'Magnetic', 'Lunar', 'Electric', 'Self-Existing', 'Overtone',
  'Rhythmic', 'Resonant', 'Galactic', 'Solar', 'Planetary',
  'Spectral', 'Crystal', 'Cosmic',
];
const TONE_KEYWORDS_ZH = [
  [],
  ['統一', '吸引', '目的'], ['極化', '穩定', '挑戰'], ['啟動', '連結', '服務'],
  ['定義', '測量', '形式'], ['賦權', '命令', '光芒'], ['平衡', '組織', '等化'],
  ['通道', '啟發', '調和'], ['和諧', '模範', '整合'], ['脈動', '實現', '意圖'],
  ['顯化', '完美', '產出'], ['溶解', '釋放', '解放'], ['合作', '奉獻', '普遍化'],
  ['超越', '存在', '忍耐'],
];
const TONE_KEYWORDS_EN = [
  [],
  ['Unify', 'Attract', 'Purpose'], ['Polarize', 'Stabilize', 'Challenge'],
  ['Activate', 'Bond', 'Service'], ['Define', 'Measure', 'Form'],
  ['Empower', 'Command', 'Radiance'], ['Balance', 'Organize', 'Equality'],
  ['Channel', 'Inspire', 'Attunement'], ['Harmonize', 'Model', 'Integrity'],
  ['Pulse', 'Realize', 'Intention'], ['Manifest', 'Perfect', 'Produce'],
  ['Dissolve', 'Release', 'Liberation'], ['Cooperate', 'Dedicate', 'Universalize'],
  ['Transcend', 'Endure', 'Presence'],
];
const TONE_QUESTIONS_ZH = [
  '',
  '我的目的是什麼？', '我的挑戰是什麼？', '我如何給予最好的服務？',
  '我該採取什麼形式？', '我如何收回自己的力量？', '我如何擴展平衡？',
  '我如何調和自身的服務？', '我是否活出我所信仰的？', '我如何實現我的目標？',
  '我如何完善我所做的？', '我如何釋放與放下？', '我如何奉獻於所有生命？',
  '我如何回到喜悅？',
];
const TONE_QUESTIONS_EN = [
  '',
  'What is my purpose?', 'What is my challenge?', 'How can I best serve?',
  'What form shall my action take?', 'How can I best empower myself?',
  'How can I extend my equality?', 'How can I attune my service?',
  'Do I live what I believe?', 'How do I attain my purpose?',
  'How do I perfect what I do?', 'How do I release and let go?',
  'How can I dedicate myself to all that lives?', 'How can I expand my joy?',
];
const SEAL_COLORS = ['', 'red', 'white', 'blue', 'yellow', 'red', 'white', 'blue', 'yellow', 'red', 'white', 'blue', 'yellow', 'red', 'white', 'blue', 'yellow', 'red', 'white', 'blue', 'yellow'];

function mayaSealName(seal: number, locale: Locale): string {
  return locale === 'en' ? SEAL_NAMES_EN[seal] : SEAL_NAMES_ZH[seal];
}
function mayaToneName(tone: number, locale: Locale): string {
  return locale === 'en' ? TONE_NAMES_EN[tone] : TONE_NAMES_ZH[tone];
}
function mayaKinLabel(seal: number, tone: number, locale: Locale): string {
  return locale === 'en'
    ? `${TONE_NAMES_EN[tone]} ${SEAL_NAMES_EN[seal]}`
    : `${TONE_NAMES_ZH[tone]}${SEAL_NAMES_ZH[seal]}`;
}
function mayaSealKeywords(seal: number, locale: Locale): string[] {
  return locale === 'en' ? SEAL_KEYWORDS_EN[seal] : SEAL_KEYWORDS_ZH[seal];
}
function mayaToneKeywords(tone: number, locale: Locale): string[] {
  return locale === 'en' ? TONE_KEYWORDS_EN[tone] : TONE_KEYWORDS_ZH[tone];
}
function mayaToneQuestion(tone: number, locale: Locale): string {
  return locale === 'en' ? TONE_QUESTIONS_EN[tone] : TONE_QUESTIONS_ZH[tone];
}

function buildMayaQualityRules(locale: Locale, type: 'daily' | 'combo' | 'signature'): string {
  if (locale === 'en') {
    const typeFocus = type === 'combo'
      ? `For relationship readings, name the actual dynamic: how each person may behave under stress, what they tend to need from the other, where friction shows up in ordinary life, and what repair conversation would sound like. Interpret the combined Kin as the relationship's "third field", not as a vague sum.`
      : type === 'daily'
        ? `For daily readings, connect today's Kin to the user's birth Kin through specific emotional states, decisions, timing, and one realistic daily scenario.`
        : `For signature readings, make every position feel distinct: gift, shadow, body/emotion pattern, relationship pattern, and one practice.`;

    return `Paid-reading quality bar:
- Do not produce generic spiritual filler. Avoid vague lines like "this energy supports growth" unless you immediately show how it appears in real life.
- Every section must anchor back to the exact Kin, seal, tone, keywords, or relationship type from the user prompt.
- Include concrete examples: conversations, choices, behavior patterns, emotional reactions, and daily situations.
- Include both gift and shadow. A good reading should feel useful even when it is uncomfortable.
- Write in a cinematic but grounded style: evocative, intimate, specific, and psychologically literate.
- No medical, legal, or deterministic claims. Frame this as symbolic reflection.
${typeFocus}
- End with an actionable closing that feels personally written, not a slogan.`;
  }

  if (locale === 'ja') {
    const typeFocus = type === 'combo'
      ? `関係性鑑定では、ストレス時の反応、相手に求めやすいもの、日常で摩擦が起きる場面、修復の会話例を具体的に書くこと。合算Kinは曖昧な足し算ではなく、関係そのものが持つ「第三の場」として読むこと。`
      : type === 'daily'
        ? `デイリー鑑定では、今日のKinと誕生Kinを、感情、選択、タイミング、実際に起こりそうな一日の場面に結びつけること。`
        : `署名鑑定では、各位置を区別して読むこと。才能、影、身体・感情の癖、関係性の癖、実践を入れること。`;

    return `有料鑑定の品質基準：
- 一般的なスピリチュアル表現だけで終わらせない。「成長を促す」などの抽象表現は、必ず日常の具体例に落とす。
- 各セクションは必ずKin、紋章、音、キーワード、関係タイプに結びつける。
- 会話、選択、行動パターン、感情反応、日常場面を具体的に入れる。
- 才能と影の両方を書く。少し耳が痛くても役に立つ鑑定にする。
- 詩的だが地に足のついた文体。親密で、具体的で、心理的に深いこと。
- 医療・法律・断定的な運命論は禁止。象徴的な内省として表現する。
${typeFocus}
- 最後は標語ではなく、その人に向けて書いた実践的な締めにする。`;
  }

  const typeFocus = type === 'combo'
    ? `合盤解讀要具體指出：兩人在壓力下各自可能怎麼反應、彼此最容易向對方索取什麼、日常哪裡會摩擦、修復關係的對話可以怎麼說。合盤 Kin 要解讀成「這段關係本身形成的第三個場域」，不要只把兩個人加總成一句抽象能量。`
    : type === 'daily'
      ? `流日解讀要把今日 Kin 與使用者出生 Kin 連到具體情緒、今天可能面臨的選擇、適合行動的時機，以及一個真實的一日場景。`
      : `星系印記解讀要讓每個位置有明顯差異：天賦、陰影、身體/情緒慣性、關係模式、可練習的方向都要寫出來。`;

  return `付費解讀品質規格：
- 禁止產出泛泛的靈性套話。像「這股能量支持成長」「帶來深層連結」這類句子，如果沒有立刻接到具體生活場景，就不要寫。
- 每一段都必須扣回本次資料裡的 Kin、圖騰、調性、關鍵字或關係類型，不能像換一組 Kin 也通用。
- 必須包含具體例子：對話、選擇、行為模式、情緒反應、日常場景。
- 要同時講禮物與陰影。好的解讀要有一點刺中盲點的感覺，而不是只安慰。
- 文風可以有神秘感，但必須落地、親密、精準，像資深占卜師真的看著這組資料在說話。
- 不做醫療、法律或命運斷言；用象徵性自我理解的語氣。
${typeFocus}
- 結尾要像寫給這個人的行動提醒，不要像社群語錄。`;
}

// ── 瑪雅 AI Prompt 建構 ─────────────────────────────

function buildMayaDailySystemPrompt(locale: Locale): string {
  if (locale === 'en') {
    return `You are a Maya calendar healing guide and psychological counselor who uses the Dreamspell/13 Moon Calendar system as a tool. Your style is warm, insightful, and grounded in practical psychology.

Your approach:
- Combine Maya calendar energy descriptions with Jungian archetypes, attachment theory, and cognitive behavioral insights (explain in plain language, no jargon dropping)
- Speak like a wise friend having coffee with the user — conversational, honest, occasionally witty
- Use "Look," "honestly," "here's the thing" naturally
- Reference the specific seal and tone energies with their keywords

Response structure (use markdown):
### ✦ Today's Energy Snapshot
A quick intuitive read of today's cosmic weather (2-3 sentences)

### 🌀 How This Resonates With You
How today's Kin energy interacts with the user's birth Kin — harmonies, tensions, growth edges (use psychology frameworks in plain language)

### 💡 Action Steps
3 ultra-specific things they can do TODAY (not vague platitudes)

### ⚠️ Blind Spot Alert
One thing they might not see — a defense mechanism, cognitive bias, or unconscious pattern activated today

### ✨ One Last Thing
A warm, powerful closing line they'd want to screenshot

Keep it 300-500 words. Be specific, not generic.`;
  }

  if (locale === 'ja') {
    return `あなたはドリームスペル/13の月の暦を使うマヤ暦ヒーリングガイド兼心理カウンセラーです。温かく、洞察力があり、実践的な心理学に基づいたスタイルです。

アプローチ：
- マヤ暦のエネルギー説明にユング原型論、愛着理論、認知行動の洞察を組み合わせる（専門用語は使わず平易に）
- 親しい友人と話すような口調 —「うーん」「実は」「正直に言うと」を自然に使う
- 紋章と音のエネルギーとキーワードを具体的に引用する

回答構造（マークダウン使用）：
### ✦ 今日のエネルギースナップショット
今日の宇宙の天気を直感的に読む（2-3文）

### 🌀 あなたとの共鳴
今日のKinエネルギーがユーザーの誕生Kinとどう相互作用するか — 調和、緊張、成長のポイント

### 💡 アクションステップ
今日できる超具体的なこと3つ（曖昧な言葉はNG）

### ⚠️ ブラインドスポット
見えていないかもしれないこと — 防衛機制、認知バイアス、今日活性化される無意識パターン

### ✨ 最後に一言
スクリーンショットしたくなる温かく力強い一言

300-500字で。具体的に、一般論は避ける。`;
  }

  // zh-TW (default)
  return `你是一位使用 Dreamspell / 13 月亮曆系統作為工具的瑪雅曆療癒引導師兼心理諮詢師。你的風格溫暖、有洞見，並以實用心理學為基底。

你的方式：
- 結合瑪雅曆能量描述與榮格原型理論、依附理論、認知行為洞見（用白話解釋，不掉書袋）
- 像一個有智慧的朋友在聊天 — 口語、真誠、偶爾幽默
- 自然使用「嗯」「其實」「說真的」
- 引用具體的圖騰與調性能量及關鍵字

回應結構（使用 markdown）：
### ✦ 今日能量速寫
快速的直覺宇宙氣象報告（2-3 句）

### 🌀 與你的共振
今日 Kin 能量如何與使用者的出生 Kin 互動 — 和諧、張力、成長邊緣（用心理學框架白話解說）

### 💡 行動方案
3 個今天就能做的超具體事項（不要空洞的心靈雞湯）

### ⚠️ 盲點提醒
一個他們可能看不見的東西 — 防衛機制、認知偏誤、今天被啟動的潛意識模式

### ✨ 最後一句話
一句溫暖有力量的結語，讓人想截圖收藏

控制在 300-500 字。要具體，不要泛泛而談。`;
}

function buildMayaDailyUserPrompt(
  dailyKin: number, dailySeal: number, dailyTone: number,
  userKin: number, userSeal: number, userTone: number,
  locale: Locale,
): string {
  const dLabel = mayaKinLabel(dailySeal, dailyTone, locale);
  const uLabel = mayaKinLabel(userSeal, userTone, locale);
  const dSealKw = mayaSealKeywords(dailySeal, locale).join(', ');
  const dToneKw = mayaToneKeywords(dailyTone, locale).join(', ');
  const uSealKw = mayaSealKeywords(userSeal, locale).join(', ');
  const uToneKw = mayaToneKeywords(userTone, locale).join(', ');
  const dQ = mayaToneQuestion(dailyTone, locale);
  const uQ = mayaToneQuestion(userTone, locale);
  const dColor = SEAL_COLORS[dailySeal];
  const uColor = SEAL_COLORS[userSeal];

  if (locale === 'en') {
    return `Today's date: ${new Date().toISOString().slice(0, 10)}

**Today's Flow Kin:**
- Kin ${dailyKin}: ${dLabel} (Color: ${dColor})
- Seal keywords: ${dSealKw}
- Tone keywords: ${dToneKw}
- Tone question: "${dQ}"

**User's Birth Kin:**
- Kin ${userKin}: ${uLabel} (Color: ${uColor})
- Seal keywords: ${uSealKw}
- Tone keywords: ${uToneKw}
- Tone question: "${uQ}"

Please provide today's daily flow reading, analyzing how today's cosmic energy interacts with the user's birth Kin.`;
  }

  if (locale === 'ja') {
    return `今日の日付：${new Date().toISOString().slice(0, 10)}

**今日の流日Kin：**
- Kin ${dailyKin}：${dLabel}（色：${dColor}）
- 紋章キーワード：${dSealKw}
- 音キーワード：${dToneKw}
- 音の問い：「${dQ}」

**ユーザーの誕生Kin：**
- Kin ${userKin}：${uLabel}（色：${uColor}）
- 紋章キーワード：${uSealKw}
- 音キーワード：${uToneKw}
- 音の問い：「${uQ}」

今日のデイリーフロー鑑定をお願いします。今日の宇宙エネルギーがユーザーの誕生Kinとどう相互作用するか分析してください。`;
  }

  return `今日日期：${new Date().toISOString().slice(0, 10)}

**今日流日 Kin：**
- Kin ${dailyKin}：${dLabel}（顏色：${dColor}）
- 圖騰關鍵字：${dSealKw}
- 調性關鍵字：${dToneKw}
- 調性提問：「${dQ}」

**使用者出生 Kin：**
- Kin ${userKin}：${uLabel}（顏色：${uColor}）
- 圖騰關鍵字：${uSealKw}
- 調性關鍵字：${uToneKw}
- 調性提問：「${uQ}」

請提供今日流日解讀，分析今天的宇宙能量如何與使用者的出生 Kin 互動。`;
}

function buildMayaComboSystemPrompt(locale: Locale): string {
  if (locale === 'en') {
    return `You are a Maya calendar relationship guide who uses the Dreamspell/13 Moon Calendar to analyze the cosmic connection between two people. Your style combines Maya energy interpretation with relationship psychology (attachment theory, Jungian shadow work, communication styles).

Speak like a warm, insightful counselor — conversational and honest.

Response structure (markdown):
### ✦ First Impression
Your intuitive read of this pair's energy dynamic (2-3 sentences)

### 🔗 Relationship Analysis
- Analyze each relationship type found between the two Kins
- Explain what each connection means in daily life using psychology
- Both harmonies AND growth edges

### 🌀 Combined Kin Energy
Interpret the combined Kin as the "third entity" — the relationship's own energy signature

### 💡 Relationship Action Steps
3 specific things this pair can practice together

### ✨ One Last Thing
A warm, powerful closing about their cosmic connection

Keep it 400-600 words.`;
  }

  if (locale === 'ja') {
    return `あなたはドリームスペル/13の月の暦を使って二人の宇宙的つながりを分析するマヤ暦リレーションシップガイドです。マヤのエネルギー解釈と関係性心理学（愛着理論、ユングのシャドーワーク、コミュニケーションスタイル）を組み合わせます。

温かく洞察力のあるカウンセラーとして話す — 会話的で正直に。

回答構造（マークダウン）：
### ✦ ファーストインプレッション
このペアのエネルギーダイナミクスの直感的な読み（2-3文）

### 🔗 関係性分析
- 二つのKin間の各関係タイプを分析
- 各つながりが日常生活で何を意味するか心理学で説明
- 調和と成長のポイント両方

### 🌀 合算Kinエネルギー
合算Kinを「第三のエンティティ」として解釈 — 関係性自体のエネルギー

### 💡 関係性アクションステップ
このペアが一緒に実践できる具体的なこと3つ

### ✨ 最後に一言
宇宙的つながりについての温かく力強い結び

400-600字で。`;
  }

  return `你是一位使用 Dreamspell / 13 月亮曆分析兩人宇宙連結的瑪雅曆關係引導師。你的風格結合瑪雅能量解讀與關係心理學（依附理論、榮格陰影工作、溝通風格）。

你不是在寫圖騰介紹，而是在做一份付費關係解讀。請像資深關係占卜師一樣，把抽象的 Kin 能量翻成「兩個人真的相處時會發生什麼」。

文風要求：
- 有神秘感，但不要空泛；有心理洞察，但不要像教科書
- 少用條列，多用有畫面感的段落
- 可以直接點出關係盲點，語氣溫柔但不迴避
- 不要每段都用「這代表」「這象徵」開頭
- 不要重複說「支持、成長、連結、轉化」這些泛詞，除非後面接具體行為

回應結構（markdown）：
### ✦ 關係第一眼
用 3-5 句寫出這段關係的氣味、節奏與核心吸引力。要讓人覺得「這是在說我們」，不是星座式泛談。

### 🔗 你們如何牽動彼此
逐一解讀找到的關係類型。每一種關係都要包含：
1. 這個連結在日常相處中怎麼出現
2. 它帶來的禮物
3. 它的陰影或誤會模式
4. 一句可能發生在兩人之間的對話或內心 OS

### 🌀 合盤 Kin 能量
把合盤 Kin 解讀成「這段關係本身的生命」。說明這段關係會把兩人帶往哪種共同課題、共同創造或共同變化。

### ⚠️ 關係盲點
指出 2-3 個最容易卡住的地方。不要恐嚇，也不要粉飾。要具體到「誰可能退縮、誰可能過度承擔、哪種話題容易變成導火線」。

### 💡 具體相處練習
給 3 個可以在一週內執行的練習。每個練習要有做法、適合時機、想改善的關係模式。

### ✨ 最後一句話
一句溫暖但精準的收束，像真正寫給這兩個人的提醒。

控制在 900-1300 字。內容密度要像付費深度解讀。`;
}

function buildMayaComboUserPrompt(
  kinA: number, sealA: number, toneA: number,
  kinB: number, sealB: number, toneB: number,
  comboKin: number, comboSeal: number, comboTone: number,
  relations: Array<{ type: string; description: string; descriptionEn: string }>,
  locale: Locale,
): string {
  const labelA = mayaKinLabel(sealA, toneA, locale);
  const labelB = mayaKinLabel(sealB, toneB, locale);
  const labelCombo = mayaKinLabel(comboSeal, comboTone, locale);
  const isEn = locale === 'en';

  const relText = relations
    .map((r) => `- ${isEn ? r.descriptionEn : r.description}`)
    .join('\n');

  const kwA = `${mayaSealKeywords(sealA, locale).join(', ')} / ${mayaToneKeywords(toneA, locale).join(', ')}`;
  const kwB = `${mayaSealKeywords(sealB, locale).join(', ')} / ${mayaToneKeywords(toneB, locale).join(', ')}`;
  const kwCombo = `${mayaSealKeywords(comboSeal, locale).join(', ')} / ${mayaToneKeywords(comboTone, locale).join(', ')}`;

  if (isEn) {
    return `**Person A:** Kin ${kinA} — ${labelA}
Keywords: ${kwA}

**Person B:** Kin ${kinB} — ${labelB}
Keywords: ${kwB}

**Relationship types found:**
${relText}

**Combined Kin:** Kin ${comboKin} — ${labelCombo}
Keywords: ${kwCombo}

Please provide a deep relationship reading analyzing the cosmic connection between these two people.`;
  }

  if (locale === 'ja') {
    return `**Aさん：** Kin ${kinA} — ${labelA}
キーワード：${kwA}

**Bさん：** Kin ${kinB} — ${labelB}
キーワード：${kwB}

**見つかった関係タイプ：**
${relText}

**合算Kin：** Kin ${comboKin} — ${labelCombo}
キーワード：${kwCombo}

この二人の宇宙的つながりを分析する深層リレーションシップ鑑定をお願いします。`;
  }

  return `**第一人：** Kin ${kinA} — ${labelA}
關鍵字：${kwA}

**第二人：** Kin ${kinB} — ${labelB}
關鍵字：${kwB}

**找到的關係類型：**
${relText}

**合盤 Kin：** Kin ${comboKin} — ${labelCombo}
關鍵字：${kwCombo}

請提供深度關係解讀，分析這兩人之間的宇宙連結。

重要：請不要只解釋名詞。請把這些資料翻成「兩個人相處時的實際樣子」。例如：誰容易主動靠近、誰容易用沉默保護自己、哪種情境會激發支持、哪種情境會引爆挑戰、他們如何修復衝突。`;
}

function buildMayaSignatureSystemPrompt(locale: Locale): string {
  if (locale === 'en') {
    return `You are a Maya calendar guide using the Dreamspell/13 Moon Calendar system. Interpret a user's Galactic Signature with warmth, clarity, and practical psychological insight.

Use markdown. Keep the reading personal and specific, not generic. Do not claim certainty about fate; frame the reading as symbolic reflection and self-understanding.

Response structure:
### ✦ Signature Snapshot
Summarize the overall energy of this Kin in 2-3 sentences.

### 🌀 Core Seal
Explain the destiny seal: gifts, natural pattern, and growth edge.

### ◇ Galactic Tone
Explain the tone and its tone question in practical life.

### ✦ Five Positions
Explain guide, support, challenge, hidden, and destiny positions. Make each one useful and concrete.

### 🌊 Wavespell Context
Explain how the wavespell colors the larger life journey.

### 💡 Integration Practice
Give 3 specific practices or reflection prompts.

Keep it 600-850 words.`;
  }

  if (locale === 'ja') {
    return `あなたはDreamspell/13の月の暦を使うマヤ暦ガイドです。ユーザーの銀河の署名を、温かく、明確に、実践的な心理的洞察を交えて解釈してください。

マークダウンを使用。一般論ではなく、そのKinに固有の読みとして書いてください。運命を断定せず、象徴的な内省と自己理解として表現してください。

回答構造：
### ✦ 署名の概要
このKinの全体的なエネルギーを2-3文で要約。

### 🌀 中心の紋章
運命の紋章について、才能、自然なパターン、成長課題を説明。

### ◇ 銀河の音
音と音の問いが日常で何を意味するか説明。

### ✦ 五つの位置
ガイド、サポート、チャレンジ、隠された力、運命の位置を具体的に説明。

### 🌊 ウェイブスペル
ウェイブスペルが人生の大きな流れにどう影響するか説明。

### 💡 統合の実践
具体的な実践または内省の問いを3つ。

600-850字程度で。`;
  }

  return `你是一位使用 Dreamspell / 13 月亮曆系統的瑪雅曆引導師。請用溫暖、清楚、帶有實用心理洞見的方式，解讀使用者的星系印記。

使用 markdown。內容要針對這個 Kin 具體解讀，不要泛泛而談。不要斷言命運，請把它表達為象徵性的自我理解與內在整理工具。

回應結構：
### ✦ 印記速寫
用 2-3 句總結這個 Kin 的整體能量。

### 🌀 核心圖騰
解讀自身／命運圖騰：天賦、自然模式、成長課題。

### ◇ 銀河調性
解讀調性與調性提問在日常生活中的意義。

### ✦ 五方位解讀
依序解讀引導、支持、挑戰、隱藏、自身，每個位置都要具體且能落地。

### 🌊 波符脈絡
說明波符圖騰如何影響這段生命旅程的背景主題。

### 💡 整合練習
給 3 個具體練習或反思題。

控制在 600-850 字。`;
}

function buildMayaSignatureUserPrompt(
  kin: number,
  seal: number,
  tone: number,
  guide: number,
  support: number,
  challenge: number,
  hidden: number,
  wavespellSeal: number,
  locale: Locale,
): string {
  const label = mayaKinLabel(seal, tone, locale);
  const sealKw = mayaSealKeywords(seal, locale).join(', ');
  const toneKw = mayaToneKeywords(tone, locale).join(', ');
  const toneQuestion = mayaToneQuestion(tone, locale);
  const positionLine = (name: string, sealNumber: number) =>
    `- ${name}: Seal ${sealNumber} ${mayaSealName(sealNumber, locale)} — ${mayaSealKeywords(sealNumber, locale).join(', ')}`;

  if (locale === 'en') {
    return `**User's Galactic Signature**
- Kin ${kin}: ${label}
- Destiny seal: Seal ${seal} ${mayaSealName(seal, locale)} (${SEAL_COLORS[seal]})
- Seal keywords: ${sealKw}
- Galactic tone: Tone ${tone} ${mayaToneName(tone, locale)}
- Tone keywords: ${toneKw}
- Tone question: "${toneQuestion}"

**Five Positions**
${positionLine('Guide', guide)}
${positionLine('Support', support)}
${positionLine('Challenge', challenge)}
${positionLine('Hidden power', hidden)}
${positionLine('Destiny / Self', seal)}

**Wavespell**
${positionLine('Wavespell seal', wavespellSeal)}

Please provide a full Galactic Signature reading for this person.`;
  }

  if (locale === 'ja') {
    return `**ユーザーの銀河の署名**
- Kin ${kin}：${label}
- 運命の紋章：Seal ${seal} ${mayaSealName(seal, locale)}（${SEAL_COLORS[seal]}）
- 紋章キーワード：${sealKw}
- 銀河の音：Tone ${tone} ${mayaToneName(tone, locale)}
- 音キーワード：${toneKw}
- 音の問い：「${toneQuestion}」

**五つの位置**
${positionLine('ガイド', guide)}
${positionLine('サポート', support)}
${positionLine('チャレンジ', challenge)}
${positionLine('隠された力', hidden)}
${positionLine('運命／自己', seal)}

**ウェイブスペル**
${positionLine('ウェイブスペルの紋章', wavespellSeal)}

この人の銀河の署名を総合的に解読してください。`;
  }

  return `**使用者星系印記**
- Kin ${kin}：${label}
- 自身／命運圖騰：Seal ${seal} ${mayaSealName(seal, locale)}（${SEAL_COLORS[seal]}）
- 圖騰關鍵字：${sealKw}
- 銀河調性：Tone ${tone} ${mayaToneName(tone, locale)}
- 調性關鍵字：${toneKw}
- 調性提問：「${toneQuestion}」

**五方位**
${positionLine('引導', guide)}
${positionLine('支持', support)}
${positionLine('挑戰', challenge)}
${positionLine('隱藏力量', hidden)}
${positionLine('自身／命運', seal)}

**波符**
${positionLine('波符圖騰', wavespellSeal)}

請為這個人提供完整星系印記解讀。`;
}

// ── 瑪雅流日 AI 解讀 ─────────────────────────────────

interface MayaDailyRequest {
  dailyKin: number;
  dailySeal: number;
  dailyTone: number;
  userKin: number;
  userSeal: number;
  userTone: number;
  locale?: Locale;
}

function assertMayaDailyRequest(data: unknown): MayaDailyRequest {
  const d = data as Record<string, unknown>;
  if (!d || typeof d.dailyKin !== 'number' || typeof d.userKin !== 'number') {
    throw new HttpsError('invalid-argument', '缺少必要的 Kin 參數');
  }
  return {
    dailyKin: d.dailyKin as number,
    dailySeal: d.dailySeal as number,
    dailyTone: d.dailyTone as number,
    userKin: d.userKin as number,
    userSeal: d.userSeal as number,
    userTone: d.userTone as number,
    locale: (d.locale as Locale) ?? 'zh-TW',
  };
}

export const generateMayaDailyReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    const uid = requireUid(request.auth?.uid);
    checkRateLimit(uid);
    const data = assertMayaDailyRequest(request.data);
    const locale = data.locale ?? 'zh-TW';

    const systemPrompt = `${buildMayaDailySystemPrompt(locale)}

${buildMayaQualityRules(locale, 'daily')}`;
    const userPrompt = buildMayaDailyUserPrompt(
      data.dailyKin, data.dailySeal, data.dailyTone,
      data.userKin, data.userSeal, data.userTone,
      locale,
    );

    await chargeCredits(uid, MAYA_DAILY_COST, '瑪雅流日解讀');

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        2000,
        MAYA_AI_MODEL,
      );

      return {
        interpretation: result.text,
        tokenUsage: result.usage
          ? { input: result.usage.prompt_tokens, output: result.usage.completion_tokens }
          : undefined,
      };
    } catch (error) {
      await refundCredits(uid, MAYA_DAILY_COST, '瑪雅流日解讀失敗退還');
      throw error;
    }
  },
);

// ── 瑪雅星系印記完整 AI 解讀 ─────────────────────────────

interface MayaSignatureRequest {
  kin: number;
  seal: number;
  tone: number;
  guide: number;
  support: number;
  challenge: number;
  hidden: number;
  wavespellSeal: number;
  locale?: Locale;
}

function assertMayaSignatureRequest(data: unknown): MayaSignatureRequest {
  const d = data as Record<string, unknown>;
  if (!d || typeof d.kin !== 'number' || typeof d.seal !== 'number' || typeof d.tone !== 'number') {
    throw new HttpsError('invalid-argument', '缺少必要的星系印記參數');
  }
  return {
    kin: d.kin as number,
    seal: d.seal as number,
    tone: d.tone as number,
    guide: d.guide as number,
    support: d.support as number,
    challenge: d.challenge as number,
    hidden: d.hidden as number,
    wavespellSeal: d.wavespellSeal as number,
    locale: (d.locale as Locale) ?? 'zh-TW',
  };
}

export const generateMayaSignatureReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    const uid = requireUid(request.auth?.uid);
    checkRateLimit(uid);
    const data = assertMayaSignatureRequest(request.data);
    const locale = data.locale ?? 'zh-TW';

    const systemPrompt = `${buildMayaSignatureSystemPrompt(locale)}

${buildMayaQualityRules(locale, 'signature')}`;
    const userPrompt = buildMayaSignatureUserPrompt(
      data.kin,
      data.seal,
      data.tone,
      data.guide,
      data.support,
      data.challenge,
      data.hidden,
      data.wavespellSeal,
      locale,
    );

    await chargeCredits(uid, MAYA_SIGNATURE_COST, '瑪雅星系印記完整解讀');

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        3200,
        MAYA_AI_MODEL,
      );

      return {
        interpretation: result.text,
        tokenUsage: result.usage
          ? { input: result.usage.prompt_tokens, output: result.usage.completion_tokens }
          : undefined,
      };
    } catch (error) {
      await refundCredits(uid, MAYA_SIGNATURE_COST, '瑪雅星系印記完整解讀失敗退還');
      throw error;
    }
  },
);

// ── 瑪雅合盤 AI 解讀 ─────────────────────────────────

interface MayaComboRequest {
  kinA: number; sealA: number; toneA: number;
  kinB: number; sealB: number; toneB: number;
  comboKin: number; comboSeal: number; comboTone: number;
  relations: Array<{ type: string; description: string; descriptionEn: string }>;
  locale?: Locale;
}

function assertMayaComboRequest(data: unknown): MayaComboRequest {
  const d = data as Record<string, unknown>;
  if (!d || typeof d.kinA !== 'number' || typeof d.kinB !== 'number' || typeof d.comboKin !== 'number') {
    throw new HttpsError('invalid-argument', '缺少必要的合盤 Kin 參數');
  }
  return {
    kinA: d.kinA as number, sealA: d.sealA as number, toneA: d.toneA as number,
    kinB: d.kinB as number, sealB: d.sealB as number, toneB: d.toneB as number,
    comboKin: d.comboKin as number, comboSeal: d.comboSeal as number, comboTone: d.comboTone as number,
    relations: d.relations as MayaComboRequest['relations'],
    locale: (d.locale as Locale) ?? 'zh-TW',
  };
}

export const generateMayaComboReading = onCall(
  { region: REGION, secrets: [openAIKey], timeoutSeconds: 120 },
  async (request) => {
    const uid = requireUid(request.auth?.uid);
    checkRateLimit(uid);
    const data = assertMayaComboRequest(request.data);
    const locale = data.locale ?? 'zh-TW';

    const systemPrompt = `${buildMayaComboSystemPrompt(locale)}

${buildMayaQualityRules(locale, 'combo')}`;
    const userPrompt = buildMayaComboUserPrompt(
      data.kinA, data.sealA, data.toneA,
      data.kinB, data.sealB, data.toneB,
      data.comboKin, data.comboSeal, data.comboTone,
      data.relations,
      locale,
    );

    await chargeCredits(uid, MAYA_COMBO_COST, '瑪雅合盤解讀');

    try {
      const result = await chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        4200,
        MAYA_AI_MODEL,
      );

      return {
        interpretation: result.text,
        tokenUsage: result.usage
          ? { input: result.usage.prompt_tokens, output: result.usage.completion_tokens }
          : undefined,
      };
    } catch (error) {
      await refundCredits(uid, MAYA_COMBO_COST, '瑪雅合盤解讀失敗退還');
      throw error;
    }
  },
);

// ========== 每日回顧推播 ==========

/**
 * 每日早上 9:00 (Asia/Taipei) 觸發，查詢昨天有占卜紀錄的用戶，
 * 發送 FCM 推播提醒回顧。
 */
export const dailyReadingReview = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'Asia/Taipei',
    region: REGION,
  },
  async () => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const twoDaysAgo = now - 48 * 60 * 60 * 1000;

    try {
      // 查詢 24~48 小時前有占卜紀錄的用戶
      const readingsSnapshot = await db
        .collectionGroup('readings')
        .where('timestamp', '>=', twoDaysAgo)
        .where('timestamp', '<=', oneDayAgo)
        .orderBy('timestamp', 'desc')
        .get();

      if (readingsSnapshot.empty) {
        console.log('[dailyReview] 沒有符合條件的占卜紀錄');
        return;
      }

      // 按 userId 分組，取每人最新的一筆
      const userLatestReading = new Map<string, DocumentData>();
      for (const doc of readingsSnapshot.docs) {
        const data = doc.data();
        const uid = doc.ref.parent.parent?.id;
        if (!uid) continue;
        if (!userLatestReading.has(uid)) {
          userLatestReading.set(uid, { ...data, id: doc.id });
        }
      }

      console.log(`[dailyReview] 找到 ${userLatestReading.size} 位用戶的昨日占卜`);

      const messaging = getMessaging();
      let sentCount = 0;
      let failCount = 0;

      for (const [uid, reading] of userLatestReading) {
        // 取得該用戶的所有 FCM tokens
        const tokensSnapshot = await db
          .collection(`users/${uid}/fcmTokens`)
          .get();

        if (tokensSnapshot.empty) continue;

        const tokens = tokensSnapshot.docs.map((d) => d.data().token as string);
        const summary = reading.summary
          ? (reading.summary as string).slice(0, 60)
          : (reading.question as string)?.slice(0, 60) ?? '昨天的占卜';

        const message = {
          notification: {
            title: '✦ 回顧昨天的指引',
            body: summary + (summary.length >= 60 ? '…' : ''),
          },
          data: {
            type: 'daily_review',
            readingId: reading.id as string,
            url: `${APP_BASE_URL}/history`,
          },
          tokens,
        };

        try {
          const result = await messaging.sendEachForMulticast(message);
          sentCount += result.successCount;
          failCount += result.failureCount;

          // 清除無效 tokens
          for (let i = 0; i < result.responses.length; i++) {
            if (!result.responses[i].success) {
              const errorCode = result.responses[i].error?.code;
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                await db
                  .doc(`users/${uid}/fcmTokens/${tokens[i]}`)
                  .delete()
                  .catch(() => {});
              }
            }
          }
        } catch (err) {
          console.error(`[dailyReview] 發送推播給 ${uid} 失敗:`, err);
          failCount += tokens.length;
        }
      }

      console.log(`[dailyReview] 完成：成功 ${sentCount}，失敗 ${failCount}`);
    } catch (err) {
      console.error('[dailyReview] 排程推播執行失敗:', err);
    }
  },
);
