import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_CONTENT_LENGTH = 100_000;

export const fetchPage = createTool({
  id: 'fetch-page',
  description: 'Fetch and extract text content from a URL',
  inputSchema: z.object({
    url: z.string().url().describe('URL to fetch content from'),
  }),
  outputSchema: z.object({
    content: z.string().describe('Extracted text content'),
    title: z.string().describe('Page title'),
    url: z.string().describe('Fetched URL'),
    contentLength: z.number().describe('Character count of extracted content'),
  }),
  execute: async (inputData) => {
    try {
      const response = await fetch(inputData.url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorContent = `Error fetching page: ${response.status} ${response.statusText}`;
        return {
          content: errorContent,
          title: '',
          url: inputData.url,
          contentLength: errorContent.length,
        };
      }

      const html = await response.text();
      const title = extractTitle(html);
      let content = stripHtml(html);

      if (content.length > MAX_CONTENT_LENGTH) {
        content = content.slice(0, MAX_CONTENT_LENGTH);
      }

      return {
        content,
        title,
        url: inputData.url,
        contentLength: content.length,
      };
    } catch (error) {
      // Network and timeout errors are unrecoverable — throw per architecture pattern
      throw error instanceof Error
        ? error
        : new Error(`Failed to fetch ${inputData.url}`);
    }
  },
});

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? match[1].trim() : '';
}

function stripHtml(html: string): string {
  // Remove script and style tags with their content
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}
