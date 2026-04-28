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

## Vault compatibility

VaultRecall works with any local folder of Markdown files, including normal Obsidian vaults.

For v0.1, the important distinction is:

- VaultRecall can **scan and index** any Markdown/Obsidian vault.
- VaultRecall can **quiz you automatically** when it finds explicit recall prompts in your notes.
- VaultRecall does **not yet generate questions from arbitrary prose** unless you add recall prompts yourself. That is planned for a later AI-assisted version.

This app was first built against an Obsidian-style Markdown vault called `KnowledgeBank`, but it is designed to remain generic.

## Recommended note structure

VaultRecall works best when each concept note has a predictable structure. You do not need to use this exact format, but the closer your notes are to it, the more useful the app becomes.

```md
---
type: concept
tags: [ai, rag]
---

# RAG

## One-line definition
Retrieval-augmented generation lets an LLM answer using retrieved external context.

## Why it matters
RAG helps keep answers grounded, current, and inspectable without retraining the model.

## Core ideas
- Index useful source material.
- Retrieve relevant chunks at query time.
- Give retrieved context to the model.
- Evaluate both retrieval quality and answer quality.

## Related notes
- [[Embeddings]]
- [[Evaluation]]
- [[Inference and Serving]]

## Recall prompts
- Q: What problem does RAG solve?
  A: It lets an LLM answer using retrieved external context instead of relying only on model weights.
- Q: When would you prefer fine-tuning over RAG?
  A: When you need behavioural/style adaptation or task-specific patterns rather than factual retrieval.
```

### Minimum useful structure

If you only do one thing, add this section to notes you want to study:

```md
## Recall prompts
- Q: Your question here?
  A: Your expected answer here.
```

### Recommended conventions

- Use one Markdown file per concept, paper, or topic.
- Use clear note titles, e.g. `RAG.md`, `System Design.md`, `Attention Is All You Need.md`.
- Use Obsidian wikilinks for related ideas: `[[Embeddings]]`, `[[Evaluation]]`.
- Put recall prompts under a heading named exactly `## Recall prompts`.
- Use `Q:` for questions and `A:` for answers.
- Keep answers short enough to review quickly, but specific enough to be useful.
- Prefer practical prompts over trivia.

Good prompt:

```md
- Q: A RAG system returns plausible but wrong answers. What are three likely failure points?
  A: Retrieval may be missing relevant chunks, ranking may be poor, or the generation step may be ignoring/overtrusting context.
```

Less useful prompt:

```md
- Q: What is RAG?
  A: Retrieval-augmented generation.
```

## FAQ

### Can VaultRecall do active recall on any Obsidian vault?

Yes, if the vault is local and made of Markdown files. VaultRecall can scan the notes, folders, frontmatter, tags, headings, and wikilinks.

For v0.1, it needs explicit `## Recall prompts` sections to create quiz questions. If your vault has no recall prompts, VaultRecall can still index it, but it will not have much to quiz you on yet.

### Does my vault need to be created in Obsidian?

No. Any folder of `.md` files can work. Obsidian compatibility is useful because wikilinks, folders, and note-per-concept conventions make the vault easier to study.

### Will VaultRecall modify my notes?

v0.1 does not rewrite your existing notes. It writes its own local state to:

```text
.vaultrecall/state.json
```

And it writes session logs to:

```text
VaultRecall/Sessions/YYYY-MM-DD.md
```

### Does VaultRecall use AI?

Not in v0.1. The first version is deterministic and local. AI-generated questions and AI answer grading are planned for later versions.

### Can it generate questions from notes that do not already have recall prompts?

Not yet. That is one of the most important next features. The planned AI-assisted version will be able to read a note and suggest recall prompts automatically.

### Should I commit `.vaultrecall/state.json` to Git?

Usually no. That file is personal review history. If you use Git, consider adding `.vaultrecall/` to your vault's `.gitignore` unless you intentionally want to sync review state across machines.

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
