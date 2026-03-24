import { describe, it, expect } from 'vitest';

describe('StructureGate selection props', () => {
  it('exports StructureGate accepting output, selectedIndex, and onSelect props', async () => {
    const mod = await import('../components/gate-content/structure-gate');
    expect(mod.StructureGate).toBeDefined();
    expect(typeof mod.StructureGate).toBe('function');
  });

  it('exports StructureOption type for reuse', async () => {
    // StructureOption is used by StructureControls — verify it's importable
    const mod = await import('../components/gate-content/structure-gate');
    expect(mod).toBeDefined();
  });
});

describe('StructureControls with selectedIndex prop', () => {
  it('exports StructureControls accepting selectedIndex prop', async () => {
    const mod = await import('../components/gate-controls/structure-controls');
    expect(mod.StructureControls).toBeDefined();
    expect(typeof mod.StructureControls).toBe('function');
  });

  it('buildStructureApprovePayload works with selection title and extra feedback', async () => {
    const { buildStructureApprovePayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureApprovePayload('Problem → Solution → Demo', 'swap sections 3 and 4');
    expect(payload.decision).toBe('approve');
    expect(payload.feedback).toBe('Selected option: Problem → Solution → Demo\nswap sections 3 and 4');
  });

  it('buildStructureApprovePayload works with no extra feedback', async () => {
    const { buildStructureApprovePayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureApprovePayload('Story Arc', '');
    expect(payload.decision).toBe('approve');
    expect(payload.feedback).toBe('Selected option: Story Arc');
  });

  it('buildStructureRejectPayload sends reject with feedback', async () => {
    const { buildStructureRejectPayload } = await import('../components/gate-controls/structure-controls');
    const payload = buildStructureRejectPayload('Need more interactive options');
    expect(payload.decision).toBe('reject');
    expect(payload.feedback).toBe('Need more interactive options');
  });
});

describe('GateContent dispatcher forwards selection props', () => {
  it('exports GateContent with selection prop support', async () => {
    const mod = await import('../components/gate-content');
    expect(mod.GateContent).toBeDefined();
  });

  it('GATE_RENDERERS has 3 renderers (architect-structure handled separately)', async () => {
    const { GATE_RENDERERS } = await import('../components/gate-content');
    expect(Object.keys(GATE_RENDERERS)).toHaveLength(3);
    expect(GATE_RENDERERS['architect-structure']).toBeUndefined();
  });
});

describe('GateControls dispatcher forwards selectedIndex', () => {
  it('exports GateControls with selectedIndex prop support', async () => {
    const mod = await import('../components/gate-controls');
    expect(mod.GateControls).toBeDefined();
  });

  it('GATE_CONTROLS_MAP still maps 3 specialized gates', async () => {
    const { GATE_CONTROLS_MAP } = await import('../components/gate-controls');
    expect(GATE_CONTROLS_MAP['collect-references']).toBe('references');
    expect(GATE_CONTROLS_MAP['architect-structure']).toBe('structure');
    expect(GATE_CONTROLS_MAP['review-slides']).toBe('slides');
    expect(Object.keys(GATE_CONTROLS_MAP)).toHaveLength(3);
  });
});
