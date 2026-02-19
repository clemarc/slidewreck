# CLI Option Types

TypeScript type definitions for CLI command options and scorer templates.

## Capabilities

### Component Type

Available Mastra components for project initialization via `create` and `init` commands.

```typescript { .api }
/**
 * Mastra components that can be initialized in a project
 * Used with: mastra create --components <components>
 * Used with: mastra init --components <components>
 */
type Component = 'agents' | 'workflows' | 'tools' | 'scorers';
```

**Component Descriptions:**

```typescript { .api }
// 'agents' - AI agent implementations
// - Autonomous agents that can perform tasks
// - Support for multiple LLM providers
// - Built-in memory and context management
// - Tool calling capabilities

// 'workflows' - Multi-step workflow orchestration
// - Sequential and parallel execution
// - Conditional branching
// - Error handling and retries
// - State management

// 'tools' - Utility functions for agents and workflows
// - Function definitions with schemas
// - Input/output validation
// - Error handling
// - Can be called by agents or workflows

// 'scorers' - Evaluation metrics for AI outputs
// - LLM-based or code-based evaluation
// - Quality assessment
// - Performance tracking
// - Custom scoring logic
```

**Usage:**

```bash { .api }
# Initialize project with specific components
mastra create my-app --components agents,workflows,tools

# Add components to existing project
mastra init --components scorers

# Single component
mastra create my-app --components agents

# All components
mastra create my-app --components agents,workflows,tools,scorers
```

**File Structure Generated:**

```typescript { .api }
// Component: 'agents'
// Creates: <dir>/mastra/agents/
//   - index.ts           // Agent exports
//   - example-agent.ts   // Example agent (if --example)

// Component: 'workflows'
// Creates: <dir>/mastra/workflows/
//   - index.ts           // Workflow exports
//   - example-workflow.ts // Example workflow (if --example)

// Component: 'tools'
// Creates: <dir>/mastra/tools/
//   - index.ts           // Tool exports
//   - example-tool.ts    // Example tool (if --example)

// Component: 'scorers'
// Creates: <dir>/mastra/scorers/
//   - index.ts           // Scorer exports
//   - example-scorer.ts  // Example scorer (if --example)
```

**Validation:**

```typescript { .api }
// Valid:
"agents"
"workflows"
"tools"
"scorers"
"agents,workflows"
"agents,workflows,tools,scorers"

// Invalid:
"agent"           // Must be plural
"workflow"        // Must be plural
"tool"            // Must be plural
"scorer"          // Must be plural
"unknown"         // Not in allowed set
"agents, workflows" // No spaces allowed in comma-separated list
```

### LLM Provider Type

Supported LLM providers for default configuration.

```typescript { .api }
/**
 * LLM providers supported by Mastra
 * Used with: mastra create --llm <provider>
 * Used with: mastra init --llm <provider>
 */
type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
```

**Default Model Mappings:**

Each LLM provider maps to a specific default model when used in project initialization:

```typescript { .api }
type LLMProviderConfig = {
  openai: {
    model: 'openai/gpt-4o';
    envVar: 'OPENAI_API_KEY';
    keyFormat: 'sk-...';
  };
  anthropic: {
    model: 'anthropic/claude-sonnet-4-5';
    envVar: 'ANTHROPIC_API_KEY';
    keyFormat: 'sk-ant-...';
  };
  groq: {
    model: 'groq/llama-3.3-70b-versatile';
    envVar: 'GROQ_API_KEY';
    keyFormat: 'gsk_...';
  };
  google: {
    model: 'google/gemini-2.5-pro';
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY';
    keyFormat: '...'; // No specific format
  };
  cerebras: {
    model: 'cerebras/llama-3.3-70b';
    envVar: 'CEREBRAS_API_KEY';
    keyFormat: '...'; // No specific format
  };
  mistral: {
    model: 'mistral/mistral-medium-2508';
    envVar: 'MISTRAL_API_KEY';
    keyFormat: '...'; // No specific format
  };
};
```

