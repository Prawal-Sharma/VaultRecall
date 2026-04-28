import { NextRequest, NextResponse } from 'next/server';
import { ensureState, saveState } from '../../../lib/store/state';
import type { AiSettings } from '../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath, aiSettings } = await req.json();
    if (!vaultPath || typeof vaultPath !== 'string') return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    const state = await ensureState(vaultPath);
    if (aiSettings) {
      state.aiSettings = {
        provider: 'openai',
        model: String((aiSettings as AiSettings).model || 'gpt-4o-mini'),
        apiKey: (aiSettings as AiSettings).apiKey ? String((aiSettings as AiSettings).apiKey) : state.aiSettings?.apiKey,
      };
      await saveState(vaultPath, state);
    }
    return NextResponse.json({ aiSettings: state.aiSettings ? { ...state.aiSettings, apiKey: state.aiSettings.apiKey ? '••••••••' : '' } : undefined });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
