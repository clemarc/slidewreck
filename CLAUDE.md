# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mastra agents to build presentations using BMAD and Claude Code. This is a Node.js/TypeScript project using pnpm.

## Project Status

Phase 1 in progress — project scaffolding complete (story 1.1), building agents and workflows.

## Environment

- Environment variables go in `.env` (gitignored); use `.env.example` for templates

## Git & PR Workflow

When the `dev-story` workflow completes and a story moves to **review** status:

1. **Create a feature branch** from main named `story/<story-key>` (e.g., `story/1-1-project-scaffolding-infrastructure-setup`)
2. **Stage and commit** all implementation files with a message referencing the story
3. **Create a GitHub PR** using `gh pr create`:
   - Title: `Story <X.Y>: <story title>`
   - Body: the full content of the story implementation artifact markdown file (`_bmad-output/implementation-artifacts/<story-key>.md`)
4. The PR becomes the review surface for the Code Review step (`/bmad-bmm-code-review`)

@AGENTS.md
