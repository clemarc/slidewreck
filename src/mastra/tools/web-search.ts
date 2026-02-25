import { anthropic } from '@ai-sdk/anthropic';

export type SearchProvider = 'anthropic' | 'openai' | 'google';

export async function createWebSearchTool(provider: SearchProvider = 'anthropic') {
  switch (provider) {
    case 'anthropic':
      return anthropic.tools.webSearch_20250305({
        maxUses: 5,
      });
    case 'openai': {
      // @ts-expect-error — optional dependency, only installed when provider=openai
      const { openai } = await import('@ai-sdk/openai');
      return openai.tools.webSearch({ searchContextSize: 'medium' });
    }
    case 'google': {
      // @ts-expect-error — optional dependency, only installed when provider=google
      const { google } = await import('@ai-sdk/google');
      return google.tools.googleSearch({});
    }
    default:
      throw new Error(`Unsupported web search provider: ${provider}`);
  }
}

const provider = (process.env.WEB_SEARCH_PROVIDER || 'anthropic') as SearchProvider;
export const webSearch = await createWebSearchTool(provider);
