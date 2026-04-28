import { NextRequest, NextResponse } from 'next/server';
import { ensureState } from '../../../lib/store/state';

export async function POST(req: NextRequest) {
  try {
    const { vaultPath } = await req.json();
    if (!vaultPath || typeof vaultPath !== 'string') return NextResponse.json({ error: 'vaultPath is required' }, { status: 400 });
    const state = await ensureState(vaultPath);
    return NextResponse.json({ sessions: state.sessions.slice(0, 20), schedules: state.schedules, reviews: state.reviews.slice(-100) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
