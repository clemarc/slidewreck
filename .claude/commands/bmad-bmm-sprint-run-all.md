---
name: 'sprint-run-all'
description: 'Run an entire epic in YOLO mode: create story (if backlog), dev story, code review for each story in order, then mark epic done. Use when the user says "run epic 1", "sprint run all epic 1", or "do EPIC 1 in YOLO".'
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS - while staying in character as the current agent persona you may have loaded:

<steps CRITICAL="TRUE">
1. **Activate YOLO mode for the entire run**
   - At the start, declare: **#yolo** mode is active for this sprint run.
   - You MUST skip all confirmations, template-output prompts, and "continue?" asks. Simulate "Continue" / "c" for every prompt so that every sub-workflow runs to completion without user input.
   - This applies to: create-story, dev-story, and code-review whenever they are invoked.

2. **Load sprint status and resolve target epic**
   - LOAD the FULL file: @{project-root}/_bmad-output/implementation-artifacts/sprint-status.yaml
   - Read the entire file to preserve order and structure.
   - Determine the target epic number from user context (e.g. "EPIC 1" → epic number **1**). If not specified, use **1**.
   - From `development_status`, collect all story keys for that epic **in order** (top to bottom): keys matching pattern `{epicNum}-{storyNum}-*` that are NOT `epic-X` or `epic-X-retrospective`. Example for epic 1: `1-1-miledecks-theme-and-design-tokens`, `1-2-base-ui-components-and-layout-primitives`, ...
   - Store the ordered list as {{epic_story_keys}}.

3. **Set epic to in-progress**
   - If `development_status["epic-{N}"]` is `backlog`, update it to `in-progress` in sprint-status.yaml and save (preserve all comments and structure).

4. **For each story key in {{epic_story_keys}} in order**
   - Let {{story_key}} = current story key (e.g. `1-1-miledecks-theme-and-design-tokens`).
   - Let {{story_path}} = `{project-root}/_bmad-output/implementation-artifacts/{{story_key}}.md`.
   - Read current status for {{story_key}} from sprint-status.yaml.

   - **If status is "done"**: Skip this story (already complete). Output: `✓ skipped (already done) for {{story_key}}`. Continue to the next story.

   - **If status is "backlog"**: Run **create-story** so the story file exists and status becomes ready-for-dev.
     - LOAD the FULL @{project-root}/_bmad/core/tasks/workflow.xml. READ it. Pass workflow-config = @{project-root}/_bmad/bmm/workflows/4-implementation/create-story/workflow.yaml.
     - Execute the workflow in **#yolo** mode. Create-story auto-discovers the first **backlog** story (in sprint-status order); since we iterate in order, that will be {{story_key}}. Run to completion without pausing for prompts.
     - **Progress:** After completion, output: `✓ create-story done for {{story_key}}`
     - After completion, sprint-status will have this story as ready-for-dev; re-read sprint-status.yaml before the next step.

   - **Run dev-story** for {{story_key}}.
     - LOAD the FULL @{project-root}/_bmad/core/tasks/workflow.xml. Pass workflow-config = @{project-root}/_bmad/bmm/workflows/4-implementation/dev-story/workflow.yaml.
     - Before executing: resolve **story_file** to **{{story_path}}** in the workflow context so Step 1 uses it directly (no "which story?" prompt). Then execute the workflow in **#yolo** mode to completion (implement all tasks, validate, mark review).
     - **Progress:** After completion, output: `✓ dev-story done for {{story_key}}`
     - Sprint-status will be updated to in-progress then review by the workflow.

   - **Run code-review** for {{story_key}}.
     - LOAD the FULL @{project-root}/_bmad/core/tasks/workflow.xml. Pass workflow-config = @{project-root}/_bmad/bmm/workflows/4-implementation/code-review/workflow.yaml.
     - Before executing: resolve **story_path** to **{{story_path}}** in the workflow context so Step 1 uses it without asking. Execute in **#yolo** mode to completion.
     - **Auto-fix:** When code-review presents the fix decision ("Fix them automatically" / "Create action items" / "Show me details"), **always choose option 1 — Fix them automatically** — so that HIGH and MEDIUM issues are fixed in-code during the run rather than deferred to action items.
     - **Progress:** After completion, output: `✓ code-review done for {{story_key}}`
     - Code-review will set the story to "done" in sprint-status when appropriate.

   - **Keep sprint-status.yaml up to date**
     - After each story (create-story, dev-story, code-review), the workflows update sprint-status. Re-read sprint-status.yaml before the next story so you have current statuses. If any workflow did not update the file, update it now: story in-progress → review after dev-story; review → done after code-review when appropriate.

5. **Mark epic done when all stories are done**
   - After processing all stories in {{epic_story_keys}}, re-read the FULL sprint-status.yaml.
   - If every story key in the epic has status "done", set `development_status["epic-{N}"]` = `done` and save the file (preserve all comments and structure).

6. **Report completion**
   - Summarize: epic number, number of stories processed, list of story keys and their final statuses, and the path to sprint-status.yaml.
   - Remind the user that sprint-status.yaml was kept up to date throughout.
</steps>

**Notes:**
- Story keys and order come only from sprint-status.yaml (development_status section, top-to-bottom order).
- If create-story or dev-story HALTs (e.g. missing config, dependency approval), stop and report the halt; do not skip or fake steps.
- Optional: If the user wants to run only a subset of stories or a different epic, use the same logic but with the appropriate epic number or filtered story list.
