import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const DIAGRAM_TYPES = ['flowchart', 'sequence', 'class', 'state', 'er', 'gantt', 'pie', 'mindmap'] as const;

/** Escape Mermaid special characters in user-provided descriptions */
function escapeForMermaid(text: string): string {
  return text.replace(/[[\](){}#>|]/g, ' ').replace(/--/g, '- -').trim();
}

const DIAGRAM_TEMPLATES: Record<string, (description: string) => string> = {
  flowchart: (desc) => { const s = escapeForMermaid(desc); return `graph TD\n  A["${s}"] --> B[Process]\n  B --> C[Result]`; },
  sequence: (desc) => { const s = escapeForMermaid(desc); return `sequenceDiagram\n  participant Client\n  participant Server\n  Client->>Server: ${s}\n  Server-->>Client: Response`; },
  class: (desc) => { const s = desc.replace(/[^a-zA-Z0-9]/g, ''); return `classDiagram\n  class ${s || 'Entity'} {\n    +method()\n  }`; },
  state: (desc) => { const s = desc.replace(/[^a-zA-Z0-9_]/g, '_'); return `stateDiagram-v2\n  [*] --> ${s}\n  ${s} --> [*]`; },
  er: (desc) => { const s = escapeForMermaid(desc); return `erDiagram\n  ENTITY {\n    string name "${s}"\n  }`; },
  gantt: (desc) => { const s = escapeForMermaid(desc); return `gantt\n  title ${s}\n  section Phase 1\n  Task 1: a1, 2026-01-01, 30d`; },
  pie: (desc) => { const s = escapeForMermaid(desc); return `pie title ${s}\n  "Category A": 40\n  "Category B": 35\n  "Category C": 25`; },
  mindmap: (desc) => { const s = escapeForMermaid(desc); return `mindmap\n  root((${s}))\n    Branch A\n      Detail 1\n    Branch B\n      Detail 2`; },
};

export const generateMermaid = createTool({
  id: 'generate-mermaid',
  description: 'Generate Mermaid diagram syntax from a natural language description and diagram type. Returns valid Mermaid syntax that can be rendered to SVG.',
  inputSchema: z.object({
    description: z.string().min(1).describe('Natural language description of the diagram'),
    diagramType: z.enum(DIAGRAM_TYPES).describe('Mermaid diagram type'),
  }),
  outputSchema: z.object({
    mermaidSyntax: z.string().min(1).describe('Generated Mermaid syntax'),
  }),
  execute: async ({ description, diagramType }) => {
    const templateFn = DIAGRAM_TEMPLATES[diagramType];
    const mermaidSyntax = templateFn(description);
    return { mermaidSyntax };
  },
});
