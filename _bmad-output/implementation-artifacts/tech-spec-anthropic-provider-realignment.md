# Anthropic-Only Provider & Built-in Tools Realignment

**Status:** Completed (2026-02-25)

## Context

Architecture decision AD-5 locks the project to Anthropic as the exclusive LLM provider, enabling use of Anthropic's built-in provider-defined tools. This eliminates custom tool implementations that duplicate what the provider handles natively — with better quality.

**Key capabilities unlocked:**
- **Web search** (provider-defined): Server-side web search already in use, but currently wrapped in a multi-provider factory
- **Web fetch with dynamic filtering**: Claude reads a URL and writes code to extract only relevant parts before they enter the context window — replaces the custom `fetchPage` tool
- **Programmatic tool calling**: Claude can batch search→fetch→extract cycles, reducing API round-trips — replaces the need for dedicated `findExistingTalks` and `extractStats` tools

## Scope

Realign the existing Story 1.2 implementation (Researcher Agent & Core Web Tools) to use Anthropic's built-in tools, remove unnecessary abstractions, and update Story 1.3 scope.

### Files to Modify
| File | Action |
|------|--------|
| `src/mastra/tools/web-search.ts` | Simplify — remove multi-provider factory, export Anthropic provider-defined tools directly |
| `src/mastra/agents/researcher.ts` | Update — replace `fetchPage` binding with Anthropic's built-in `webFetch` tool |
| `src/mastra/index.ts` | Update — remove `fetchPage` import if present |
| `src/mastra/tools/__tests__/web-search.test.ts` | Update — remove multi-provider tests, test Anthropic-only exports |
| `src/mastra/agents/__tests__/researcher.test.ts` | Update — verify new tool bindings |

### Files to Delete
| File | Reason |
|------|--------|
| `src/mastra/tools/fetch-page.ts` | Replaced by Anthropic built-in `web_fetch` with dynamic filtering |
| `src/mastra/tools/__tests__/fetch-page.test.ts` | Tests for removed tool |

### Backlog Impact
| Item | Change |
|------|--------|
| Story 1.3 (Supplementary Research Tools) | **Eliminated** — `findExistingTalks` and `extractStats` are now handled natively by the researcher agent via built-in search→fetch→filter pipeline and programmatic tool calling. Remove from sprint backlog. |

## Implementation Tasks

### Task 1: Simplify web-search.ts to Anthropic-only

Remove the multi-provider factory. Export Anthropic's provider-defined web search and web fetch tools directly.

**Before:**
```typescript
export type SearchProvider = 'anthropic' | 'openai' | 'google';
export async function createWebSearchTool(provider: SearchProvider = 'anthropic') {
  switch (provider) { /* ... */ }
}
const provider = (process.env.WEB_SEARCH_PROVIDER || 'anthropic') as SearchProvider;
export const webSearch = await createWebSearchTool(provider);
```

**After:**
```typescript
import { anthropic } from '@ai-sdk/anthropic';

export const webSearch = anthropic.tools.webSearch_20250305({
  maxUses: 5,
});

export const webFetch = anthropic.tools.webFetch_20260209({});
```

> **Note:** Verify the exact `webFetch` tool name against `@ai-sdk/anthropic` exports at implementation time. The user referenced `web_fetch_20260209` — confirm the camelCase equivalent.

**Cleanup:**
- Remove `WEB_SEARCH_PROVIDER` from `.env.example` if present
- Remove `SearchProvider` type export

### Task 2: Delete fetch-page.ts and its tests

Remove the custom fetch-page tool entirely:
- Delete `src/mastra/tools/fetch-page.ts`
- Delete `src/mastra/tools/__tests__/fetch-page.test.ts`

### Task 3: Update researcher agent tool bindings

**Before:**
```typescript
import { webSearch } from '../tools/web-search';
import { fetchPage } from '../tools/fetch-page';
// ...
tools: { webSearch, fetchPage },
```

**After:**
```typescript
import { webSearch, webFetch } from '../tools/web-search';
// ...
tools: { webSearch, webFetch },
```

Also update the researcher's system prompt instructions to reference the built-in web fetch capability explicitly. The agent should know it can:
1. Search the web for results
2. Fetch and read full pages with intelligent content extraction
3. Orchestrate multi-step search→fetch→extract pipelines

### Task 4: Update tests

**web-search.test.ts:**
- Remove tests for `createWebSearchTool` factory
- Remove tests for provider selection (`openai`, `google` branches)
- Remove tests for unsupported provider error
- Add test: `webSearch` export exists and is defined
- Add test: `webFetch` export exists and is defined
- Keep test: default export is Anthropic provider (verify type/structure)

**researcher.test.ts:**
- Update tool binding test: verify `webSearch` and `webFetch` are bound (was: `webSearch` and `fetchPage`)
- Remove any `fetchPage` references
- Keep all schema validation tests unchanged

### Task 5: Update sprint-status.yaml

Mark Story 1.3 (Supplementary Research Tools) as eliminated:
- Change `1-3-supplementary-research-tools: backlog` to `1-3-supplementary-research-tools: removed # AD-5: handled natively by Anthropic built-in tools`

### Task 6: Run full test suite and type-check

```bash
pnpm test
pnpm build  # or tsc --noEmit for type-check
```

All tests must pass. Zero type errors.

## Acceptance Criteria

- `web-search.ts` exports `webSearch` and `webFetch` as Anthropic provider-defined tools with no multi-provider abstraction
- `fetch-page.ts` and its tests are deleted
- Researcher agent binds `webSearch` and `webFetch` (not `fetchPage`)
- No references to `fetchPage`, `createWebSearchTool`, `SearchProvider`, or `WEB_SEARCH_PROVIDER` remain in the codebase
- All tests pass
- TypeScript compiles with zero errors
- Story 1.3 marked as removed in sprint-status.yaml

## Risk Notes

- **web_fetch tool name**: Resolved — installed SDK exposes `webFetch_20250910`.
- **No fallback**: With the multi-provider factory removed, there is no path to switch providers without code changes. This is the accepted AD-5 tradeoff.
- **Story 1.3 elimination requires validation**: The claim that the researcher agent handles existing talk discovery and stat extraction natively (via built-in search→fetch→filter) is unvalidated. The `ResearcherOutputSchema` enforces the contract (`existingTalks[]`, `statistics[]` are required), so failures will surface on first real agent run. **Validation checkpoint:** when the researcher agent is first invoked end-to-end (Story 1.6 or manual Studio test), verify that the output reliably populates these fields. If quality is insufficient, reintroduce dedicated tools as a focused story.

## Review Notes
- Adversarial review completed
- Findings: 13 total, 10 fixed, 3 skipped
- Resolution approach: walk-through
- Key fixes applied: `maxContentTokens` safety rail, `maxUses` on both tools, citations enabled, test coverage restored with config/interface assertions, architecture doc clarified, sprint status schema updated, validation checkpoint documented for Story 1.3 elimination
