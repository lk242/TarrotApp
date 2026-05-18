import type { IAIProvider, AIProviderType } from './ai-provider';
import { MockProvider } from './mock-provider';
import { ClaudeProvider } from './claude-provider';

export function createAIProvider(type: AIProviderType): IAIProvider {
  switch (type) {
    case 'claude': {
      const key = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
      if (!key) throw new Error('缺少 VITE_ANTHROPIC_API_KEY 環境變數');
      return new ClaudeProvider(key);
    }
    case 'openai':
      throw new Error('OpenAIProvider 尚未實作，請使用 mock');
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`未知的 AI Provider: ${type}`);
  }
}

export function getConfiguredProvider(): IAIProvider {
  const type = (import.meta.env.VITE_AI_PROVIDER as AIProviderType) || 'mock';
  return createAIProvider(type);
}
