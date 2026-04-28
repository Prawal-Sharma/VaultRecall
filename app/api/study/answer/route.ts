import { NextRequest, NextResponse } from 'next/server';
import { scanVault } from '../../../../lib/vault/scanner';
import { ensureState, nextSchedule, saveState, writeSessionLog } from '../../../../lib/store/state';
import type { ReviewRating, StudySessionSummary } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, sessionId, questionId, rating, answerText, finish = false } = await req.json();
    if (!vaultPath || !sessionId || !questionId || !rating) return NextResponse.json({ error: 'vaultPath, sessionId, questionId, and rating are required' }, { status: 400 });
    if (!['again', 'hard', 'good', 'easy'].includes(rating)) return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });

    const scan = await scanVault(vaultPath);
    const question = scan.questions.find((q) => q.id === questionId);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const state = await ensureState(scan.vaultPath);
    const session = state.sessions.find((s) => s.id === sessionId);
    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

    const typedRating = rating as ReviewRating;
    state.reviews.push({ questionId, rating: typedRating, answerText, answeredAt: new Date().toISOString() });
    state.schedules[questionId] = nextSchedule(questionId, typedRating, state.schedules[questionId]);
    session.answered += 1;
    session.ratings[typedRating] += 1;

    let completedSession: StudySessionSummary | undefined;
    if (finish || session.answered >= session.totalQuestions) {
      session.endedAt = new Date().toISOString();
      completedSession = session;
      const sessionReviews = state.reviews.filter((r) => session.questionIds.includes(r.questionId));
      const reviewed = sessionReviews.map((r) => {
        const q = scan.questions.find((candidate) => candidate.id === r.questionId)!;
        return { noteTitle: q.noteTitle, notePath: q.notePath, question: q.question, rating: r.rating };
      });
      await writeSessionLog(scan.vaultPath, session, reviewed);
    }

    await saveState(scan.vaultPath, state);
    return NextResponse.json({ schedule: state.schedules[questionId], session, completedSession });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
