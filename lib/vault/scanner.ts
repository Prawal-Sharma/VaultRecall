import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import type { RecallQuestion, VaultNote } from '../types';

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.obsidian', '.trash', '.vaultrecall']);

function idFor(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex').slice(0, 16);
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') && IGNORED_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) files.push(...await walk(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(full);
    }
  }
  return files;
}

function extractTags(frontmatter: Record<string, unknown>, content: string): string[] {
  const tags = new Set<string>();
  const raw = frontmatter.tags;
  if (Array.isArray(raw)) raw.forEach((t) => tags.add(String(t).replace(/^#/, '')));
  if (typeof raw === 'string') raw.split(/[ ,]+/).filter(Boolean).forEach((t) => tags.add(t.replace(/^#/, '')));
  for (const match of content.matchAll(/(?:^|\s)#([A-Za-z0-9/_-]+)/g)) tags.add(match[1]);
  return [...tags].sort();
}

function extractWikilinks(content: string): string[] {
  const links = new Set<string>();
  for (const match of content.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g)) {
    links.add(match[1].trim());
  }
  return [...links].sort();
}

function extractHeadings(content: string): string[] {
  return [...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => m[1].trim());
}

function cleanAnswerLine(line: string) {
  return line.replace(/^\s*(?:A:|Answer:)\s*/i, '').trim();
}

function cleanQuestionLine(line: string) {
  return line.replace(/^\s*(?:[-*]\s*)?(?:Q:|Question:)\s*/i, '').trim();
}

function sectionAfterHeading(content: string, headingName: string) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^#{2,6}\\s+${headingName}\\s*$`, 'i').test(line.trim()));
  if (start === -1) return '';
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,6}\s+/.test(lines[i])) break;
    collected.push(lines[i]);
  }
  return collected.join('\n').trim();
}

function fallbackAnswerFromNote(content: string) {
  const definition = sectionAfterHeading(content, 'One-line definition');
  if (definition) return definition.split('\n').filter(Boolean).slice(0, 3).join('\n');
  const tldr = sectionAfterHeading(content, 'TL;DR');
  if (tldr) return tldr.split('\n').filter(Boolean).slice(0, 4).join('\n');
  return 'Review the linked source note and compare your answer against its core ideas.';
}

function extractRecallQuestions(note: VaultNote): RecallQuestion[] {
  const lines = note.content.split(/\r?\n/);
  const questions: RecallQuestion[] = [];
  let inRecall = false;
  let currentQ: string | null = null;
  let currentA: string[] = [];

  const flush = () => {
    if (!currentQ) return;
    const answer = currentA.join('\n').trim() || fallbackAnswerFromNote(note.content);
    questions.push({
      id: idFor(`${note.relativePath}:${currentQ}`),
      vaultPath: '',
      noteId: note.id,
      noteTitle: note.title,
      notePath: note.relativePath,
      folder: note.folder,
      question: currentQ.trim(),
      answer,
      sourceHeading: 'Recall prompts',
      tags: note.tags,
    });
    currentQ = null;
    currentA = [];
  };

  for (const line of lines) {
    if (/^#{2,6}\s+Recall prompts\s*$/i.test(line.trim())) {
      inRecall = true;
      continue;
    }
    if (inRecall && /^#{1,6}\s+/.test(line)) {
      flush();
      inRecall = false;
    }
    if (!inRecall) continue;

    if (/^\s*(?:[-*]\s*)?(?:Q:|Question:)\s*/i.test(line)) {
      flush();
      currentQ = cleanQuestionLine(line);
      continue;
    }
    if (/^\s*(?:[-*]\s*)?(?:A:|Answer:)\s*/i.test(line)) {
      currentA.push(cleanAnswerLine(line));
      continue;
    }
    if (currentQ && line.trim()) currentA.push(line.trim().replace(/^[-*]\s*/, ''));
  }
  flush();
  return questions;
}

export async function scanVault(vaultPath: string) {
  const resolved = path.resolve(vaultPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error('Vault path must be a directory.');

  const files = await walk(resolved);
  const notes: VaultNote[] = [];
  const questions: RecallQuestion[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = matter(raw);
    const relativePath = path.relative(resolved, file);
    const folder = path.dirname(relativePath) === '.' ? '' : path.dirname(relativePath);
    const title = path.basename(file, '.md');
    const frontmatter = parsed.data as Record<string, unknown>;
    const content = parsed.content;
    const note: VaultNote = {
      id: idFor(relativePath),
      title,
      path: file,
      relativePath,
      folder,
      frontmatter,
      tags: extractTags(frontmatter, content),
      wikilinks: extractWikilinks(content),
      headings: extractHeadings(content),
      content,
    };
    notes.push(note);
    questions.push(...extractRecallQuestions(note).map((q) => ({ ...q, vaultPath: resolved })));
  }

  notes.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  questions.sort((a, b) => a.noteTitle.localeCompare(b.noteTitle) || a.question.localeCompare(b.question));
  return { vaultPath: resolved, notes, questions };
}