**Provider Details:**

```typescript { .api }
// 'openai' - OpenAI GPT models
// - Default model: gpt-4o
// - API key env var: OPENAI_API_KEY
// - Key format: sk-...
// - Base URL: https://api.openai.com/v1

// 'anthropic' - Anthropic Claude models
// - Default model: claude-sonnet-4-5
// - API key env var: ANTHROPIC_API_KEY
// - Key format: sk-ant-...
// - Base URL: https://api.anthropic.com

// 'groq' - Groq cloud inference
// - Default model: llama-3.3-70b-versatile
// - API key env var: GROQ_API_KEY
// - Key format: gsk_...
// - Base URL: https://api.groq.com/openai/v1

// 'google' - Google Gemini models
// - Default model: gemini-2.5-pro
// - API key env var: GOOGLE_GENERATIVE_AI_API_KEY
// - Key format: varies
// - Base URL: https://generativelanguage.googleapis.com

// 'cerebras' - Cerebras inference
// - Default model: llama-3.3-70b
// - API key env var: CEREBRAS_API_KEY
// - Key format: varies
// - Base URL: https://api.cerebras.ai/v1

// 'mistral' - Mistral AI models
// - Default model: mistral-medium-2508
// - API key env var: MISTRAL_API_KEY
// - Key format: varies
// - Base URL: https://api.mistral.ai
```

**Usage:**

```bash { .api }
# Create project with OpenAI as default provider
mastra create my-app --llm openai --llm-api-key sk-...

# Initialize with Anthropic
mastra init --llm anthropic --llm-api-key sk-ant-...

# Use Groq
mastra create my-app --llm groq

# Use Google Gemini
mastra create my-app --llm google

# Use Cerebras
mastra init --llm cerebras

# Use Mistral
mastra create my-app --llm mistral
```

**Environment Variable Setup:**

```bash { .api }
# .env file created with API key:
# For openai:
OPENAI_API_KEY=sk-...

# For anthropic:
ANTHROPIC_API_KEY=sk-ant-...

# For groq:
GROQ_API_KEY=gsk_...

# For google:
GOOGLE_GENERATIVE_AI_API_KEY=...

# For cerebras:
CEREBRAS_API_KEY=...

# For mistral:
MISTRAL_API_KEY=...
```

**Model Configuration in Code:**

```typescript { .api }
// Generated in mastra/index.ts:
import { Mastra } from '@mastra/core';

export const mastra = new Mastra({
  llm: {
    provider: 'openai',           // Selected provider
    model: 'openai/gpt-4o',       // Default model
    apiKey: process.env.OPENAI_API_KEY // API key from .env
  }
});
```

**Validation:**

```typescript { .api }
// Valid:
"openai"
"anthropic"
"groq"
"google"
"cerebras"
"mistral"

// Invalid:
"gpt-4"          // Must use provider name, not model name
"claude"         // Must use full provider name "anthropic"
"gemini"         // Must use full provider name "google"
"OpenAI"         // Must be lowercase
```

### Editor Type

Code editors supported for MCP (Model Context Protocol) server installation.

```typescript { .api }
/**
 * Code editors with MCP support
 * Used with: mastra create --mcp <editor>
 * Used with: mastra init --mcp <editor>
 */
type Editor = 'cursor' | 'cursor-global' | 'windsurf' | 'vscode' | 'antigravity';
```

**Editor Configuration Details:**

```typescript { .api }
type EditorConfig = {
  cursor: {
    scope: 'project';
    configPath: '<project>/.cursor/config.json';
    description: 'Project-specific Cursor configuration';
  };
  'cursor-global': {
    scope: 'global';
    configPath: '~/.cursor/config.json';
    description: 'Global Cursor configuration (all projects)';
  };
  windsurf: {
    scope: 'global';
    configPath: '~/.windsurf/config.json';
    description: 'Windsurf editor configuration';
  };
  vscode: {
    scope: 'global';
    configPath: '~/.vscode/extensions/mcp-server/config.json';
    description: 'VSCode MCP extension configuration';
  };
  antigravity: {
    scope: 'global';
    configPath: '<antigravity-specific-path>';
    description: 'Antigravity editor configuration';
  };
};
```

