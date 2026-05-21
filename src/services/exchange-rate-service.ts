/**
 * 即時匯率服務
 *
 * 以 TWD 為基準，取得 USD / JPY 等外幣匯率。
 * 使用 Open Exchange Rates API（免費、無需 key），
 * 結果快取在 localStorage，TTL = 1 小時。
 */

const CACHE_KEY = 'mystic-tarot-fx-rates';
const CACHE_TTL = 60 * 60 * 1000; // 1 小時
const API_URL = 'https://open.er-api.com/v6/latest/TWD';

export interface FxRates {
  /** 1 TWD = ? USD */
  USD: number;
  /** 1 TWD = ? JPY */
  JPY: number;
  /** 快取時間戳 */
  fetchedAt: number;
}

/** 硬編碼 fallback（避免 API 失敗時無法顯示） */
const FALLBACK: FxRates = {
  USD: 0.032,
  JPY: 4.8,
  fetchedAt: 0,
};

interface CachedData {
  rates: FxRates;
  timestamp: number;
}

function readCache(): FxRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedData = JSON.parse(raw);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.rates;
    }
    return null; // 過期
  } catch {
    return null;
  }
}

function writeCache(rates: FxRates) {
  try {
    const data: CachedData = { rates, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 滿了也不影響功能
  }
}

/** 從 API 抓取最新匯率 */
export async function fetchExchangeRates(): Promise<FxRates> {
  // 先讀快取
  const cached = readCache();
  if (cached) return cached;

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();

    // open.er-api.com 回傳格式: { rates: { USD: 0.032, JPY: 4.8, ... } }
    const rates: FxRates = {
      USD: json.rates?.USD ?? FALLBACK.USD,
      JPY: json.rates?.JPY ?? FALLBACK.JPY,
      fetchedAt: Date.now(),
    };

    writeCache(rates);
    return rates;
  } catch {
    // API 失敗時回傳 fallback
    return { ...FALLBACK, fetchedAt: Date.now() };
  }
}

/** 語系 → 貨幣代碼對照 */
const LANG_CURRENCY: Record<string, 'TWD' | 'USD' | 'JPY'> = {
  'zh-TW': 'TWD',
  en: 'USD',
  ja: 'JPY',
};

/** 貨幣符號 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  TWD: 'NT$',
  USD: '$',
  JPY: '¥',
};

/** 根據語系轉換 TWD 金額 */
export function convertPrice(twdAmount: number, lang: string, rates: FxRates): {
  amount: number;
  symbol: string;
  display: string;
} {
  const currency = LANG_CURRENCY[lang] ?? 'TWD';
  const symbol = CURRENCY_SYMBOLS[currency] ?? 'NT$';

  if (currency === 'TWD') {
    return { amount: twdAmount, symbol, display: `${symbol}${twdAmount}` };
  }

  const rate = currency === 'USD' ? rates.USD : rates.JPY;
  let converted = twdAmount * rate;

  if (currency === 'JPY') {
    // 日圓取整到十位
    converted = Math.round(converted / 10) * 10;
  } else {
    // USD 保留兩位小數
    converted = Math.round(converted * 100) / 100;
  }

  return { amount: converted, symbol, display: `${symbol}${converted}` };
}
