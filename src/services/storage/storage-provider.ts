import type { Reading } from '../../models/reading';

export const MAX_READINGS = 10;

export interface IStorageProvider {
  getReadings(): Promise<Reading[]>;
  saveReading(reading: Reading): Promise<void>;
  deleteReading(id: string): Promise<void>;
}
