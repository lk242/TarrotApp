import { useState, useEffect } from 'react';
import { fetchExchangeRates, convertPrice, type FxRates } from '../services/exchange-rate-service';

const FALLBACK: FxRates = { USD: 0.032, JPY: 4.8, fetchedAt: 0 };

/**
 * 匯率 hook — 啟動時抓一次（有快取），提供 convert 函式。
 */
export function useExchangeRate(lang: string) {
  const [rates, setRates] = useState<FxRates>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchExchangeRates().then((r) => {
      if (!cancelled) {
        setRates(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  /** 將 TWD 金額轉換為當前語系貨幣 */
  const convert = (twdAmount: number) => convertPrice(twdAmount, lang, rates);

  return { rates, loading, convert };
}
