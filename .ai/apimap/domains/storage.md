# Storage 抽象層

## 介面：`IStorageProvider`
定義於 `src/services/storage/storage-provider.ts`

| 方法 | 說明 |
|------|------|
| `getReadings()` | 取得所有歷史紀錄 |
| `saveReading(reading)` | 儲存一筆紀錄（自動限制最多 10 筆） |
| `deleteReading(id)` | 刪除指定紀錄 |

## 實作
| Provider | 檔案 | 適用情境 |
|----------|------|----------|
| LocalStorageProvider | `src/services/storage/local-storage.ts` | 匿名用戶 |
| FirestoreStorage | 待實作 | 已登入用戶（Phase 3） |
