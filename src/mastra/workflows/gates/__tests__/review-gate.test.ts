import { describe, it, expect, vi } from 'vitest';
import { createReviewGateStep } from '../review-gate';
import { GateSuspendSchema, GateResumeSchema } from '../../../schemas/gate-payloads';

describe('createReviewGateStep', () => {
  const config = {
    gateId: 'review-script',
    agentId: 'script-writer',
    summary: 'Speaker script ready for review',
  };

  it('should create a step with the correct gate id', () => {
    const gate = createReviewGateStep(config);
    expect(gate.id).toBe('review-script');
  });

  it('should have GateSuspendSchema as suspendSchema', () => {
    const gate = createReviewGateStep(config);
    expect(gate.suspendSchema).toBe(GateSuspendSchema);
  });

  it('should have GateResumeSchema as resumeSchema', () => {
    const gate = createReviewGateStep(config);
    expect(gate.resumeSchema).toBe(GateResumeSchema);
  });

  it('should have GateResumeSchema as outputSchema', () => {
    const gate = createReviewGateStep(config);
    expect(gate.outputSchema).toBe(GateResumeSchema);
  });

  it('should have an execute function', () => {
    const gate = createReviewGateStep(config);
    expect(typeof gate.execute).toBe('function');
  });

  it('should create distinct steps for different gate configs', () => {
    const gate1 = createReviewGateStep(config);
    const gate2 = createReviewGateStep({
      gateId: 'review-other',
      agentId: 'other-agent',
      summary: 'Other output ready for review',
    });
    expect(gate1.id).toBe('review-script');
    expect(gate2.id).toBe('review-other');
  });

  it('should call suspend with correct payload on first execution', async () => {
    const gate = createReviewGateStep(config);
    const mockInput = { sections: [], speakerNotes: '' };
    const suspendSentinel = { decision: 'reject' as const };
    const mockSuspend = vi.fn().mockResolvedValue(suspendSentinel);

    const result = await gate.execute({
      inputData: mockInput,
      suspend: mockSuspend,
      resumeData: undefined,
    } as any);

    expect(mockSuspend).toHaveBeenCalledWith({
      agentId: 'script-writer',
      gateId: 'review-script',
      output: mockInput,
      summary: 'Speaker script ready for review',
    });
    expect(result).toBe(suspendSentinel);
  });

  it('should return resumeData when present (resume path)', async () => {
    const gate = createReviewGateStep(config);
    const resumePayload = { decision: 'approve' as const, feedback: 'Looks great' };
    const mockSuspend = vi.fn();

    const result = await gate.execute({
      inputData: { sections: [] },
      suspend: mockSuspend,
      resumeData: resumePayload,
    } as any);

    expect(mockSuspend).not.toHaveBeenCalled();
    expect(result).toBe(resumePayload);
  });
});
