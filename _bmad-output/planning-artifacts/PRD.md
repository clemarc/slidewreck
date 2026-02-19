---
workflowType: prd
classification:
  domain: general
  projectType: cli_tool
  complexity: medium
inputDocuments: []
lastEdited: '2026-02-19'
editHistory:
  - date: '2026-02-19'
    changes: 'Added Success Criteria, Product Scope (7 phases), phase-tagged FRs/NFRs, restructured Milestones'
  - date: '2026-02-19'
    changes: 'Rewrote 27 FRs to [Actor] can [capability] format; rewrote 24 NFRs with shall + measurement methods'
  - date: '2026-02-19'
    changes: 'Extracted architecture into architecture.md; converted User Stories to User Journeys; renumbered sections 5-10'
  - date: '2026-02-19'
    changes: 'Removed implementation leakage from FRs/NFRs — replaced architecture terms (pipeline, gate, agent, RAG, DeckSpec, pnpm, .env) with user-facing language'
---

# Product Requirements Document: TalkForge

## Conference Talk Generator Pipeline — Built with Mastra

---

## 1. Vision & Purpose

TalkForge is a multi-agent AI pipeline that transforms a topic and a set of constraints into a complete conference talk package: research brief, narrative outline, speaker script, slide specifications, and a speaker prep kit. It is built on the Mastra framework to deeply exercise agents, tools, workflows, RAG, memory, and evals.

Unlike a single-shot "generate slides from a prompt" tool, TalkForge is a **collaborative, multi-stage pipeline** with human-in-the-loop approval gates at every major stage. The system learns the user's speaking style over time through persistent memory, and measures its own quality through a structured eval suite.

The primary user is a software engineer who gives conference talks, internal tech talks, or meetup presentations and wants to accelerate their preparation without sacrificing quality or personal voice.

---

## 2. Success Criteria

This is a learning/POC project to upskill on the BMAD method and the Mastra framework. Success criteria are learning-oriented.

| ID | Criterion | Measurement |
|----|-----------|-------------|
| SC-1 | Exercise all 7 Mastra core capabilities (agents, tools, workflows, RAG, evals, memory, observability) with working implementations | All 7 capabilities have at least one working implementation by Phase 7 completion |
| SC-2 | Complete Phase 1 MVP — a working end-to-end pipeline from topic input to speaker notes output | Pipeline runs successfully: topic → research → human review → speaker script |
| SC-3 | Build enough understanding of Mastra to give a conference talk or live demo about the framework | Speaker can explain and demonstrate each Mastra capability using TalkForge as the example |
| SC-4 | Each phase produces a runnable increment — no phase requires a later phase to be useful | Each phase's output is independently testable and demonstrable |

---

## 3. Product Scope

### Project Context

TalkForge is a learning vehicle for the Mastra framework. Each phase targets one Mastra capability, building understanding incrementally. The MVP (Phase 1) is a minimal end-to-end pipeline; later phases layer on additional capabilities.

### Phase Boundaries

**Phase 1 — Core Pipeline (MVP): Agents + Tools + Workflows**
- 2 agents: Researcher, Writer
- 1 human gate (after research)
- Minimal tools: `webSearch`, `wordCountToTime`
- Input: topic + audience level + format
- Output: `speaker-notes.md`
- Mastra features: agent definition, tool binding, sequential workflow, suspend/resume

**Phase 2 — Workflow Complexity: Branching, Conditional, Loopback**
- +Architect agent (3 structure options)
- 2nd human gate + loopback (reject → regenerate)
- Conditional step skipping by format
- Mastra features: workflow branching, conditional logic, loop-back patterns

**Phase 3 — RAG: Indexing, Chunking, Retrieval**
- User reference material ingestion
- "Talk best practices" knowledge base
- Mastra features: vector store setup, document chunking, retrieval augmentation