**Editor Details:**

```typescript { .api }
// 'cursor' - Cursor editor (project-specific)
// - Config location: <project>/.cursor/config.json
// - Scope: Current project only
// - MCP server runs per-project
// - Isolated from other projects

// 'cursor-global' - Cursor editor (global)
// - Config location: ~/.cursor/config.json
// - Scope: All Cursor projects
// - MCP server available globally
// - Shared across projects

// 'windsurf' - Windsurf editor
// - Config location: ~/.windsurf/config.json
// - Scope: Global
// - Windsurf-specific MCP integration

// 'vscode' - Visual Studio Code
// - Config location: ~/.vscode/extensions/mcp-server/config.json
// - Scope: Global
// - Requires MCP extension

// 'antigravity' - Antigravity editor
// - Config location: <antigravity-specific>
// - Scope: Global
// - Antigravity-specific MCP integration
```

**Usage:**

```bash { .api }
# Configure MCP for Cursor (project-specific)
mastra create my-app --mcp cursor

# Configure MCP globally for Cursor
mastra init --mcp cursor-global

# Configure for Windsurf
mastra create my-app --mcp windsurf

# Configure for VSCode
mastra create my-app --mcp vscode

# Configure for Antigravity
mastra create my-app --mcp antigravity
```

**MCP Configuration Format:**

```typescript { .api }
// Config file structure (JSON):
{
  "mcpServers": {
    "mastra": {
      "command": "node",
      "args": [
        "<project-path>/node_modules/mastra/dist/mcp-server.js"
      ],
      "env": {
        "MASTRA_DIR": "<project-path>/src/mastra"
      }
    }
  }
}
```

**Configuration Side Effects:**

```typescript { .api }
// Project-specific (cursor):
// Creates: <project>/.cursor/config.json
// Modifies: MCP server configuration for this project only

// Global (cursor-global, windsurf, vscode, antigravity):
// Modifies: Global editor configuration
// Affects: All projects using the editor
// May merge: Existing MCP server configurations
```

**Validation:**

```typescript { .api }
// Valid:
"cursor"
"cursor-global"
"windsurf"
"vscode"
"antigravity"

// Invalid:
"Cursor"         // Must be lowercase
"vs-code"        // Must be "vscode"
"code"           // Must be "vscode"
"global"         // Must be "cursor-global"
```

### Package Manager Type

Package managers automatically detected and supported by Mastra CLI.

```typescript { .api }
/**
 * Package managers supported by Mastra
 * Automatically detected from project or lock files
 */
type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
```

**Detection Logic:**

```typescript { .api }
// Package manager detection priority:
// 1. package-lock.json → npm
// 2. pnpm-lock.yaml → pnpm
// 3. yarn.lock → yarn
// 4. bun.lockb → bun
// 5. Interactive prompt (for new projects)

// Detection function (conceptual):
function detectPackageManager(projectDir: string): PackageManager | null {
  if (exists(join(projectDir, 'package-lock.json'))) return 'npm';
  if (exists(join(projectDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (exists(join(projectDir, 'yarn.lock'))) return 'yarn';
  if (exists(join(projectDir, 'bun.lockb'))) return 'bun';
  return null; // Prompt user
}
```

**Package Manager Details:**

