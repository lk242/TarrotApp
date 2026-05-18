# Tarot Engine

定義於 `src/services/tarot-engine.ts`

## 函式
| 函式 | 說明 |
|------|------|
| `shuffleDeck(deck?)` | Fisher-Yates 洗牌，回傳新陣列 |
| `cutDeck(deck)` | 隨機切牌，回傳重組後陣列 |
| `drawCards(deck, spreadType)` | 依牌陣抽取對應數量的牌，附帶正逆位判定 |
| `performReading(spreadType)` | 組合完整流程：洗牌→切牌→抽牌 |

## 資料來源
- 78 張牌定義：`src/config/tarot-data.ts`
- 牌陣定義：`src/models/spread.ts`
