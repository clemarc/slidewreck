/**
 * Extract the relevant speaker notes section for a given speakerNoteRef.
 *
 * Algorithm (from spike Q2, matching designer-content-fill.ts:77):
 * 1. Split speakerNotes on `## ` headers
 * 2. Tokenize the speakerNoteRef by splitting on `-`
 * 3. Count how many tokens appear in each header line
 * 4. Match if ≥60% of tokens match
 * 5. Fallback: return first 2000 chars if no match
 */
export function extractRelevantSection(
  speakerNotes: string,
  ref: string,
): string {
  if (!speakerNotes) return '';

  const sections = speakerNotes.split(/^## /m);
  const tokens = ref.split('-').filter(Boolean);

  if (tokens.length === 0) {
    return speakerNotes.slice(0, 2000);
  }

  let bestMatch = { score: 0, content: '' };

  for (const section of sections) {
    if (!section.trim()) continue;
    const headerLine = section.split('\n')[0].toLowerCase();
    const matchCount = tokens.filter((t) =>
      headerLine.includes(t.toLowerCase()),
    ).length;
    const score = matchCount / tokens.length;

    if (score > bestMatch.score) {
      bestMatch = { score, content: section.trim() };
    }
  }

  return bestMatch.score >= 0.6
    ? bestMatch.content
    : speakerNotes.slice(0, 2000);
}
