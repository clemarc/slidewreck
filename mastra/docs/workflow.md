# Slidewreck Workflow

How the Slidewreck pipeline turns a topic into a conference talk script, step by step.

## Overview

The **slidewreck** workflow is a multi-step AI pipeline that researches a topic, designs a talk structure, writes a timed speaker script, and collects human feedback at each stage. It uses RAG (Retrieval-Augmented Generation) to ground the output in curated best practices and optional speaker-provided reference materials.

The pipeline has three human review gates where the speaker can approve, request revisions, or reject the output before the next stage proceeds.

## Workflow Inputs

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `topic` | string | Yes | What the talk is about (e.g., "Building Resilient Microservices") |
| `audienceLevel` | `beginner` \| `intermediate` \| `advanced` \| `mixed` | Yes | Target audience technical level |
| `format` | `lightning` \| `standard` \| `keynote` | Yes | Talk format, which determines target duration |
| `constraints` | string | No | Free-text speaker constraints (e.g., "Focus on observability, avoid Kubernetes") |
| `referenceMaterials` | array | No | Speaker-provided reference materials for RAG ingestion |

### Talk Formats and Duration

| Format | Duration |
| --- | --- |
| Lightning | 5-10 minutes |
| Standard | 25-45 minutes |
| Keynote | 45-60 minutes |

### Reference Materials

Each entry in `referenceMaterials` has two fields:

- **type**: `file` or `url`
- **path**: local file path (for `file`) or web URL (for `url`)

Supported file types:

| Type | How it's processed |
| --- | --- |
| PDF (`.pdf`) | Text extracted via `unpdf` library |
| Markdown (`.md`) | Chunked as markdown (preserves heading structure) |
| Plain text (`.txt`, etc.) | Chunked as plain text |
| URL | Fetched (30-second timeout), parsed as HTML |

If a reference material fails to load (file not found, network timeout, scanned PDF with no extractable text), the workflow logs a warning and continues with the remaining materials. No single failure blocks the pipeline.

## Pipeline Steps

```
┌─────────────────────────────────┐
│  1. RAG Initialization          │  Seed vector indexes
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  2. Researcher Agent (Sonnet)   │  Web search + RAG retrieval
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  3. Human Review Gate           │  Approve / Revise / Reject research
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  4. Talk Architect (Sonnet)     │  Design 3 structure options
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  5. Human Review Gate           │  Pick a structure / Reject for new options
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  6. Writer Agent (Opus)         │  Write the full timed speaker script
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  7. Human Review Gate           │  Approve / Revise / Reject script
└──────────────┬──────────────────┘
               ▼
┌─────────────────────────────────┐
│  8. Output Assembly             │  Package final deliverable
└─────────────────────────────────┘
```

### Step 1: RAG Initialization

Before any agent runs, the workflow seeds two vector indexes in PostgreSQL (pgvector):

**Best Practices Knowledge Base** — A curated ~3,000-word collection of conference talk guidance covering:
- Talk structure patterns (Problem-Solution-Demo, Story Arc, Hot Take, etc.)
- Opening hook techniques (surprising statistic, provocative question, live demo, etc.)
- Audience engagement techniques (think-pair-share, live polling, call and response, etc.)
- Pacing and timing strategies (words-per-minute targets, energy curve, strategic pauses)
- Closing and call-to-action patterns

This content is chunked (512 tokens max, 50 token overlap) and embedded using OpenAI's `text-embedding-3-small` model, then stored in the `best_practices` pgvector index.

**User References** (optional) — If the speaker provides `referenceMaterials`, each one is loaded, chunked, embedded, and stored in the `user_references` pgvector index. The index is cleared at the start of each run to ensure clean state.

Both indexes use 1536-dimensional vectors with cosine similarity.

### Step 2: Researcher Agent

The Researcher agent (Claude Sonnet) produces a structured research brief using three information sources:

