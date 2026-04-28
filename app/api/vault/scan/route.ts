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
    const folders = [...new Set(scan.notes.map((n) => n.folder).filter(Boolean))].sort();
    const dueCount = scan.questions.filter((q) => isDue(state.schedules[q.id])).length;
    const weakCount = scan.questions.filter((q) => isWeak(state.schedules[q.id])).length;

    return NextResponse.json({
      vaultPath: scan.vaultPath,
      notes: scan.notes.map(({ content, ...note }) => note),
      questions: scan.questions,
      folders,
      stats: {
        noteCount: scan.notes.length,
        questionCount: scan.questions.length,
        folderCount: folders.length,
        dueCount,
        weakCount,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
