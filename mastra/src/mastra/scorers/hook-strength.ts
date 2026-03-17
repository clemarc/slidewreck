import { createScorer } from '@mastra/core/evals';
import { HAIKU_MODEL } from '../config/models';

export const hookStrengthScorer = createScorer({
  id: 'hook-strength',
  description:
    'Evaluates the opening hook of a conference talk script on a 1-5 scale for audience engagement potential',
  judge: {
    model: HAIKU_MODEL,
    instructions: `You are an expert conference talk evaluator specializing in audience engagement.
You evaluate opening hooks — the first 1-3 sentences of a talk that are designed to capture attention.

Scoring rubric:
- Score 1: No discernible hook — launches straight into content
- Score 2: Weak hook — generic question or statement
- Score 3: Adequate hook — relevant but predictable
- Score 4: Strong hook — compelling, audience-specific
- Score 5: Exceptional hook — provocative, memorable, creates anticipation

Always return a single integer from 1 to 5.`,
  },
})
  .generateScore({
    description: 'Score the opening hook strength from 1 to 5',
    createPrompt: ({ run }) =>
      `Evaluate the opening hook of this conference talk script. Focus on the first few sentences.

Script:
${run.output}

Rate the hook strength on a scale of 1-5 using the rubric from your instructions.
Return ONLY a single integer (1, 2, 3, 4, or 5).`,
  })
  .generateReason({
    description: 'Explain the score and provide improvement suggestions',
    createPrompt: ({ run, score }) =>
      `You scored this talk's opening hook ${score}/5.

Script:
${run.output}

Start your response with the rating label in brackets matching the score:
[1] No Hook, [2] Weak, [3] Adequate, [4] Strong, [5] Exceptional

Then provide a brief explanation of why you gave this score and 1-2 specific, actionable suggestions for improvement. Keep it concise (2-3 sentences).`,
  });
