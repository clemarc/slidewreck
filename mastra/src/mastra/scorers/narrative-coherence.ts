import { createScorer } from '@mastra/core/evals';
import { HAIKU_MODEL } from '../config/models';

export const narrativeCoherenceScorer = createScorer({
  id: 'narrative-coherence',
  description:
    'Evaluates the logical flow, transitions, and thematic consistency of a conference talk script on a 1-5 scale',
  judge: {
    model: HAIKU_MODEL,
    instructions: `You are an expert conference talk evaluator specializing in narrative structure and flow.
You evaluate how well a talk's sections connect, transition, and build toward a coherent message.

Scoring rubric:
- Score 1: Disconnected — sections don't relate, random topic jumping
- Score 2: Weak connections — loose thematic thread, abrupt transitions
- Score 3: Adequate — logical order, basic transitions
- Score 4: Strong — clear narrative arc, smooth transitions, recurring themes
- Score 5: Exceptional — compelling story arc, each section builds on prior, seamless flow

Always return a single integer from 1 to 5.`,
  },
})
  .generateScore({
    description: 'Score the narrative coherence from 1 to 5',
    createPrompt: ({ run }) =>
      `Evaluate the narrative coherence of this conference talk script. Consider:
- Logical flow between sections
- Quality of transitions
- Thematic consistency
- Whether each section builds on the previous one

Script:
${run.output}

Rate the narrative coherence on a scale of 1-5 using the rubric from your instructions.
Return ONLY a single integer (1, 2, 3, 4, or 5).`,
  })
  .generateReason({
    description: 'Explain the score and provide improvement suggestions',
    createPrompt: ({ run, score }) =>
      `You scored this talk's narrative coherence ${score}/5.

Script:
${run.output}

Start your response with the rating label in brackets matching the score:
[1] Disconnected, [2] Weak Connections, [3] Adequate, [4] Strong, [5] Exceptional

Then provide a brief explanation of why you gave this score and 1-2 specific, actionable suggestions for improving the flow and transitions. Keep it concise (2-3 sentences).`,
  });
