import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { SlideLayoutEnum, type SlideLayout } from '../schemas/deck-spec';

type Rule = {
  layout: SlideLayout;
  reason: string;
  test: (content: string, position: string) => boolean;
};

const rules: Rule[] = [
  {
    layout: 'title',
    reason: 'First slide defaults to title layout',
    test: (_content, position) => position === 'first',
  },
  {
    layout: 'closing',
    reason: 'Last slide defaults to closing layout',
    test: (_content, position) => position === 'last',
  },
  {
    layout: 'code',
    reason: 'Content contains code block markers',
    test: (content) => /```/.test(content),
  },
  {
    layout: 'quote',
    reason: 'Content contains a quotation',
    test: (content) => /^[""\u201C]/.test(content.trim()) || /["\u201D]\s*[-\u2014]\s*\w/.test(content),
  },
  {
    layout: 'diagram',
    reason: 'Content references a diagram or visual flow',
    test: (content) => /\b(flowchart|diagram|architecture|data flow|sequence diagram|state machine)\b/i.test(content),
  },
  {
    layout: 'image',
    reason: 'Content references an image or photo',
    test: (content) => /\b(photo|image|screenshot|full-screen|full[-\s]bleed)\b/i.test(content),
  },
  {
    layout: 'comparison',
    reason: 'Content compares or contrasts items',
    test: (content) => /\b(vs\.?|versus|comparison|compare|compared to|on the other hand)\b/i.test(content),
  },
  {
    layout: 'split',
    reason: 'Content has two distinct sections suited for side-by-side layout',
    test: (content) => /\b(on one hand|alternatively|left.*right|before.*after|pros.*cons)\b/i.test(content),
  },
];

export const suggestLayout = createTool({
  id: 'suggest-layout',
  description: 'Suggest a slide layout based on content and position. Returns a recommended layout from the available templates.',
  inputSchema: z.object({
    content: z.string().min(1).describe('The slide content text'),
    slidePosition: z.enum(['first', 'middle', 'last']).describe('Position of the slide in the deck'),
  }),
  outputSchema: z.object({
    layout: SlideLayoutEnum.describe('Recommended layout type'),
    reason: z.string().min(1).describe('Why this layout was suggested'),
  }),
  execute: async ({ content, slidePosition }) => {
    for (const rule of rules) {
      if (rule.test(content, slidePosition)) {
        return { layout: rule.layout, reason: rule.reason };
      }
    }
    return { layout: 'content' as const, reason: 'Default layout for general content' };
  },
});
