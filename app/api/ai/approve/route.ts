import { NextRequest, NextResponse } from 'next/server';
import { ensureState, saveState } from '../../../../lib/store/state';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, questionId, status, question, answer } = await req.json();
    if (!vaultPath || !questionId || !['approved', 'discarded', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'vaultPath, questionId, and valid status are required' }, { status: 400 });
    }
    const state = await ensureState(vaultPath);
    const generated = state.generatedQuestions[questionId];
    if (!generated) return NextResponse.json({ error: 'Generated question not found' }, { status: 404 });
    generated.status = status;
    if (typeof question === 'string') generated.question = question;
    if (typeof answer === 'string') generated.answer = answer;
    await saveState(vaultPath, state);
    return NextResponse.json({ generated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
