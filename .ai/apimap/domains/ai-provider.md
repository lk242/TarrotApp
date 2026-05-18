# AI Provider 抽象層

## 介面：`IAIProvider`
定義於 `src/services/ai/ai-provider.ts`

| 方法 | 說明 |
|------|------|
| `interpret(request)` | 傳入牌陣與問題，回傳 AI 解讀結果 |
| `isAvailable()` | 檢查 provider 是否可用 |

## 實作
| Provider | 檔案 | 狀態 |
|----------|------|------|
| MockProvider | `src/services/ai/mock-provider.ts` | 可用 |
| ClaudeProvider | 待實作 | Phase 4 |
| OpenAIProvider | 待實作 | 備選 |

## 工廠
`createAIProvider(type)` — `src/services/ai/ai-factory.ts`
