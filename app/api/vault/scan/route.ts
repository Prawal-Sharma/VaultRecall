import { NextRequest, NextResponse } from 'next/server';
import { scanVault } from '../../../../lib/vault/scanner';
import { ensureState, isDue, isWeak } from '../../../../lib/store/state';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath } = await req.json();
    if (!vaultPath || typeof vaultPath !== 'string') {
      return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    }
    const scan = await scanVault(vaultPath);
    const state = await ensureState(scan.vaultPath);
    state.indexedAt = new Date().toISOString();
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
    const questions = [...scan.questions, ...generated];
    const folders = [...new Set(scan.notes.map((n) => n.folder).filter(Boolean))].sort();
    const dueCount = questions.filter((q) => isDue(state.schedules[q.id])).length;
    const weakCount = questions.filter((q) => isWeak(state.schedules[q.id])).length;

    return NextResponse.json({
      vaultPath: scan.vaultPath,
      notes: scan.notes.map(({ content, ...note }) => note),
      questions,
      generatedQuestions: Object.values(state.generatedQuestions),
      folders,
      stats: {
        noteCount: scan.notes.length,
        questionCount: questions.length,
        folderCount: folders.length,
        dueCount,
        weakCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
