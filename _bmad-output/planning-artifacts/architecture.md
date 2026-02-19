---
workflowType: architecture
sourceDocument: PRD.md
lastEdited: '2026-02-19'
---

# TalkForge — Architecture Document

## Conference Talk Generator Pipeline — Built with Mastra

> Extracted from the PRD to maintain separation of concerns. This document covers system design details; the [PRD](./PRD.md) covers requirements and scope.

---

## 1. Agents

The system comprises 6 specialised agents. Each has a distinct system prompt, persona, tool set, and output schema.

### 1.1 The Researcher

**Role:** Discover the most compelling, current, and surprising information about the given topic.

**System prompt direction:**
- Prioritise content from the last 6 months
- Surface counterintuitive findings and production war stories over theoretical overviews
- Identify existing talks on the same topic (to differentiate, not duplicate)
- Extract concrete numbers, benchmarks, and quotable soundbites
- Flag contrarian angles and hot takes worth exploring

**Tools:**
- `webSearch` — Mastra-integrated web search for articles, blog posts, papers
- `fetchPage` — Deep-read a specific URL to extract full content
- `findExistingTalks` — Search YouTube / conference sites for prior art on the topic
- `extractStats` — Pull structured data (numbers, benchmarks, comparisons) from text

**Output schema:**
```typescript
interface ResearchBrief {
  topic: string;
  summary: string;
  keyThemes: { theme: string; evidence: string; noveltyScore: 1 | 2 | 3 | 4 | 5 }[];
  stats: { stat: string; source: string; recency: string }[];
  existingTalks: { title: string; speaker: string; url: string; keyTakeaway: string }[];
  suggestedAngles: { angle: string; whyCompelling: string }[];
  contrarian: { claim: string; evidence: string }[];
}
```

### 1.2 The Architect

**Role:** Design the narrative structure of the talk. Offer 3 structural options, each with timing estimates.

**System prompt direction:**
- Great talks have rhythm — tension and release, setup and payoff
- Always include a hook in the first 60 seconds (never "In this talk I will...")
- Understand the difference between a 10-minute lightning talk and a 45-minute keynote
- Account for live demo slots and audience interaction moments

**Available structures to propose:**
1. **Problem → Solution → Demo** — The classic technical talk
2. **Story Arc** — Character, conflict, rising action, climax, resolution
3. **Hot Take** — Controversial claim → evidence → nuanced reversal
4. **Live Build** — Build something from scratch, teaching as you go
5. **Compare & Contrast** — Old way vs new way, with live proof

**Tools:**
- `estimateTiming` — Given a section outline, estimate minutes based on word count and demo slots

**Output schema:**
```typescript
interface TalkStructure {
  name: string;
  description: string;
  estimatedDuration: number; // minutes
  sections: {
    title: string;
    purpose: string;
    estimatedMinutes: number;
    contentType: "narrative" | "technical" | "demo" | "interaction" | "transition";
    keyPoints: string[];
  }[];
  hook: string; // the opening 60 seconds concept
}
```

### 1.3 The Writer

**Role:** Write the full speaker script — what the speaker will actually say, not slide content.

**System prompt direction:**
- Write like a human speaks: short sentences, conversational, direct
- Never use filler phrases like "So, in this talk..."
- Insert markers: `[PAUSE]`, `[CLICK]`, `[ASK AUDIENCE]`, `[DEMO START]`, `[DEMO END]`
- Estimate seconds per section in margins
- Start with a story, anecdote, or provocative question — never a self-introduction

**Dynamic prompt augmentation:** The Writer's system prompt is augmented at runtime with style preferences retrieved from memory (see Section 5: Memory System).

**Tools:**
- `wordCountToTime` — Convert word count to speaking time at 150 wpm
- `checkJargon` — Flag unexplained technical terms for the given audience level

**Output schema:**
```typescript
interface SpeakerScript {
  totalEstimatedMinutes: number;
  totalWordCount: number;
  sections: {
    title: string;
    speakerNotes: string; // the actual spoken words with markers
    estimatedSeconds: number;
    slideReference: string; // which slide this corresponds to
  }[];
  first60Seconds: string; // extracted for eval
}
```

### 1.4 The Designer

**Role:** Generate slide-by-slide specifications and visual assets. Does NOT produce final slides — provides structured specs that a rendering tool converts.

**System prompt direction (opinionated slide rules):**
- Max 6 words on a title slide
- No bullet points ever — use visuals, diagrams, or single statements
- One idea per slide
- Code slides: max 15 lines, highlight the key line with a comment or colour
- Use Mermaid for any architecture or flow diagrams
- Every 5th slide should be a "breathing" slide (full-bleed image, or a single quote)
- Suggest dark theme for code-heavy talks, light for business/strategy talks

**Tools:**
- `generateMermaid` — Create Mermaid diagram syntax from a description
- `suggestLayout` — Return a layout template name from a predefined set
- `generateColourPalette` — Create a palette from topic mood and audience