```typescript { .api }
type PackageManagerConfig = {
  npm: {
    lockFile: 'package-lock.json';
    installCommand: 'npm install';
    addCommand: 'npm install <package>';
    version: '>=7.0.0'; // Recommended
  };
  pnpm: {
    lockFile: 'pnpm-lock.yaml';
    installCommand: 'pnpm install';
    addCommand: 'pnpm add <package>';
    version: '>=8.0.0'; // Recommended
  };
  yarn: {
    lockFile: 'yarn.lock';
    installCommand: 'yarn install' | 'yarn'; // Both supported
    addCommand: 'yarn add <package>';
    version: '>=1.22.0'; // v1 or v3+ supported
  };
  bun: {
    lockFile: 'bun.lockb';
    installCommand: 'bun install';
    addCommand: 'bun add <package>';
    version: '>=1.0.0'; // Recommended
  };
};
```

**Command Execution:**

```bash { .api }
# Install dependencies:
# npm: npm install
# pnpm: pnpm install
# yarn: yarn install
# bun: bun install

# Add dependency:
# npm: npm install <package>
# pnpm: pnpm add <package>
# yarn: yarn add <package>
# bun: bun add <package>

# Timeout handling:
# Default timeout: 60000ms (60 seconds)
# Configurable with --timeout flag
# Applies to installation commands
```

**Usage in CLI:**

```bash { .api }
# Auto-detected from lock file
cd existing-project
mastra init # Detects npm/pnpm/yarn/bun from lock file

# Interactive selection (new project)
mastra create my-app
# Prompts: Which package manager? (npm/pnpm/yarn/bun)

# Lock file created:
# npm → package-lock.json
# pnpm → pnpm-lock.yaml
# yarn → yarn.lock
# bun → bun.lockb
```

**Performance Characteristics:**

```typescript { .api }
// Typical install times (empty cache, average project):
// npm: ~30-60 seconds
// pnpm: ~20-40 seconds (faster with store)
// yarn: ~25-50 seconds
// bun: ~10-30 seconds (fastest)

// Disk space usage:
// npm: node_modules/ (full copy per project)
// pnpm: node_modules/ (hardlinks to global store)
// yarn: node_modules/ (full copy, or PnP mode)
// bun: node_modules/ (hardlinks, efficient)

// Recommended for:
// npm: Standard, widely compatible
// pnpm: Monorepos, disk space efficiency
// yarn: Existing yarn projects, workspaces
// bun: Speed, modern tooling
```

### Scorer Category Type

Categories for AI output evaluation scorers.

```typescript { .api }
/**
 * Scorer categories for organizing evaluation metrics
 */
type Category = 'output-quality' | 'accuracy-and-reliability' | 'context-quality';
```

**Category Details:**

```typescript { .api }
// 'output-quality' - Evaluates the quality of generated outputs
// Metrics:
// - Relevance: How relevant is the output to the input?
// - Toxicity: Does the output contain harmful content?
// - Alignment: Does the output follow prompt instructions?
// - Completeness: Is the output complete and thorough?
// - Coverage: Does the output cover required topics/keywords?
// - Tone: Is the tone appropriate for the context?

// 'accuracy-and-reliability' - Evaluates correctness and consistency
// Metrics:
// - Bias: Does the output exhibit bias?
// - Faithfulness: Is the output faithful to source context?
// - Hallucination: Does the output contain fabricated information?
// - Tool Call Accuracy: Are tool calls correct and valid?
// - Noise Sensitivity: How robust is the output to noisy inputs?
// - Similarity: How similar is the output to expected output?
// - Difference: How different is the output from reference?

// 'context-quality' - Evaluates context usage and retrieval
// Metrics:
// - Precision: How precisely is context used?
// - Relevance: How relevant is retrieved context to the query?
```

**Category Assignment:**

