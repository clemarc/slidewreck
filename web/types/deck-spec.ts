/**
 * Frontend TypeScript types for DeckSpec — re-exported from workspace package.
 * Uses the canonical Zod schemas from the mastra backend.
 */
export type {
  SlideLayout,
  ColourPalette,
  DiagramSpec,
  SlideSpec,
  DeckSpec,
} from 'slidewreck/src/mastra/schemas/deck-spec';

export { SLIDE_LAYOUTS } from 'slidewreck/src/mastra/schemas/deck-spec';

/** Shape of run.result for a successful slidewreck workflow run */
export interface SlidewreckRunResult {
  deckSpec: import('slidewreck/src/mastra/schemas/deck-spec').DeckSpec;
  speakerScript: {
    speakerNotes: string;
    sections: Array<{
      title: string;
      content: string;
      speakingNotes: string;
      durationMinutes: number;
    }>;
    timingMarkers: Array<{ time: string; label: string }>;
    totalDurationMinutes: number;
  };
  diagrams: Array<{ slideNumber: number; svg: string }>;
  slideMarkdown: string;
  researchBrief: unknown;
  scorecard: unknown;
  metadata: { runId: string; completedAt: string; input: unknown; outputDirPath: string };
}
