import { describe, it, expect } from 'vitest';
import { webSearch, webFetch } from '../web-search';

// Provider-defined tools expose `id` and `args` at runtime but not in TS type declarations.
// Cast to access these runtime properties for config verification.
const webSearchAny = webSearch as Record<string, unknown>;
const webFetchAny = webFetch as Record<string, unknown>;

describe('Anthropic provider-defined tools', () => {
  describe('webSearch', () => {
    it('should be a provider-defined tool', () => {
      expect(webSearch).toBeDefined();
      expect(webSearch.type).toBe('provider');
    });

    it('should have the correct tool identifier', () => {
      expect(webSearchAny.id).toBe('anthropic.web_search_20250305');
    });

    it('should be configured with maxUses limit', () => {
      expect(webSearchAny.args).toEqual({ maxUses: 5 });
    });
  });

  describe('webFetch', () => {
    it('should be a provider-defined tool', () => {
      expect(webFetch).toBeDefined();
      expect(webFetch.type).toBe('provider');
    });

    it('should have the correct tool identifier', () => {
      expect(webFetchAny.id).toBe('anthropic.web_fetch_20250910');
    });

    it('should be configured with maxUses, maxContentTokens, and citations', () => {
      expect(webFetchAny.args).toEqual({
        maxUses: 15,
        maxContentTokens: 20000,
        citations: { enabled: true },
      });
    });
  });

  // Provider-defined tools are opaque — execution is server-side, not client-side.
  // These tests verify the SDK interface contract so breaking changes from
  // @ai-sdk/anthropic upgrades are caught.
  describe('interface contract', () => {
    it('webSearch should expose expected tool interface keys', () => {
      expect(webSearch).toHaveProperty('inputSchema');
      expect(webSearchAny).toHaveProperty('id');
      expect(webSearch).toHaveProperty('type');
      expect(webSearchAny).toHaveProperty('args');
    });

    it('webFetch should expose expected tool interface keys', () => {
      expect(webFetch).toHaveProperty('inputSchema');
      expect(webFetchAny).toHaveProperty('id');
      expect(webFetch).toHaveProperty('type');
      expect(webFetchAny).toHaveProperty('args');
    });
  });
});