**Phase 4 — Evals: LLM-as-Judge, Heuristic, Trends**
- Eval suite (3–4 evals: hook strength, pacing, jargon density)
- Eval scorecard output
- Meta-evals after 3+ sessions
- Mastra features: eval registry, LLM-as-judge, heuristic evals, trend analysis

**Phase 5 — Design: Designer Agent, Slide Specs**
- +Designer agent
- Slide specifications (DeckSpec JSON) + Mermaid diagrams (SVG)
- Final slide output format TBD (PPTX, reveal.js, Slidev, or other)
- Parallel asset creation
- Mastra features: adding agents to existing pipeline, parallel workflow branches

**Phase 6 — Memory: Style Learning, Prompt Augmentation**
- +Style Learner agent (internal)
- Dynamic prompt augmentation on Writer
- Cross-session talk metadata
- Mastra features: memory persist/retrieve, memory-augmented prompts, cross-session awareness

**Phase 7 — Coach: Prep Package, Past Talk Awareness**
- +Coach agent
- Prep package output (Q&A, timing, contingencies, social copy)
- RAG-powered past talk query for repetition avoidance
- Downloadable output packaging
- Mastra features: RAG-powered agent tools, cross-session content awareness

### Out of Scope

- Web UI beyond Mastra's built-in playground (CLI-first for MVP; revisit post-Phase 7)
- Multi-user collaboration or shared style profiles
- AI image generation for slides (may be explored in Phase 5 as optional)
- Google Slides or Keynote export (slide format TBD in Phase 5)

---

## 4. User Journeys

### Journey 1: Creating a Talk from Scratch

**Persona:** First-time speaker preparing a conference talk.
**Phase coverage:** Phase 1 (MVP), Phase 2

The speaker provides a topic ("Building Resilient Microservices"), selects audience level ("intermediate") and format ("standard 30-min"). The system's Researcher produces a research brief surfacing recent articles, stats, and existing talks on the topic. At the first human gate, the speaker reviews the brief — they prioritise two angles, exclude a third, and approve.

In Phase 2, the Architect presents 3 structural options (Problem→Solution→Demo, Story Arc, Hot Take). The speaker picks one, or mixes sections from multiple options. If none work, the speaker rejects and provides feedback; the system regenerates. Once a structure is approved, the Writer produces the full speaker script with timing markers, pause cues, and audience interaction prompts.

**Stories covered:** US-1, US-2, US-3, US-4

---

### Journey 2: Reviewing and Teaching My Style

**Persona:** Returning speaker on their 3rd+ talk.
**Phase coverage:** Phase 6

The speaker edits the generated script at the human gate — shortening sentences, replacing formal transitions with casual ones, removing a joke that doesn't land. The system captures the diff and the Style Learner extracts insights: "prefers short punchy sentences", "avoids rhetorical questions", "likes starting sections with anecdotes". On the next run, the Writer's prompt is augmented with these style preferences. The speaker notices the output already sounds more like them — fewer edits needed each time.

**Stories covered:** US-5, US-8

---

### Journey 3: Getting the Complete Package

**Persona:** Speaker preparing for a conference with a submission deadline.
**Phase coverage:** Phase 5, Phase 7

After the script is approved, the Designer produces slide specifications following opinionated rules (one idea per slide, no bullet points, Mermaid diagrams for architecture). Assets are generated in parallel. The Coach then reviews the complete talk and produces a prep package: anticipated Q&A (including snarky questions), a timing cheat sheet, "if the demo fails" contingencies, a conference abstract, and social media copy. The speaker downloads everything as a ZIP.

**Stories covered:** US-6, US-7

---

### Journey 4: Tracking Quality Over Time

**Persona:** Speaker who has used the system multiple times.
**Phase coverage:** Phase 4

After each pipeline run, the eval suite automatically scores the output: hook strength, pacing distribution, jargon density, narrative coherence, slide cleanliness. The speaker sees a scorecard with ratings and recommendations. Over multiple sessions, a trend dashboard shows edit counts decreasing — proof that the memory system is learning their style.

