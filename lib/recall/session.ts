import crypto from 'node:crypto';
import type { RecallQuestion, ReviewRating, StudyMode, StudySessionSummary, VaultState } from '../types';
import { isDue, isWeak } from '../store/state';

export function selectQuestions(args: {
  questions: RecallQuestion[];
  state: VaultState;
  mode: StudyMode;
  folder?: string;
  limit?: number;
}) {
  const { questions, state, mode, folder, limit = 10 } = args;
  let selected = questions;
  if (mode === 'folder' && folder) selected = selected.filter((q) => q.folder === folder || q.folder.startsWith(`${folder}/`));
  if (mode === 'due') selected = selected.filter((q) => isDue(state.schedules[q.id]));
  if (mode === 'weak') selected = selected.filter((q) => isWeak(state.schedules[q.id]));

  return selected
    .map((q) => ({ q, sort: scoreQuestion(q, state) }))
    .sort((a, b) => b.sort - a.sort)
    .slice(0, limit)
    .map(({ q }) => q);
}

function scoreQuestion(q: RecallQuestion, state: VaultState) {
  const schedule = state.schedules[q.id];
  if (!schedule) return 100;
  let score = 0;
  if (isDue(schedule)) score += 50;
  if (isWeak(schedule)) score += 30;
  score += Math.max(0, 10 - schedule.attempts);
  return score;
}

export function createSession(vaultPath: string, mode: StudyMode, questions: RecallQuestion[]): StudySessionSummary {
  return {
    id: crypto.randomUUID(),
    startedAt: new Date().toISOString(),
    vaultPath,
    mode,
    totalQuestions: questions.length,
    answered: 0,
    ratings: { again: 0, hard: 0, good: 0, easy: 0 },
    questionIds: questions.map((q) => q.id),
  };
}

export function countRatings(records: { rating: ReviewRating }[]) {
  return records.reduce((acc, record) => {
    acc[record.rating] += 1;
    return acc;
  }, { again: 0, hard: 0, good: 0, easy: 0 } as Record<ReviewRating, number>);
}
