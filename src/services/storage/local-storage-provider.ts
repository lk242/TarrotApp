import type { Reading } from '../../models/reading';
import type { IStorageProvider } from './storage-provider';

const STORAGE_KEY = 'tarot-readings';
const MAX_READINGS = 50;

/**
 * 匿名使用者的本機紀錄儲存層。
 *
 * API 仍然回傳 Promise，讓 Controller 不需要知道目前是 localStorage
 * 還是 Firestore，兩種 provider 可以被同一套流程替換。
 */
export class LocalStorageProvider implements IStorageProvider {
  async getReadings(): Promise<Reading[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const readings: Reading[] = JSON.parse(raw);
      return readings.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      // JSON 被手動改壞或瀏覽器 storage 不可用時，不阻斷占卜流程。
      return [];
    }
  }

  async saveReading(reading: Reading): Promise<string> {
    const readings = await this.getReadings();
    readings.unshift(reading);
    const trimmed = readings.slice(0, MAX_READINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    return reading.id;
  }

  async updateReading(id: string, data: Partial<Reading>): Promise<void> {
    const readings = await this.getReadings();
    const idx = readings.findIndex((r) => r.id === id);
    if (idx >= 0) {
      readings[idx] = { ...readings[idx], ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
    }
  }

  async deleteReading(id: string): Promise<void> {
    const readings = await this.getReadings();
    const filtered = readings.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}