**Stories covered:** US-9, US-10

---

### Journey 5: Leveraging References and Past Work

**Persona:** Speaker preparing a talk on a topic they've written about.
**Phase coverage:** Phase 3, Phase 7

The speaker uploads blog posts, documentation, and code samples as reference material. The system indexes them via RAG and the Researcher incorporates this context alongside web search results. For returning speakers, the Coach queries past talk content to flag potential repetition — ensuring each talk brings fresh angles even on familiar topics.

**Stories covered:** US-11, US-12

---

### Journey 6: Resuming an Interrupted Session

**Persona:** Speaker whose session was interrupted mid-pipeline.
**Phase coverage:** Phase 1

The speaker's laptop died after approving the research brief. When they return, the pipeline resumes from the last approved gate — no need to re-run research or re-approve. The serialised workflow state preserves all prior decisions and outputs.

**Stories covered:** US-13

---

## 5. Architecture Reference

> Detailed system architecture is documented in [architecture.md](./architecture.md). This includes: agent definitions (6 agents with system prompts, tools, and output schemas), workflow pipeline design (12-step with human gates, parallel branches, and conditional logic), tool registry (13 tools), RAG strategy (3 knowledge bases), memory system (style learning loop with dynamic prompt augmentation), and eval suite (10 per-stage + 4 meta-evals).

---

## 6. Functional Requirements

### 6.1 Input Handling

- FR-1: Speaker can provide a topic as free-text input — **Phase 1**
- FR-2: Speaker can select an audience level (beginner, intermediate, advanced, or mixed) — **Phase 1**
- FR-3: Speaker can select a talk format: lightning (5–10 min), standard (25–35 min), or keynote (40–60 min) — **Phase 1**
- FR-4: Speaker can provide optional constraints as free text to guide content generation — **Phase 2**
- FR-5: Speaker can upload reference material (PDF, MD, URL list) to inform research with user-provided context — **Phase 3**
- FR-6: System can validate all required inputs before starting generation and return error messages that identify missing fields and expected formats — **Phase 1**

### 6.2 Pipeline Execution

- FR-7: System can execute the end-to-end generation process from input to final output — **Phase 1** (Phase 1: simplified 4-step process; expanded per phase)
- FR-8: System can pause at each review point and resume later without losing progress — **Phase 1**
- FR-9: System can pass structured speaker feedback from each review point as input to the next generation step — **Phase 1**
- FR-10: Speaker can reject all proposed talk structures and trigger regeneration with feedback — **Phase 2**
- FR-11: System can execute asset creation steps concurrently — **Phase 5**
- FR-12: System can skip inapplicable steps based on talk format — **Phase 2**

### 6.3 Output Generation

- FR-13: System can produce slide specifications and rendered diagrams; final slide output format TBD — **Phase 5**
- FR-14: System can produce a speaker notes document with full script, timing annotations, and markers — **Phase 1**
- FR-15: System can produce a preparation package with Q&A, timing cheat sheet, contingencies, and social copy — **Phase 7**
- FR-16: System can produce an evaluation scorecard with full results — **Phase 4**
- FR-17: Speaker can download all outputs as a single ZIP or individually — **Phase 7**

### 6.4 Memory & Learning

- FR-18: System can generate output without style augmentation on first use (cold start) — **Phase 6**
- FR-19: System can detect speaker edits at review points and extract style insights — **Phase 6**
- FR-20: System can persist style insights to long-term storage, organised by category — **Phase 6**
- FR-21: System can retrieve and apply matching style insights to the generation process on subsequent runs — **Phase 6**
- FR-22: System can store completed talk metadata for cross-session awareness — **Phase 6**
- FR-23: Speaker can receive content that avoids repetition from previous talks — **Phase 7**

### 6.5 Evals

