import { anthropic } from '@ai-sdk/anthropic';

// Cap tool uses per agent invocation to control cost/latency while allowing sufficient research depth
const MAX_SEARCH_USES = 5;
const MAX_FETCH_USES = 15;

export const webSearch = anthropic.tools.webSearch_20250305({
  maxUses: MAX_SEARCH_USES,
});

export const webFetch = anthropic.tools.webFetch_20250910({
  maxUses: MAX_FETCH_USES,
  maxContentTokens: 20000,
  citations: { enabled: true },
});
