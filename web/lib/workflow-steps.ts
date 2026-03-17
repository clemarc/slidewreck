/**
 * Hardcoded step metadata for the slidewreck workflow.
 * Order verified from serializedStepGraph (spike 2026-03-17).
 * Internal steps (mapping, init-rag, index-references) are excluded — only user-facing stages.
 */

export interface StepMeta {
  /** Step ID as returned by Mastra API */
  id: string;
  /** Human-readable label for the UI */
  label: string;
  /** Whether this step can suspend for human review */
  canSuspend: boolean;
}

/**
 * Ordered list of user-visible pipeline steps.
 * Parallel steps (build-slides, render-diagrams) are listed sequentially
 * since they execute together — the UI groups them visually.
 */
export const WORKFLOW_STEPS: readonly StepMeta[] = [
  { id: 'collect-references', label: 'Collect References', canSuspend: true },
  { id: 'review-research', label: 'Research Review', canSuspend: true },
  { id: 'architect-structure', label: 'Structure Review', canSuspend: true },
  { id: 'script-writer', label: 'Write Script', canSuspend: false },
  { id: 'review-script', label: 'Script Review', canSuspend: true },
  { id: 'designer-outline', label: 'Design Outline', canSuspend: false },
  { id: 'designer-content-fill', label: 'Fill Content', canSuspend: false },
  { id: 'review-slides', label: 'Slide Review', canSuspend: true },
  { id: 'build-slides', label: 'Build Slides', canSuspend: false },
  { id: 'render-diagrams', label: 'Render Diagrams', canSuspend: false },
] as const;

/** Step IDs in order for quick lookups */
export const STEP_IDS = WORKFLOW_STEPS.map((s) => s.id);
