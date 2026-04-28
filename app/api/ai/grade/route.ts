import { NextRequest, NextResponse } from 'next/server';
import { scanVault } from '../../../../lib/vault/scanner';
import { ensureState } from '../../../../lib/store/state';
import { gradeAnswer } from '../../../../lib/ai/openai';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, questionId, userAnswer } = await req.json();
    if (!vaultPath || !questionId || typeof userAnswer !== 'string') return NextResponse.json({ error: 'vaultPath, questionId, and userAnswer are required' }, { status: 400 });
    const scan = await scanVault(vaultPath);
    const state = await ensureState(scan.vaultPath);
    if (!state.aiSettings) return NextResponse.json({ error: 'AI settings are missing' }, { status: 400 });
    const approved = Object.values(state.generatedQuestions).filter((q) => q.status === 'approved').map((q) => ({
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
    const question = [...scan.questions, ...approved].find((q) => q.id === questionId);
    if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const note = scan.notes.find((n) => n.id === question.noteId);
    const grade = await gradeAnswer(state.aiSettings, {
      question: question.question,
      expectedAnswer: question.answer,
      userAnswer,
      noteExcerpt: note?.content.slice(0, 6000),
    });
    return NextResponse.json({ grade });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
