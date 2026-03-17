import { describe, it, expect } from 'vitest';
import { GateSuspendSchema, GateResumeSchema, GATE_DECISIONS } from '../gate-payloads';

describe('GateSuspendSchema', () => {
  it('should accept a valid suspend payload', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      gateId: 'review-research',
      output: { keyFindings: [], sources: [] },
      summary: 'Research brief ready for review',
    });
    expect(result.success).toBe(true);
  });

  it('should accept output of any shape', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'script-writer',
      gateId: 'review-script',
      output: 'string output is also valid',
      summary: 'Script ready for review',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing agentId', () => {
    const result = GateSuspendSchema.safeParse({
      gateId: 'review-research',
      output: {},
      summary: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing gateId', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      output: {},
      summary: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing summary', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      gateId: 'review-research',
      output: {},
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty agentId', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: '',
      gateId: 'review-research',
      output: {},
      summary: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty gateId', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      gateId: '',
      output: {},
      summary: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty summary', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      gateId: 'review-research',
      output: {},
      summary: '',
    });
    expect(result.success).toBe(false);
  });

  it('should accept missing output (z.unknown() allows undefined)', () => {
    const result = GateSuspendSchema.safeParse({
      agentId: 'researcher',
      gateId: 'review-research',
      summary: 'Test',
    });
    expect(result.success).toBe(true);
  });
});

describe('GateResumeSchema', () => {
  it('should accept a valid resume payload with all fields', () => {
    const result = GateResumeSchema.safeParse({
      decision: 'approve',
      feedback: 'Focus more on resilience patterns',
      edits: { modified: 'content' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept resume with only decision (feedback and edits optional)', () => {
    const result = GateResumeSchema.safeParse({
      decision: 'reject',
    });
    expect(result.success).toBe(true);
  });

  it('should accept resume with decision and feedback only', () => {
    const result = GateResumeSchema.safeParse({
      decision: 'approve',
      feedback: 'Looks good, proceed',
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing decision field', () => {
    const result = GateResumeSchema.safeParse({
      feedback: 'Some feedback',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid decision value', () => {
    const result = GateResumeSchema.safeParse({
      decision: 'maybe',
    });
    expect(result.success).toBe(false);
  });

  it('should have exactly approve and reject as decision values', () => {
    expect(GATE_DECISIONS).toEqual(['approve', 'reject']);
    // Verify schema accepts both and rejects anything else
    for (const val of GATE_DECISIONS) {
      expect(GateResumeSchema.safeParse({ decision: val }).success).toBe(true);
    }
    expect(GateResumeSchema.safeParse({ decision: 'other' }).success).toBe(false);
  });
});
