# VaultRecall Architecture

VaultRecall v0.1 is a local-first Next.js app.

## Main flow

1. User enters a local vault path.
2. `/api/vault/scan` reads Markdown files from disk.
3. The scanner extracts:
   - note title
   - relative path
   - folder
   - frontmatter
   - tags
   - headings
   - Obsidian wikilinks
   - recall prompts from `## Recall prompts`
4. `/api/study/start` selects questions by mode.
5. User answers and self-rates.
6. `/api/study/answer` updates the lightweight schedule.
7. Completed sessions are logged back into the vault under `VaultRecall/Sessions/`.

## Local data

VaultRecall stores private review state in:

```text
<your-vault>/.vaultrecall/state.json
```

This is intentionally local and should usually not be committed to Git.

Session summaries are written as Markdown:

```text
<your-vault>/VaultRecall/Sessions/YYYY-MM-DD.md
```

These can be committed if the user wants study history in their vault.

## No AI in v0.1

The first version is deterministic and local. Future versions may add optional AI grading and question generation.