- FR-24: System can run the full evaluation suite automatically after generation completes — **Phase 4**
- FR-25: System can store evaluation results for trend analysis — **Phase 4**
- FR-26: Speaker can view the evaluation scorecard after generation completes — **Phase 4**
- FR-27: System can run quality assessments on learning effectiveness when at least 3 sessions exist — **Phase 4**

---

## 7. Non-Functional Requirements

### 7.1 Performance

- NFR-1: The system shall complete total generation time (excluding review point wait time) in under 5 minutes for a 30-minute talk. *Measured by: wall-clock time from generation start to final output, logged per run.* — **Phase 1+**
- NFR-2: Each individual generation step shall complete within 60 seconds. *Measured by: per-step latency in observability logs.* — **Phase 1+**
- NFR-3: Parallel generation steps shall execute concurrently, not sequentially. *Verified by: observability logs showing overlapping execution timestamps.* — **Phase 5**
- NFR-4: Slide and asset generation shall complete within 30 seconds for a 30-slide deck. *Measured by: asset generation step duration in logs.* — **Phase 5**

### 7.2 Reliability

- NFR-5: Session state shall be preservable so a paused session survives process restarts. *Verified by: restarting the process during a paused review and confirming successful resume.* — **Phase 1**
- NFR-6: Failed generation steps shall retry up to 3 times with exponential backoff before reporting failure. *Verified by: injecting transient failures and confirming retry behaviour in logs.* — **Phase 1**
- NFR-7: If an optional capability fails (e.g. image generation), the system shall continue with a placeholder rather than abort. *Verified by: disabling an optional capability and confirming the system completes with placeholder output.* — **Phase 2+**
- NFR-8: Reference material indexing failures shall warn the user but not block execution. *Verified by: simulating indexing failure and confirming the system proceeds with a warning.* — **Phase 3**

### 7.3 Observability

- NFR-9: Each generation step shall log: step name, input token count, output token count, latency, and model used. *Verified by: inspecting structured log output after a run.* — **Phase 1+**
- NFR-10: Each step shall log: step name, status (pending/running/paused/complete/failed), and duration. *Verified by: inspecting step-level log entries after a run.* — **Phase 1+**
- NFR-11: Evaluation results shall be queryable by date range and talk ID. *Verified by: querying evaluation results and confirming correct filtering.* — **Phase 4**
- NFR-12: Data persistence operations shall log: key, operation (read/write/delete), and payload size. *Verified by: inspecting persistence log entries after a session.* — **Phase 6**

### 7.4 Extensibility

- NFR-13: Adding a new generation capability shall require only defining its config (prompt, tools, schema) without modifying the core system. *Verified by: adding a test capability via config only and confirming it runs.* — **Phase 2+**
- NFR-14: Adding a new evaluation shall require only adding an entry to the evaluation registry. *Verified by: adding a test evaluation entry and confirming it executes.* — **Phase 4**
- NFR-15: The tool registry shall support adding custom tools without modifying existing capabilities. *Verified by: registering a new tool and confirming existing capabilities are unaffected.* — **Phase 2+**
- NFR-16: The slide layout system shall be template-driven so new layouts can be added via config. *Verified by: adding a new layout template via config and confirming it renders correctly.* — **Phase 5**

### 7.5 Data & Privacy

- NFR-17: All user data (style preferences, indexed references, generated files) shall be stored locally or in user-controlled infrastructure. *Verified by: auditing storage locations and network traffic during a run.* — **Phase 1+**
- NFR-18: No talk content shall be sent to third-party services beyond the configured LLM provider. *Verified by: auditing outbound network requests during a run.* — **Phase 1+**
- NFR-19: Users shall be able to view and delete stored personal data (style preferences, past talk records). *Verified by: exercising view and delete operations and confirming data removal.* — **Phase 6**
- NFR-20: Users shall be able to export all their data (style preferences, past talks, evaluations) in a structured, portable format. *Verified by: running the export command and validating the output structure.* — **Phase 7**

### 7.6 Developer Experience

