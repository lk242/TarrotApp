# 架構總覽

## MVC 分層

```
View (src/views/)
  ↓ 使用者操作
Controller (src/controllers/ — React Hooks)
  ↓ 呼叫業務方法
Services (src/services/ — 純邏輯，零 React 依賴)
  ↓ 讀寫資料
Models (src/models/ — 純型別) + 外部服務
```

## 資料流
1. 使用者在 View 選擇牌陣、輸入問題
2. Controller hook (`useTarotSession`) 驅動狀態機
3. `tarot-engine` Service 執行洗牌/切牌/抽牌
4. AI Provider 生成解讀
5. Storage Provider 儲存紀錄
6. View 渲染結果

## 關鍵抽象
- `IAIProvider`：AI 解讀服務介面（可替換 Claude / OpenAI / Mock）
- `IStorageProvider`：儲存介面（Firestore / localStorage）
- `useTarotSession`：占卜流程狀態機（idle → shuffling → cutting → drawing → interpreting → complete）
