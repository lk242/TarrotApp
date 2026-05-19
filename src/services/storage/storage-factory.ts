import type { IStorageProvider } from './storage-provider';
import { LocalStorageProvider } from './local-storage-provider';
import { FirestoreProvider } from './firestore-provider';

const localProvider = new LocalStorageProvider();

/**
 * Storage provider 工廠。
 *
 * - userId 存在：代表已登入，紀錄寫入 Firestore users/{uid}/readings。
 * - userId 不存在：匿名使用，紀錄保存在 localStorage。
 */
export function getStorageProvider(userId?: string | null): IStorageProvider {
  if (userId) {
    return new FirestoreProvider(userId);
  }
  return localProvider;
}
