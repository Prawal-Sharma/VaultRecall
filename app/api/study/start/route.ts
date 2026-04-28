import { NextRequest, NextResponse } from 'next/server';
import { scanVault } from '../../../../lib/vault/scanner';
import { ensureState } from '../../../../lib/store/state';
import { createSession, selectQuestions } from '../../../../lib/recall/session';
import type { StudyMode } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, mode = 'due', folder, limit = 10 } = await req.json();
    if (!vaultPath || typeof vaultPath !== 'string') return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    const scan = await scanVault(vaultPath);
    const state = await ensureState(scan.vaultPath);
    const generated = Object.values(state.generatedQuestions).filter((q) => q.status === 'approved').map((q) => ({
      id: q.id,
      vaultPath: scan.vaultPath,
      noteId: q.noteId,
      noteTitle: q.noteTitle,
      notePath: q.notePath,
      folder: q.folder,
      question: q.question,
      answer: q.answer,
      tags: [],
      origin: 'generated' as const,
      approved: true,
    }));
    const questions = selectQuestions({ questions: [...scan.questions, ...generated], state, mode: mode as StudyMode, folder, limit: Number(limit) || 10 });
    const session = createSession(scan.vaultPath, mode as StudyMode, questions);
    state.sessions.unshift(session);
    await import('../../../../lib/store/state').then(({ saveState }) => saveState(scan.vaultPath, state));
    return NextResponse.json({ session, questions });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