1. **Speaker references** (RAG) — queries `user_references` index for the speaker's own materials
2. **Best practices** (RAG) — queries `best_practices` index for talk structure and engagement guidance
3. **Web search** — searches the web for current trends, statistics, existing talks

Every finding is tagged with a `sourceType` (`user_reference`, `best_practice`, or `web`) for attribution transparency.

The research brief includes: key findings with sources, existing talks on similar subjects, relevant statistics, suggested angles, and best practices guidance.

### Step 3: Human Review Gate — Research

The speaker reviews the research brief and can:
- **Approve** — move to structure design
- **Revise** — provide feedback, researcher re-runs with guidance
- **Reject** — abort the workflow

### Step 4: Talk Architect Agent

The Talk Architect (Claude Sonnet) designs **3 distinct structure options** based on the approved research brief. Each option includes:
- A title and narrative approach description
- Ordered section breakdown with word counts and timing estimates
- Rationale for why the structure works for the topic/audience

The architect uses the `estimateTiming` tool to verify section timings fit the target duration.

**Lightning format exception:** For lightning talks (5-10 min), the architect step is skipped entirely. A default single-section structure is used instead, since short talks don't benefit from complex multi-section architectures.

### Step 5: Human Review Gate — Structure

The speaker picks one of the three structure options or rejects them all for new options (with optional feedback).

### Step 6: Writer Agent

The Writer agent (Claude Opus — highest quality tier) produces the full timed speaker script, including:
- Section markers aligned to the approved structure
- Timing markers at key transitions
- `[PAUSE]`, `[ASK AUDIENCE]`, and `[EMPHASIS]` markers
- Jargon checks appropriate to the audience level (via `checkJargon` tool)
- Word-count-based duration verification (via `wordCountToTime` tool)

Format-specific adjustments:
- **Lightning**: Condensed narrative, minimal interaction markers, immediate call to action
- **Keynote**: Extended storytelling, multiple interaction points, deeper examples

### Step 7: Human Review Gate — Script

The speaker reviews the final script and can approve, request revisions, or reject.

### Step 8: Output Assembly

Packages the final deliverable with the research brief, speaker script, and workflow metadata (run ID, completion timestamp, original inputs).

## RAG Architecture

### Why RAG?

Without RAG, the agents rely entirely on their training data and web search. RAG adds two advantages:

1. **Consistent quality guidance** — The best practices KB ensures every talk benefits from curated conference speaking expertise, regardless of what the LLM "remembers" about public speaking.
2. **Speaker personalization** — Reference materials let the speaker inject their own blog posts, documentation, code samples, or prior talks so the output reflects their voice and expertise.

### Vector Pipeline

```
Content (text/PDF/URL/markdown)
  → Chunking (recursive, 512 max tokens, 50 overlap)
    → Embedding (OpenAI text-embedding-3-small, 1536 dimensions)
      → Storage (pgvector, cosine similarity)
        → Query at agent runtime (natural language → embedding → similarity search)
```

### Graceful Degradation

The RAG system is designed to degrade gracefully at every level:

| Failure | Behavior |
| --- | --- |
| `OPENAI_API_KEY` not set | Embedding calls fail; agents fall back to web search only |
| Best practices indexing fails | Warning logged; researcher uses web search + any user refs |
| Single reference material fails | Warning logged; other materials still indexed |
| All reference materials fail | Warning logged; researcher uses best practices + web search |
| pgvector unavailable | Indexing fails; agents fall back to web search only |
| No reference materials provided | Normal operation — `user_references` index is simply empty |

The workflow never aborts due to RAG failures. Web search is always available as a baseline.

## Model Tiers

Each agent uses a Claude model tier matched to its task complexity:

| Agent | Model | Rationale |
| --- | --- | --- |
| Researcher | Claude Sonnet | Good balance of speed and quality for search synthesis |
| Talk Architect | Claude Sonnet | Structure design needs reasoning but not creative writing |
| Writer | Claude Opus | Highest quality for the final creative output |
