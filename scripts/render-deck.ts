import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DeckSpecSchema } from '../src/mastra/schemas/deck-spec';
import { deckToMarp } from './lib/deck-to-marp';
import { renderPdf } from './lib/render-pdf';
import { generateThemeCSS } from './lib/generate-theme';

async function main() {
  const inputPath = process.argv[2];

  if (!inputPath) {
    console.error('Usage: pnpm render-deck <path-to-deck-spec.json>');
    process.exit(1);
  }

  const resolvedPath = resolve(inputPath);

  if (!existsSync(resolvedPath)) {
    console.error(`File not found: ${resolvedPath}`);
    process.exit(1);
  }

  let rawJson: string;
  try {
    rawJson = readFileSync(resolvedPath, 'utf-8');
  } catch (err) {
    console.error(`Failed to read file: ${resolvedPath}`);
    process.exit(1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    console.error(`Invalid JSON in: ${resolvedPath}`);
    process.exit(1);
  }

  const result = DeckSpecSchema.safeParse(parsed);
  if (!result.success) {
    console.error(`Invalid DeckSpec:\n${result.error.message}`);
    process.exit(1);
  }

  const deck = result.data;
  const basePath = dirname(resolvedPath);

  console.log(`Rendering: ${deck.title} (${deck.slides.length} slides)`);

  const markdown = deckToMarp(deck, { basePath });

  const themeCSS = generateThemeCSS(deck.colourPalette);

  const pdfBuffer = await renderPdf(markdown, themeCSS);

  const outputPath = resolvedPath.endsWith('.json')
    ? resolvedPath.replace(/\.json$/, '.pdf')
    : `${resolvedPath}.pdf`;
  writeFileSync(outputPath, pdfBuffer);

  console.log(`PDF written: ${outputPath} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error('Render failed:', err.message);
  process.exit(1);
});
