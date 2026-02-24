import { anthropic } from '@ai-sdk/anthropic';

export type SearchProvider = 'anthropic' | 'openai' | 'google';

export function createWebSearchTool(provider: SearchProvider = 'anthropic') {
  switch (provider) {
    case 'anthropic':
      return anthropic.tools.webSearch_20250305({
        maxUses: 5,
      });
    case 'openai': {
      // Requires @ai-sdk/openai + OPENAI_API_KEY
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { openai } = require('@ai-sdk/openai');
      return openai.tools.webSearch({ searchContextSize: 'medium' });
    }
    case 'google': {
      // Requires @ai-sdk/google + GOOGLE_GENERATIVE_AI_API_KEY
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { google } = require('@ai-sdk/google');
      return google.tools.googleSearch({});
    }
    default:
      throw new Error(`Unsupported web search provider: ${provider}`);
  }
}

const provider = (process.env.WEB_SEARCH_PROVIDER || 'anthropic') as SearchProvider;
export const webSearch = createWebSearchTool(provider);