```typescript { .api }
// Scorer to category mapping:
const scorerCategories: Record<string, Category> = {
  // Output Quality
  'answer-relevancy': 'output-quality',
  'toxicity': 'output-quality',
  'prompt-alignment': 'output-quality',
  'completeness': 'output-quality',
  'keyword-coverage': 'output-quality',
  'tone': 'output-quality',
  
  // Accuracy and Reliability
  'bias': 'accuracy-and-reliability',
  'faithfulness': 'accuracy-and-reliability',
  'hallucination': 'accuracy-and-reliability',
  'llm-tool-call-accuracy': 'accuracy-and-reliability',
  'noise-sensitivity': 'accuracy-and-reliability',
  'content-similarity': 'accuracy-and-reliability',
  'textual-difference': 'accuracy-and-reliability',
  'code-tool-call-accuracy': 'accuracy-and-reliability',
  
  // Context Quality
  'context-precision': 'context-quality',
  'context-relevance': 'context-quality',
};
```

### Scorer Template Interface

Metadata for available scorer templates (shown by `mastra scorers list`).

```typescript { .api }
/**
 * Scorer template metadata
 */
interface ScorerTemplate {
  /** 
   * Unique identifier for the scorer
   * Used with: mastra scorers add <id>
   * Must match filename without .ts extension
   */
  id: string;

  /** 
   * Human-readable name
   * Displayed in CLI output and UI
   */
  name: string;

  /** 
   * Description of what the scorer evaluates
   * Explains the scoring criteria and use case
   */
  description: string;

  /** 
   * Category of evaluation
   * Determines how the scorer is organized and grouped
   */
  category: 'output-quality' | 'accuracy-and-reliability' | 'context-quality';

  /** 
   * Template filename
   * File in scorer templates directory
   * Format: <id>.ts
   */
  filename: string;

  /** 
   * Scorer implementation type
   * - 'llm': Uses LLM to evaluate (flexible, slower, more expensive)
   * - 'code': Uses TypeScript code (deterministic, faster, cheaper)
   */
  type: 'llm' | 'code';

  /** 
   * Template content (when available)
   * Full TypeScript source code for the scorer
   * Includes imports, configuration, and implementation
   */
  content?: string;
}
```

**Example Scorer Templates:**

```typescript { .api }
// LLM-based scorer template
const answerRelevancyTemplate: ScorerTemplate = {
  id: 'answer-relevancy',
  name: 'Answer Relevancy',
  description: 'Evaluates how relevant the response is to the original query',
  category: 'output-quality',
  filename: 'answer-relevancy.ts',
  type: 'llm',
  content: `
import { Scorer } from '@mastra/core';

