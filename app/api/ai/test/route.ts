import { NextRequest, NextResponse } from 'next/server';
import { ensureState } from '../../../../lib/store/state';
import { testOpenAI } from '../../../../lib/ai/openai';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath } = await req.json();
    if (!vaultPath) return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    const state = await ensureState(vaultPath);
    if (!state.aiSettings) return NextResponse.json({ error: 'AI settings are missing' }, { status: 400 });
    const result = await testOpenAI(state.aiSettings);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
