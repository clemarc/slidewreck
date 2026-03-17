import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { DeckSpecSchema } from '../schemas/deck-spec';

export const buildSlidesTool = createTool({
  id: 'build-slides',
  description: 'Build Markdown slide output from a DeckSpec. Produces frontmatter-separated slides ready for presentation rendering.',
  inputSchema: z.object({
    deckSpec: DeckSpecSchema.describe('Complete deck specification with slides'),
  }),
  outputSchema: z.object({
    markdown: z.string().min(1).describe('Markdown slide output with YAML frontmatter per slide'),
  }),
  execute: async ({ deckSpec }) => {
    const sections: string[] = [];

    // Quote strings for safe YAML frontmatter (handles colons, quotes, special chars)
    function yamlQuote(value: string): string {
      if (/[:#"'\n\\]/.test(value)) {
        return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
      }
      return value;
    }

    // Deck-level header
    sections.push(`# ${deckSpec.title}`);
    if (deckSpec.subtitle) {
      sections.push(`\n*${deckSpec.subtitle}*`);
    }

    // Each slide as a frontmatter-separated section
    for (const slide of deckSpec.slides) {
      const frontmatter: string[] = [];
      frontmatter.push(`slideNumber: ${slide.slideNumber}`);
      frontmatter.push(`layout: ${slide.layout}`);
      frontmatter.push(`title: ${yamlQuote(slide.title)}`);
      frontmatter.push(`speakerNoteRef: ${yamlQuote(slide.speakerNoteRef)}`);
      if (slide.colourAccent) {
        frontmatter.push(`colourAccent: '${slide.colourAccent}'`);
      }
      if (slide.diagram) {
        frontmatter.push(`diagramType: ${slide.diagram.type}`);
      }

      const slideMarkdown = [
        '---',
        frontmatter.join('\n'),
        '---',
        '',
        `## ${slide.title}`,
        '',
        slide.content,
      ].join('\n');

      sections.push(slideMarkdown);
    }

    return { markdown: sections.join('\n\n') };
  },
});