export const answerRelevancy = new Scorer({
  name: 'answer-relevancy',
  description: 'Evaluates how relevant the answer is to the question',
  type: 'llm',
  config: {
    prompt: \`
      Evaluate the relevance of the answer to the question.
      Score from 0 (not relevant) to 1 (highly relevant).
      
      Question: {{question}}
      Answer: {{answer}}
      
      Provide your score and reasoning.
    \`
  }
});
  `
};

// Code-based scorer template
const keywordCoverageTemplate: ScorerTemplate = {
  id: 'keyword-coverage',
  name: 'Keyword Coverage',
  description: 'Checks coverage of required keywords in output',
  category: 'output-quality',
  filename: 'keyword-coverage.ts',
  type: 'code',
  content: `
import { Scorer } from '@mastra/core';

export const keywordCoverage = new Scorer({
  name: 'keyword-coverage',
  description: 'Checks presence of required keywords',
  type: 'code',
  evaluate: async (input, output, context) => {
    const keywords = context.requiredKeywords || [];
    const outputLower = output.toLowerCase();
    
    const covered = keywords.filter(k => 
      outputLower.includes(k.toLowerCase())
    );
    
    const score = keywords.length > 0 
      ? covered.length / keywords.length 
      : 1;
    
    return {
      score,
      passed: score >= 0.8,
      details: {
        total: keywords.length,
        covered: covered.length,
        missing: keywords.filter(k => !covered.includes(k))
      }
    };
  }
});
  `
};
```

**Example Output from `mastra scorers list`:**

```typescript { .api }
// Console output structure:
interface ScorerListOutput {
  categories: {
    'Output Quality': ScorerTemplate[];
    'Accuracy and Reliability': ScorerTemplate[];
    'Context Quality': ScorerTemplate[];
  };
  total: number;
}

// Formatted output:
/*
Output Quality Scorers (6):
  • answer-relevancy: Evaluates how relevant the response is to the original query (LLM-based)
  • faithfulness: Checks if response is grounded in provided context (LLM-based)
  • toxicity: Detects toxic or harmful content in responses (LLM-based)
  • prompt-alignment: Evaluates alignment with prompt instructions (LLM-based)
  • completeness: Evaluates response completeness (Code-based)
  • keyword-coverage: Checks presence of required keywords (Code-based)

Accuracy and Reliability Scorers (8):
  • bias: Detects potential bias in generated responses (LLM-based)
  • hallucination: Detects hallucinated information not in context (LLM-based)
  • llm-tool-call-accuracy: Validates correctness of LLM tool calls (LLM-based)
  • noise-sensitivity: Measures robustness against noisy inputs (LLM-based)
  • content-similarity: Measures semantic similarity (Code-based)
  • textual-difference: Computes text difference metrics (Code-based)
  • code-tool-call-accuracy: Validates tool calls programmatically (Code-based)

Context Quality Scorers (2):
  • context-precision: Measures how precisely context is used in responses (LLM-based)
  • context-relevance: Evaluates relevance of retrieved context to the query (LLM-based)

Total: 16 scorers available
*/
```

**Usage:**

```bash { .api }
# List all scorer templates
mastra scorers list

# Add a specific scorer by ID
mastra scorers add answer-relevancy
mastra scorers add keyword-coverage

# Add scorer interactively (shows template list)
mastra scorers add
```

**Scorer Return Type:**

```typescript { .api }
// Scorer evaluation result
interface ScorerResult {
  /** 
   * Numeric score (typically 0-1)
   * 0 = worst, 1 = best
   * Can be any range depending on scorer
   */
  score: number;

  /** 
   * Boolean pass/fail indicator
   * Based on configured threshold
   * Optional: defaults to score >= 0.5
   */
  passed: boolean;

  /** 
   * Additional details about the evaluation
   * Scorer-specific structured data
   * Used for debugging and analysis
   */
  details?: Record<string, any>;

  /** 
   * Human-readable reasoning (LLM scorers)
   * Explanation of the score
   * Optional for code-based scorers
   */
  reasoning?: string;
}
```

## Complete Type Definitions

```typescript { .api }
// All types exported from CLI
export type Component = 'agents' | 'workflows' | 'tools' | 'scorers';
export type LLMProvider = 'openai' | 'anthropic' | 'groq' | 'google' | 'cerebras' | 'mistral';
export type Editor = 'cursor' | 'cursor-global' | 'windsurf' | 'vscode' | 'antigravity';
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';
export type Category = 'output-quality' | 'accuracy-and-reliability' | 'context-quality';

export interface ScorerTemplate {
  id: string;
  name: string;
  description: string;
  category: Category;
  filename: string;
  type: 'llm' | 'code';
  content?: string;
}

export interface ScorerResult {
  score: number;
  passed: boolean;
  details?: Record<string, any>;
  reasoning?: string;
}

// Component validation
export function isValidComponent(value: string): value is Component {
  return ['agents', 'workflows', 'tools', 'scorers'].includes(value);
}

// LLM provider validation
export function isValidLLMProvider(value: string): value is LLMProvider {
  return ['openai', 'anthropic', 'groq', 'google', 'cerebras', 'mistral'].includes(value);
}

// Editor validation
export function isValidEditor(value: string): value is Editor {
  return ['cursor', 'cursor-global', 'windsurf', 'vscode', 'antigravity'].includes(value);
}

// Package manager validation
export function isValidPackageManager(value: string): value is PackageManager {
  return ['npm', 'pnpm', 'yarn', 'bun'].includes(value);
}
```
