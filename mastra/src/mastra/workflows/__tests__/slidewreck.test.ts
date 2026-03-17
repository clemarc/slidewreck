import { describe, it, expect, vi } from 'vitest';
import { slidewreck } from '../slidewreck';
import { WorkflowInputSchema } from '../../schemas/workflow-input';
import { WorkflowOutputSchema } from '../../schemas/workflow-output';

describe('slidewreck workflow', () => {
  it('should export a workflow with id "slidewreck"', () => {
    expect(slidewreck.id).toBe('slidewreck');
  });

  it('should have WorkflowInputSchema as inputSchema', () => {
    expect(slidewreck.inputSchema).toBe(WorkflowInputSchema);
  });

  it('should have WorkflowOutputSchema as outputSchema', () => {
    expect(slidewreck.outputSchema).toBe(WorkflowOutputSchema);
  });

  it('should be committed (createRun is available)', () => {
    expect(slidewreck).toBeDefined();
    expect(typeof slidewreck.createRun).toBe('function');
  });

  it('should be registered in the Mastra instance', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');
    vi.resetModules();
    const { mastra } = await import('../../index');
    const workflow = mastra.getWorkflow('slidewreck');
    expect(workflow.id).toBe('slidewreck');
    vi.unstubAllEnvs();
  });
});
