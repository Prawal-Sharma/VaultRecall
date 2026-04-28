import fs from 'node:fs/promises';
import path from 'node:path';
import type { QuestionSchedule, ReviewRating, StudySessionSummary, VaultState } from '../types';

const STATE_DIR = '.vaultrecall';
const STATE_FILE = 'state.json';

export function statePath(vaultPath: string) {
  return path.join(vaultPath, STATE_DIR, STATE_FILE);
}

export async function ensureState(vaultPath: string): Promise<VaultState> {
  await fs.mkdir(path.join(vaultPath, STATE_DIR), { recursive: true });
  try {
    const raw = await fs.readFile(statePath(vaultPath), 'utf8');
    const parsed = JSON.parse(raw) as VaultState;
    return {
      ...parsed,
      vaultPath,
      generatedQuestions: parsed.generatedQuestions ?? {},
      schedules: parsed.schedules ?? {},
      reviews: parsed.reviews ?? [],
      sessions: parsed.sessions ?? [],
    };
  } catch {
    const initial: VaultState = { vaultPath, generatedQuestions: {}, schedules: {}, reviews: [], sessions: [] };
    await saveState(vaultPath, initial);
    return initial;
  }
}

export async function saveState(vaultPath: string, state: VaultState) {
  await fs.mkdir(path.join(vaultPath, STATE_DIR), { recursive: true });
  await fs.writeFile(statePath(vaultPath), JSON.stringify(state, null, 2));
}

export function isDue(schedule: QuestionSchedule | undefined, now = new Date()) {
  if (!schedule) return true;
  return new Date(schedule.nextReview).getTime() <= now.getTime();
}

export function isWeak(schedule: QuestionSchedule | undefined) {
  if (!schedule) return false;
  return schedule.misses >= 2 || schedule.rating === 'again' || schedule.ease < 1.8;
}

export function nextSchedule(questionId: string, rating: ReviewRating, previous?: QuestionSchedule): QuestionSchedule {
  const now = new Date();
  const attempts = (previous?.attempts ?? 0) + 1;
  const misses = (previous?.misses ?? 0) + (rating === 'again' ? 1 : 0);
  let ease = previous?.ease ?? 2.3;
  let intervalDays = previous?.intervalDays ?? 0;

  if (rating === 'again') {
    ease = Math.max(1.3, ease - 0.25);
    intervalDays = 0;
  } else if (rating === 'hard') {
    ease = Math.max(1.3, ease - 0.1);
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2) || 1);
  } else if (rating === 'good') {
    intervalDays = Math.max(3, Math.round((intervalDays || 1) * ease));
  } else {
    ease = Math.min(3.0, ease + 0.15);
    intervalDays = Math.max(7, Math.round((intervalDays || 2) * ease * 1.4));
  }

  const next = new Date(now);
  if (rating === 'again') next.setHours(next.getHours() + 4);
  else next.setDate(next.getDate() + intervalDays);

  return {
    questionId,
    lastReviewed: now.toISOString(),
    nextReview: next.toISOString(),
    rating,
    intervalDays,
    ease,
    attempts,
    misses,
  };
}

export async function writeSessionLog(vaultPath: string, session: StudySessionSummary, reviewedQuestions: { noteTitle: string; notePath: string; question: string; rating: ReviewRating }[]) {
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(vaultPath, 'VaultRecall', 'Sessions');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${day}.md`);
  const lines = [
    `# VaultRecall Session - ${day}`,
    '',
    `- Started: ${session.startedAt}`,
    `- Ended: ${session.endedAt ?? new Date().toISOString()}`,
    `- Mode: ${session.mode}`,
    `- Answered: ${session.answered}/${session.totalQuestions}`,
    `- Ratings: Again ${session.ratings.again}, Hard ${session.ratings.hard}, Good ${session.ratings.good}, Easy ${session.ratings.easy}`,
    '',
    '## Reviewed Questions',
    '',
    ...reviewedQuestions.map((q) => `- **${q.rating.toUpperCase()}** [[${q.noteTitle}]] — ${q.question}`),
    '',
  ];
  await fs.appendFile(file, `${lines.join('\n')}\n`);
}
