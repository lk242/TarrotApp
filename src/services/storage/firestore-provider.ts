import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  orderBy,
  getDocs,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type { Reading } from '../../models/reading';
import type { IStorageProvider } from './storage-provider';

const MAX_READINGS = 100;

/**
 * 已登入使用者的占卜紀錄儲存層。
 *
 * Firestore 安全規則會限制每個 uid 只能讀寫自己的
 * users/{userId}/readings/{readingId} 路徑。
 */
export class FirestoreProvider implements IStorageProvider {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private get col() {
    // 將 collection path 集中在這裡，避免其他方法重複字串造成路徑不一致。
    return collection(db, 'users', this.userId, 'readings');
  }

  async getReadings(): Promise<Reading[]> {
    const q = query(this.col, orderBy('timestamp', 'desc'), limit(MAX_READINGS));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Reading);
  }

  async saveReading(reading: Reading): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...data } = reading;
    const docRef = await addDoc(this.col, { ...data, timestamp: reading.timestamp });
    return docRef.id;
  }

  async updateReading(id: string, data: Partial<Reading>): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _discardId, ...updateData } = data;
    const docRef = doc(db, 'users', this.userId, 'readings', id);
    await updateDoc(docRef, updateData);
  }

  async deleteReading(id: string): Promise<void> {
    await deleteDoc(doc(db, 'users', this.userId, 'readings', id));
  }
}
