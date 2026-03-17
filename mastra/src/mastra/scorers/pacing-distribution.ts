import { createScorer } from '@mastra/core/evals';

const WORDS_PER_MINUTE = 140;

interface Section {
  name: string;
  text: string;
  wordCount: number;
}

/**
 * Parse a script into sections by markdown headers (## or ###).
 * Falls back to paragraph splitting if no headers are found.
 * Returns empty array for empty/whitespace-only input.
 */
export function parseSections(script: string): Section[] {
  const trimmed = script.trim();
  if (!trimmed) return [];

  // Try splitting by markdown headers (## or ###)
  const headerPattern = /^(#{2,3})\s+(.+)$/gm;
  const headers: Array<{ index: number; name: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = headerPattern.exec(trimmed)) !== null) {
    headers.push({ index: match.index, name: match[2].trim() });
  }

  if (headers.length > 0) {
    return headers.map((header, i) => {
      const start = header.index;
      const end = i < headers.length - 1 ? headers[i + 1].index : trimmed.length;
      const fullBlock = trimmed.slice(start, end);
      // Remove the header line itself to get body text
      const text = fullBlock.replace(/^#{2,3}\s+.+\n?/, '').trim();
      const wordCount = countWords(text);
      return { name: header.name, text, wordCount };
    });
  }

  // Fallback: split by double-newline paragraphs
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((text, i) => ({
    name: `Section ${i + 1}`,
    text,
    wordCount: countWords(text),
  }));
}

function countWords(text: string): number {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return words.length;
}

/**
 * Calculate a 1-5 pacing score based on the coefficient of variation (CV)
 * of section word counts.
 *
 * - Score 5: CV < 0.20 (excellent balance)
 * - Score 4: CV 0.20-0.40 (well-balanced)
 * - Score 3: CV 0.40-0.70 (moderate variation)
 * - Score 2: CV 0.70-1.00 (significant imbalance)
 * - Score 1: CV > 1.00 (extremely unbalanced)
 *
 * Special cases: empty → 1, single section → 3
 */
export function calculatePacingScore(sections: Array<{ wordCount: number }>): number {
  if (sections.length === 0) return 1;
  if (sections.length === 1) return 3;

  const wordCounts = sections.map((s) => s.wordCount);
  const mean = wordCounts.reduce((sum, wc) => sum + wc, 0) / wordCounts.length;

  if (mean === 0) return 1;

  const variance = wordCounts.reduce((sum, wc) => sum + (wc - mean) ** 2, 0) / wordCounts.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / mean;

  if (cv < 0.2) return 5;
  if (cv < 0.4) return 4;
  if (cv < 0.7) return 3;
  if (cv < 1.0) return 2;
  return 1;
}

export const pacingDistributionScorer = createScorer({
  id: 'pacing-distribution',
  description:
    'Evaluates pacing balance across sections of a conference talk using heuristic word-count analysis on a 1-5 scale',
})
  .preprocess(({ run }) => {
    const script = String(run.output);
    const sections = parseSections(script);
    const totalWords = sections.reduce((sum, s) => sum + s.wordCount, 0);
    const totalMinutes = totalWords / WORDS_PER_MINUTE;
    const avgWordsPerSection = sections.length > 0 ? totalWords / sections.length : 0;

    return {
      sections: sections.map((s) => ({
        name: s.name,
        wordCount: s.wordCount,
        estimatedMinutes: Math.round((s.wordCount / WORDS_PER_MINUTE) * 10) / 10,
      })),
      totalWords,
      totalMinutes: Math.round(totalMinutes * 10) / 10,
      avgWordsPerSection: Math.round(avgWordsPerSection),
      sectionCount: sections.length,
    };
  })
  .generateScore(({ results }) => {
    const { sections } = results.preprocessStepResult;
    return calculatePacingScore(sections);
  })
  .generateReason(({ results, score }) => {
    const { sections, totalWords, totalMinutes, avgWordsPerSection } = results.preprocessStepResult;

    if (sections.length === 0) {
      return '[1] Empty — No content to evaluate pacing.';
    }

    if (sections.length === 1) {
      return `[3] Single Section — Only one section detected (${totalWords} words, ~${totalMinutes} min). Add section headers (## ) to enable pacing analysis.`;
    }

    const labels: Record<number, string> = {
      1: 'Extremely Unbalanced',
      2: 'Significant Imbalance',
      3: 'Moderate Variation',
      4: 'Well-Balanced',
      5: 'Excellent Balance',
    };

    const flags: string[] = [];
    const breakdown = sections.map(
      (s: { name: string; wordCount: number; estimatedMinutes: number }) => {
        let flag = '';
        if (s.wordCount > avgWordsPerSection * 2) {
          flag = ' [TOO LONG]';
          flags.push(`"${s.name}" is over 2x average length`);
        } else if (s.wordCount < avgWordsPerSection * 0.5) {
          flag = ' [TOO SHORT]';
          flags.push(`"${s.name}" is under half the average length`);
        }
        return `  - ${s.name}: ${s.wordCount} words (~${s.estimatedMinutes} min)${flag}`;
      },
    );

    let reason = `[${score}] ${labels[score]} — ${sections.length} sections, ${totalWords} total words (~${totalMinutes} min)\n`;
    reason += breakdown.join('\n');

    if (flags.length > 0) {
      reason += `\nFlags: ${flags.join('; ')}`;
    }

    return reason;
  });