**Output schema:**
```typescript
interface SlideSpec {
  slideNumber: number;
  layout: "title" | "statement" | "diagram" | "code" | "image" | "quote" | "section-break" | "comparison" | "blank";
  content: {
    heading?: string;
    body?: string;
    code?: { language: string; snippet: string; highlightLine?: number };
    mermaid?: string;
    imagePrompt?: string; // for AI image generation
    quote?: { text: string; attribution: string };
  };
  speakerNoteRef: string;
  designNotes: string; // colour, font, animation suggestions
}

interface DeckSpec {
  title: string;
  theme: "dark" | "light";
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  font: { heading: string; body: string; code: string };
  slides: SlideSpec[];
  diagrams: { id: string; mermaid: string }[];
}
```

### 1.5 The Coach

**Role:** Review the complete talk and produce a speaker prep package.

**System prompt direction:**
- Think about what the audience will remember the next day — if the answer is "nothing specific", the hook needs sharpening
- Anticipate tough questions, especially snarky or contrarian ones
- Prepare "Plan B" content for when demos fail
- Write promotional copy that would make someone click on the talk in a conference schedule

**Tools:**
- `queryPastTalks` — RAG query over previous talk data to check for content overlap

**Output schema:**
```typescript
interface PrepPackage {
  abstract: string; // 1-paragraph conference program copy
  anticipatedQA: { question: string; suggestedAnswer: string; difficulty: "easy" | "medium" | "hard" }[];
  timingCheatSheet: { section: string; targetTime: string; flexNotes: string }[];
  demoFailurePlan: { demoSection: string; fallbackScript: string }[];
  socialMedia: { platform: "twitter" | "linkedin" | "mastodon"; copy: string }[];
  overallAssessment: string;
}
```

### 1.6 The Style Learner (Internal Agent)

**Role:** Analyse diffs between AI-generated content and human-edited content to extract style preferences. Not user-facing.

**System prompt direction:**
- Be specific: "replaced formal transitions with casual ones" not "made it more casual"
- Extract patterns across vocabulary, sentence structure, section ordering, tone, and formatting
- Flag when a preference contradicts a previously stored one

**Output schema:**
```typescript
interface StyleInsight {
  category: "vocabulary" | "tone" | "structure" | "pacing" | "formatting" | "audience-calibration";
  observation: string;
  confidence: "high" | "medium" | "low";
  examples: { original: string; revised: string }[];
}
```

---

## 2. Workflow Pipeline

The pipeline is a Mastra workflow with sequential steps, parallel branches, conditional logic, and suspend/resume gates.

```
INPUT: { topic, audience, format, constraints?, referenceMaterial? }

Step 1: research           [Researcher agent, parallel tool calls]
Step 2: review-research    [SUSPEND — human gate]
Step 3: structure          [Architect agent, produces 3 options]
Step 4: review-structure   [SUSPEND — human gate, user picks/mixes]
Step 5: script             [Writer agent, memory-augmented prompt]
Step 6: review-script      [SUSPEND — human gate, diff captured for style learning]
Step 7: design             [Designer agent, produces DeckSpec JSON]
Step 8: build-assets       [Parallel: slide render + Mermaid render + image gen]
Step 9: review-slides      [SUSPEND — human gate]
Step 10: coaching          [Coach agent, produces PrepPackage]
Step 11: run-evals         [Automated eval suite]
Step 12: persist           [Save eval results + style insights to memory]

OUTPUT: { slides, speakerNotes.md, prepPackage.md, evalScorecard }
```

**Parallel execution in Step 8:**
- Slide rendering from DeckSpec (tool, format TBD)
- Mermaid diagrams rendered to SVG (tool)
- AI-generated images for image slides (tool, optional)

**Conditional logic:**
- If `format === "lightning"`, skip the Coach's demo failure plans
- If reference material is provided, run RAG indexing before Step 1
- If the user rejects a structure in Step 4, loop back to Step 3 with feedback

**Suspend/resume:**
- Each human gate suspends the workflow
- On resume, the workflow receives the user's feedback/edits as input to the next step
- At script review (Step 6), the diff between original and edited script is passed to the Style Learner agent before proceeding

---

## 3. Tools

| Tool Name | Type | Description |
|-----------|------|-------------|
| `webSearch` | Mastra built-in | Search the web for articles, papers, blog posts |
| `fetchPage` | Mastra built-in | Fetch and extract content from a specific URL |
| `findExistingTalks` | Custom | Search YouTube/conference sites for talks on the topic |
| `extractStats` | Custom | Parse text for numbers, benchmarks, and structured data |
| `estimateTiming` | Custom | Convert section outlines to minute estimates |
| `wordCountToTime` | Custom | Convert word count to speaking duration at configurable WPM |
| `checkJargon` | Custom | Flag unexplained technical terms for a given audience level |
| `generateMermaid` | Custom | Generate Mermaid diagram syntax from natural language |
| `suggestLayout` | Custom | Map slide content type to a layout template |
| `generateColourPalette` | Custom | Create a 5-colour palette from topic and mood |
| `buildSlides` | Custom | Generate slides from DeckSpec JSON (format TBD) |
| `renderMermaid` | Custom | Render Mermaid syntax to SVG |
| `queryPastTalks` | Custom (RAG) | Vector search over previous talk content |

---

## 4. RAG Strategy

