# VaultRecall

VaultRecall is a local-first active recall web app for Obsidian and Markdown vaults.

Point it at a folder of `.md` files, scan the vault, run study sessions from extracted recall prompts, rate your answers, schedule future reviews, and write session logs back into the vault.

## Why

Obsidian is excellent for building a knowledge base, but browsing notes is not the same thing as learning. VaultRecall turns your notes into an active recall workflow without requiring Anki, cloud accounts, or a proprietary format.

## Current version: v0.1

VaultRecall v0.1 supports:

- Local vault path input
- Markdown/Obsidian vault scanning
- Frontmatter, tags, headings, and wikilink parsing
- Recall prompt extraction from `## Recall prompts` sections
- Study sessions from:
  - due reviews
  - weak areas
  - all questions
  - specific folders
- Self-grading with `Again`, `Hard`, `Good`, `Easy`
- Lightweight spaced repetition scheduling
- Local state stored in the vault under `.vaultrecall/state.json`
- Markdown session logs written to `VaultRecall/Sessions/YYYY-MM-DD.md`
- Clean local web UI

## Demo vault compatibility

This app was first built against an Obsidian-style Markdown vault called `KnowledgeBank`, but it is designed to work with any folder of Markdown files.

VaultRecall looks for recall cards like this:

```md
## Recall prompts
- Q: What problem does RAG solve?
  A: It lets an LLM answer using retrieved external context instead of relying only on model weights.
- Q: When would you prefer fine-tuning over RAG?
  A: When you need behavioural/style adaptation or task-specific patterns rather than factual retrieval.
```

## Getting started

### Prerequisites

- Node.js 20+
- npm
- An Obsidian or Markdown vault

### Install

```bash
git clone https://github.com/Prawal-Sharma/VaultRecall.git
cd VaultRecall
npm install
```

### Run locally

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Enter the absolute path to your vault, for example:

```text
/Users/you/Documents/KnowledgeBank
```

Then click **Scan vault**.

## How to use it

1. Scan your vault.
2. Check the dashboard counts.
3. Start with **Due reviews** if you have history, or **All questions** for a new vault.
4. Answer the question before revealing the expected answer.
5. Reveal the answer.
6. Rate yourself:
   - **Again** — I missed it.
   - **Hard** — I barely got it.
   - **Good** — I got it.
   - **Easy** — I knew it cold.
7. VaultRecall schedules the next review.
8. At the end of a session, a Markdown log is written back into your vault.

## Data and privacy

VaultRecall is local-first.

- It reads Markdown files from the vault path you provide.
- It writes review state to `.vaultrecall/state.json` inside your vault.
- It writes session logs to `VaultRecall/Sessions/` inside your vault.
- v0.1 does not send your notes to any AI provider.
- v0.1 has no accounts, cloud sync, or telemetry.

## Project structure

```text
app/                  Next.js app and API routes
lib/vault/            Markdown vault scanner
lib/recall/           Study session selection
lib/store/            Local vault state and session logs
app/globals.css       UI styling
```

## Roadmap / next TODOs

### v0.2

- Better recall prompt parser for more Markdown styles
- Session history dashboard
- Better weak-area analytics
- Search/filter notes and questions
- Export/import review state
- Safer handling for very large vaults

### v0.3

- Optional AI grading for free-text answers
- AI-generated questions from notes
- Provider abstraction: OpenAI, Anthropic, Ollama
- Study paths based on Obsidian MOCs / linked notes
- Better Obsidian write-back reports

### v0.4

- Local graph view of note/question relationships
- Project/checkpoint mode
- Multi-vault support
- Desktop packaging with Tauri or Electron

## Design principles

- Markdown stays the source of truth.
- The app should help you study, not trap your data.
- No mandatory cloud service.
- No Anki dependency.
- Obsidian compatibility matters.
- Active recall beats passive browsing.

## License

MIT
