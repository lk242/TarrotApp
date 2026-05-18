# 神秘塔羅 — 線上占卜 App

## 專案概述
一款線上塔羅占卜 Web 應用，結合傳統 78 張韋特塔羅牌組與 AI 牌義解讀，提供沉浸式的神秘占卜體驗。

## 核心功能
1. **占卜抽卡** — 支援三種牌陣（單牌、三牌、凱爾特十字），含洗牌/切牌/抽牌流程動畫
2. **AI 牌義解讀** — 透過可替換式 AI Provider（預設 Claude API）生成深度解讀
3. **抽卡紀錄** — 最多 10 筆紀錄，已登入用戶存 Firestore，匿名用戶存 localStorage
4. **Google 登入** — Firebase Auth 整合

## 架構
- **MVC 分層**：Model (`src/models/`) → Service + Controller (`src/services/`, `src/controllers/`) → View (`src/views/`)
- **AI 抽象層**：`IAIProvider` 介面 + 工廠模式，可切換 Claude / OpenAI / Mock
- **Storage 抽象層**：`IStorageProvider` 介面，自動依登入狀態切換 Firestore / localStorage

## 技術棧
React 19 + TypeScript + Vite + Tailwind CSS v4 + Framer Motion + Firebase (Auth/Firestore/Functions)