- NFR-21: The project shall be runnable locally with a single install command followed by a single start command. *Verified by: cloning the repo and running the commands on a clean environment.* — **Phase 1**
- NFR-22: All generation capabilities shall be testable in isolation with mock inputs. *Verified by: running unit tests with mocked responses.* — **Phase 1**
- NFR-23: The evaluation suite shall be runnable independently with a single command. *Verified by: running the evaluation command without a prior generation run.* — **Phase 4**
- NFR-24: Environment configuration shall use a single configuration file with documented defaults. *Verified by: running the project with only the example configuration values populated.* — **Phase 1**

---

## 8. Technical Stack

| Component | Technology | Notes |
|-----------|-----------|-------|
| Framework | Mastra | Core orchestration: agents, tools, workflows, RAG, memory, evals |
| Runtime | Node.js / TypeScript | Mastra's native runtime |
| LLM Provider | Anthropic (Claude) | Primary model for all agents |
| Vector Store | PostgreSQL + pgvector | For RAG knowledge bases; alternatively Pinecone |
| Slide Rendering | TBD | Format-agnostic; DeckSpec is the contract |
| Mermaid Rendering | @mermaid-js/mermaid-cli | CLI tool to render Mermaid to SVG |
| Web Search | Mastra web search integration | For the Researcher agent |
| Package Manager | pnpm | Workspace management |
| Testing | Vitest | Unit and integration tests |

---

## 9. Milestones

| Phase | Scope | Mastra Features | FRs | Success Gate |
|-------|-------|-----------------|-----|-------------|
| **1: Core Pipeline (MVP)** | 2 agents (Researcher + Writer), 1 human gate, basic CLI, speaker notes output | Agents, Tools, Workflows (suspend/resume) | FR-1,2,3,6,7,8,9,14 | Topic → speaker notes end-to-end |
| **2: Workflow Complexity** | +Architect agent, 2nd gate, loopback, conditional skipping | Workflows (branching, conditional, loopback) | FR-4,10,12 | User picks from 3 structures, rejects trigger regeneration |
| **3: RAG** | Reference material indexing, best practices KB | RAG (indexing, chunking, retrieval) | FR-5 | User-provided docs augment research output |
| **4: Evals** | 3–4 evals, scorecard output, meta-evals | Evals (LLM-as-judge, heuristic, trend) | FR-16,24,25,26,27 | Eval scorecard produced after each run |
| **5: Design** | +Designer agent, slide specs (DeckSpec), Mermaid SVGs, parallel assets | Parallel workflows, agent addition | FR-11,13 | Slide specs + diagrams generated alongside script |
| **6: Memory** | +Style Learner, dynamic prompt augmentation, cross-session metadata | Memory (persist, retrieve, augment) | FR-18,19,20,21,22 | Edit count decreases measurably by session 3 |
| **7: Coach** | +Coach agent, prep package, past talk awareness, output packaging | RAG-powered tools, content awareness | FR-15,17,23 | Full talk package downloadable |

---

## 10. Open Questions

1. ~~**Interface**: CLI-first or web UI?~~ **Resolved:** CLI-first for MVP (Phase 1). Mastra playground may suffice for human gates. Custom UI revisit post-Phase 7.
2. **Image generation**: Include AI image generation for slides, or limit to Mermaid diagrams and stock-image search? Adds complexity and API cost. *(Deferred to Phase 5 as optional.)*
3. **Model selection**: Should all agents use the same model, or should lighter agents (Style Learner, eval judges) use a cheaper/faster model?
4. ~~**Multi-format output**: Should the system also produce Google Slides or Keynote formats, or is PPTX sufficient?~~ **Resolved:** Slide output format TBD. DeckSpec is format-agnostic; renderer pluggable in Phase 5.
5. ~~**Collaboration**: Should the system support multiple users (e.g. a co-speaker) with merged style profiles?~~ **Resolved:** Out of scope (see Section 3).
