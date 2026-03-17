import { Marp } from '@marp-team/marp-core';
import puppeteer from 'puppeteer';

/**
 * Render Marp markdown to a PDF buffer using Puppeteer.
 * @param markdown - Marp-flavoured markdown string (with frontmatter)
 * @param themeCSS - Optional custom theme CSS (must contain `@theme name` comment)
 * @returns PDF as Uint8Array
 */
export async function renderPdf(markdown: string, themeCSS?: string): Promise<Uint8Array> {
  if (!markdown.trim()) {
    throw new Error('Cannot render PDF from empty markdown');
  }

  const marp = new Marp({ html: true });

  if (themeCSS) {
    marp.themeSet.add(themeCSS);
  }

  const { html, css } = marp.render(markdown);

  const fullHtml = `<!DOCTYPE html>
<html><head><style>${css}</style></head>
<body>${html}</body></html>`;

  const browser = await puppeteer.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      width: '1280px',
      height: '720px',
      printBackground: true,
      landscape: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
