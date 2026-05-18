import type { Reading } from '../../models/reading';
import type { IStorageProvider } from './storage-provider';
import { MAX_READINGS } from './storage-provider';

const STORAGE_KEY = 'tarot-readings';

export class LocalStorageProvider implements IStorageProvider {
  async getReadings(): Promise<Reading[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Reading[];
  }

  async saveReading(reading: Reading): Promise<void> {
    const readings = await this.getReadings();
    readings.unshift(reading);
    const trimmed = readings.slice(0, MAX_READINGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }

  async deleteReading(id: string): Promise<void> {
    const readings = await this.getReadings();
    const filtered = readings.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}
