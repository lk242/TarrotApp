import type { IAIProvider, AIProviderType } from './ai-provider';
import { MockProvider } from './mock-provider';
import { ClaudeProvider } from './claude-provider';
import { OpenAIProvider } from './openai-provider';
import { FunctionsProvider } from './functions-provider';

/**
 * 依指定類型建立 AI provider。
 *
 * 注意：
 * - claude/openai 會把 key 交給前端 provider，只適合本機開發或臨時測試。
 * - functions 是 production 預設，實際 key 放 Firebase Secret，不進瀏覽器 bundle。
 */
export function createAIProvider(type: AIProviderType): IAIProvider {
  switch (type) {
    case 'claude': {
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
      if (!key) throw new Error('缺少 VITE_ANTHROPIC_API_KEY 環境變數');
      return new ClaudeProvider(key);
    }
    case 'openai': {
      const key = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
      if (!key) throw new Error('缺少 VITE_OPENAI_API_KEY 環境變數');
      return new OpenAIProvider(key);
    }
    case 'functions':
      return new FunctionsProvider();
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`未知的 AI Provider: ${type}`);
  }
}

export function getConfiguredProvider(): IAIProvider {
  // Vite 會在 build 時替換 import.meta.env；部署正式站時請使用 VITE_AI_PROVIDER=functions。
  const type = (import.meta.env.VITE_AI_PROVIDER as AIProviderType | undefined) || 'functions';
  return createAIProvider(type);
}