### 4.1 Knowledge Bases

**Ruleset KB — "Talk Best Practices"**
- Curated collection of articles on conference talk design, storytelling, slide design principles
- Sources: speaking coaches, popular "how to give a tech talk" posts, presentation design books
- Indexed at project setup, updated manually
- Used by: The Architect (structural patterns) and The Coach (assessment criteria)

**Session History KB — "Past Talks"**
- Every completed talk pipeline stores its final script, slide specs, and eval results
- Chunked by section for granular retrieval
- Used by: The Coach (avoid repetition, reference past work), The Style Learner (pattern recognition)

**User Reference Material KB — "Source Docs"**
- Optional: user uploads blog posts, documentation, code repos as reference for a specific talk
- Indexed per-session, not persisted across sessions unless explicitly saved
- Used by: The Researcher (incorporate user-provided context)

### 4.2 Embedding & Retrieval

- Use Mastra's built-in RAG with a vector store (Postgres with pgvector or Pinecone)
- Chunk strategy: paragraph-level for articles, section-level for scripts
- Metadata tags: `source`, `date`, `talkId`, `category`
- Retrieval: top-k similarity search with metadata filtering

---

## 5. Memory System

### 5.1 What Gets Persisted

| Memory Key Pattern | Content | Written By | Read By |
|-------------------|---------|------------|---------|
| `style:{category}:{id}` | Style insight from edit diffs | Style Learner | Writer, Designer |
| `talk:{talkId}:meta` | Topic, date, audience, format, eval scores | Pipeline | Coach, Researcher |
| `talk:{talkId}:script` | Final approved script | Pipeline | Coach (RAG) |
| `talk:{talkId}:edits` | Edit count per gate, diff summaries | Pipeline | Evals |
| `preferences:slide-theme` | Preferred theme, palette, fonts | Style Learner | Designer |
| `preferences:timing` | Pacing tendencies (e.g. "runs 5min over") | Style Learner | Writer, Coach |
| `eval:{talkId}:scores` | Full eval scorecard | Eval suite | Dashboard |

### 5.2 Style Learning Loop

```
1. Writer generates script using base prompt + memory-retrieved style preferences
2. Human edits script at gate
3. Diff computed between generated and edited versions
4. Style Learner agent analyses diff → produces StyleInsight[]
5. Insights persisted to memory with category tags
6. Next run: Writer's prompt is augmented with top-k relevant style insights
7. Eval tracks whether edit count decreases over time
```

### 5.3 Dynamic Prompt Augmentation

At runtime, the Writer agent's system prompt is constructed dynamically:

```
Base system prompt (static)
+
"LEARNED STYLE PREFERENCES:"
+ memory.query({ tags: ["style"], limit: 15 })
+
"PREVIOUS TALKS BY THIS SPEAKER:"
+ memory.query({ prefix: "talk:", fields: ["topic", "date"] })
+
"KNOWN PACING TENDENCIES:"
+ memory.query({ key: "preferences:timing" })
```

The Designer agent similarly retrieves slide aesthetic preferences.

---

## 6. Eval Suite

### 6.1 Per-Stage Evals (Automated, run at Step 11)

| Eval Name | Stage | Method | What It Measures |
|-----------|-------|--------|------------------|
| `research-breadth` | Research | LLM-as-judge | Diversity of sources and perspectives (1-5) |
| `research-recency` | Research | Heuristic | Average age of sources in days |
| `hook-strength` | Script | LLM-as-judge | "Would a bored attendee put their phone down?" (1-5) |
| `pacing-distribution` | Script | Heuristic | Variance in section duration vs. targets |
| `jargon-density` | Script | LLM-as-judge | Unexplained technical terms for audience level (1-5) |
| `narrative-coherence` | Script | LLM-as-judge | Clear throughline, ending connects to opening (1-5) |
| `slide-word-count` | Slides | Heuristic | Number of slides exceeding 20 words (lower is better) |
| `slide-variety` | Slides | Heuristic | Distribution of slide layout types (penalise monotony) |
| `diagram-clarity` | Slides | LLM-as-judge | Are Mermaid diagrams readable and useful? (1-5) |
| `qa-coverage` | Coaching | LLM-as-judge | Do anticipated Q&As cover likely audience concerns? (1-5) |

### 6.2 Meta-Evals (Memory & Learning Quality)

| Eval Name | Method | What It Measures |
|-----------|--------|------------------|
| `style-convergence` | Trend analysis | Are human edit counts decreasing across sessions? |
| `memory-relevance` | LLM-as-judge | Were retrieved memories actually reflected in the output? |
| `memory-consistency` | LLM-as-judge | Do stored style preferences contradict each other? |
| `memory-staleness` | Heuristic | Are any stored preferences older than N sessions without reconfirmation? |

### 6.3 Eval Output

```typescript
interface EvalScorecard {
  talkId: string;
  timestamp: string;
  stageScores: Record<string, { score: number; max: 5; details: string }>;
  metaScores: Record<string, { score: number; max: 5; details: string }>;
  overallScore: number;
  trendVsPrevious: "improving" | "stable" | "declining";
  recommendations: string[];
}
```
