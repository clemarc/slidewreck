import { describe, it, expect } from 'vitest';
import { renderPdf } from '../lib/render-pdf';

const simpleMarp = `---
marp: true
---

## Hello World

This is a test slide.
`;

describe('renderPdf', () => {
  it('returns a PDF buffer from valid Marp markdown', async () => {
    const pdf = await renderPdf(simpleMarp);
    expect(pdf).toBeInstanceOf(Uint8Array);
    expect(pdf.length).toBeGreaterThan(100);
    // PDF magic bytes: %PDF-
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe('%PDF-');
  }, 30_000);

  it('produces a valid PDF with custom theme CSS', async () => {
    const themeCSS = `
/* @theme test-theme */
@import 'default';
section { background-color: #f0f0f0; }
`;
    const markdown = `---
marp: true
theme: test-theme
---

## Themed Slide

Content here.
`;
    const pdf = await renderPdf(markdown, themeCSS);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe('%PDF-');
  }, 30_000);

  it('throws on empty markdown', async () => {
    await expect(renderPdf('')).rejects.toThrow();
  }, 30_000);
});
