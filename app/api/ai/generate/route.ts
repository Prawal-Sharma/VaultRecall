import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { scanVault } from '../../../../lib/vault/scanner';
import { ensureState, saveState } from '../../../../lib/store/state';
import { generateQuestions } from '../../../../lib/ai/openai';
import type { GeneratedQuestion } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, noteId, count = 6 } = await req.json();
    if (!vaultPath || !noteId) return NextResponse.json({ error: 'vaultPath and noteId are required' }, { status: 400 });
    const scan = await scanVault(vaultPath);
    const note = scan.notes.find((n) => n.id === noteId);
    if (!note) return NextResponse.json({ error: 'Note not found' }, { status: 404 });
    const state = await ensureState(scan.vaultPath);
    if (!state.aiSettings) return NextResponse.json({ error: 'AI settings are missing' }, { status: 400 });
    const createdAt = new Date().toISOString();
    const raw = await generateQuestions(state.aiSettings, note, Number(count) || 6);
    const generated: GeneratedQuestion[] = raw.map((q) => ({
      id: crypto.createHash('sha1').update(`${note.relativePath}:${q.question}:${createdAt}`).digest('hex').slice(0, 16),
      vaultPath: scan.vaultPath,
      noteId: note.id,
      noteTitle: note.title,
      notePath: note.relativePath,
      folder: note.folder,
      type: q.type,
      question: q.question,
      answer: q.answer,
      status: 'pending',
      createdAt,
    }));
    for (const q of generated) state.generatedQuestions[q.id] = q;
    await saveState(scan.vaultPath, state);
    return NextResponse.json({ generated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
