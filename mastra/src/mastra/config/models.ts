/**
 * Tiered model mapping for Slidewreck agents.
 * Each agent role maps to a specific Claude model tier.
 */

// Model tier constants
export const OPUS_MODEL = 'anthropic/claude-opus-4-6' as const;
export const SONNET_MODEL = 'anthropic/claude-sonnet-4-5' as const;
export const HAIKU_MODEL = 'anthropic/claude-haiku-4-5' as const;

// Agent role to model mapping
export const MODEL_TIERS = {
  researcher: SONNET_MODEL,
  architect: SONNET_MODEL,
  writer: OPUS_MODEL,
  designer: SONNET_MODEL,
  coach: SONNET_MODEL,
  styleLearner: HAIKU_MODEL,
  eval: HAIKU_MODEL,
} as const;

export type AgentRole = keyof typeof MODEL_TIERS;

/**
 * Provider options to use native structured output instead of the jsonTool approach.
 * The default jsonTool mode creates a fake "json" tool which can cause models to wrap
 * output in {"$PARAMETER_NAME": {...}} when the agent also has real tools.
 */
export const ANTHROPIC_STRUCTURED_OUTPUT_OPTIONS = {
  anthropic: { structuredOutputMode: 'outputFormat' as const },
};
