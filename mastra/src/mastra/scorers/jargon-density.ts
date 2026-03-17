import { createScorer } from '@mastra/core/evals';
import { HAIKU_MODEL } from '../config/models';

export const jargonDensityScorer = createScorer({
  id: 'jargon-density',
  description:
    'Evaluates jargon accessibility relative to the target audience of a conference talk on a 1-5 scale',
  judge: {
    model: HAIKU_MODEL,
    instructions: `You are an expert conference talk evaluator specializing in audience accessibility and language clarity.
You evaluate whether a talk's language is appropriate for its target audience, focusing on jargon, acronyms, and unexplained technical terms.

Scoring rubric:
- Score 1: Overwhelmingly jargon-heavy — most sentences contain unexplained technical terms, inaccessible
- Score 2: High jargon density — many terms that would confuse the target audience
- Score 3: Moderate jargon — some terms need explanation or simplification
- Score 4: Appropriate level — jargon mostly explained or audience-appropriate
- Score 5: Clean and accessible — technical terms well-managed, accessible to target audience

Always return a single integer from 1 to 5.`,
  },
})
  .generateScore({
    description: 'Score the jargon density from 1 to 5',
    createPrompt: ({ run }) => {
      const audienceContext = run.input
        ? `Target audience: ${run.input}\n\n`
        : 'Target audience: general technical audience\n\n';

      return `Evaluate the jargon density and accessibility of this conference talk script.
${audienceContext}Consider:
- Unexplained acronyms and technical terms
- Industry-specific jargon without context
- Whether terminology matches the audience level
- Balance between technical precision and accessibility

Script:
${run.output}

Rate the jargon accessibility on a scale of 1-5 using the rubric from your instructions.
Return ONLY a single integer (1, 2, 3, 4, or 5).`;
    },
  })
  .generateReason({
    description: 'Explain the score, list flagged terms, and suggest simplifications',
    createPrompt: ({ run, score }) => {
      const audienceContext = run.input
        ? `Target audience: ${run.input}\n\n`
        : 'Target audience: general technical audience\n\n';

      return `You scored this talk's jargon accessibility ${score}/5.
${audienceContext}Script:
${run.output}

Start your response with the rating label in brackets matching the score:
[1] Jargon-Heavy, [2] High Density, [3] Moderate, [4] Appropriate, [5] Clean & Accessible

Then:
1. List 3-5 specific terms or phrases that are the most problematic (or note if none are problematic)
2. For each flagged term, suggest a simpler alternative or recommend adding a brief explanation
Keep it concise (3-5 sentences total).`;
    },
  });
