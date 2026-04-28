'use client';

import { useMemo, useState } from 'react';
import type { RecallQuestion, ReviewRating, StudySessionSummary, VaultScanResult } from '../lib/types';

type Session = { session: StudySessionSummary; questions: RecallQuestion[] };

const defaultPath = '/Users/prawal-mini/.openclaw/workspace/KnowledgeBank';

export default function Home() {
  const [vaultPath, setVaultPath] = useState(defaultPath);
  const [scan, setScan] = useState<VaultScanResult | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('due');
  const [folder, setFolder] = useState('');
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const current = session?.questions[index];
  const progress = session ? `${Math.min(index + 1, session.questions.length)} / ${session.questions.length}` : '0 / 0';
  const weakFolders = useMemo(() => scan?.folders.slice(0, 8) ?? [], [scan]);

  async function scanVault() {
    setLoading(true); setError(''); setMessage(''); setSession(null);
    try {
      const res = await fetch('/api/vault/scan', { method: 'POST', body: JSON.stringify({ vaultPath }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScan(data);
      setVaultPath(data.vaultPath);
      setMessage('Vault indexed successfully. The library has been bullied into becoming a gymnasium.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to scan vault'); }
    finally { setLoading(false); }
  }

  async function startSession(selectedMode = mode) {
    setLoading(true); setError(''); setMessage(''); setRevealed(false); setAnswer(''); setIndex(0);
    try {
      const res = await fetch('/api/study/start', { method: 'POST', body: JSON.stringify({ vaultPath, mode: selectedMode, folder: folder || undefined, limit }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSession(data);
      if (!data.questions.length) setMessage('No questions found for that session. Try All Questions or rescan the vault.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to start session'); }
    finally { setLoading(false); }
  }

  async function rate(rating: ReviewRating) {
    if (!session || !current) return;
    setLoading(true); setError('');
    try {
      const last = index === session.questions.length - 1;
      const res = await fetch('/api/study/answer', {
        method: 'POST',
        body: JSON.stringify({ vaultPath, sessionId: session.session.id, questionId: current.id, rating, answerText: answer, finish: last }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (last) {
        setMessage('Session complete. A Markdown log was written back into your vault. Splendidly accountable.');
        setSession(null);
        await scanVault();
      } else {
        setIndex((i) => i + 1);
        setAnswer('');
        setRevealed(false);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save answer'); }
    finally { setLoading(false); }
  }

  return (
    <main className="container">
      <section className="hero">
        <div>
          <div className="eyebrow">Local-first active recall</div>
          <h1>VaultRecall</h1>
          <p>Turn any Obsidian or Markdown vault into a focused recall system: scan notes, quiz yourself, schedule reviews, and write session logs back into the vault.</p>
        </div>
        <div className="card" style={{ minWidth: 320 }}>
          <label className="label">Vault folder path</label>
          <input className="input" value={vaultPath} onChange={(e) => setVaultPath(e.target.value)} />
          <div className="row section">
            <button className="btn" onClick={scanVault} disabled={loading}>{loading ? 'Working…' : 'Scan vault'}</button>
            <button className="btn secondary" onClick={() => startSession('due')} disabled={!scan || loading}>Review due</button>
          </div>
        </div>
      </section>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {scan && (
        <>
          <section className="grid grid-4 section">
            <Stat label="Notes indexed" value={scan.stats.noteCount} />
            <Stat label="Recall questions" value={scan.stats.questionCount} />
            <Stat label="Due now" value={scan.stats.dueCount} />
            <Stat label="Weak questions" value={scan.stats.weakCount} />
          </section>

          <section className="grid grid-2 section">
            <div className="card">
              <h2>Start a study session</h2>
              <div className="grid">
                <label className="label">Mode</label>
                <select className="select" value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="due">Due reviews</option>
                  <option value="weak">Weak areas</option>
                  <option value="all">All questions</option>
                  <option value="folder">Folder</option>
                </select>
                {mode === 'folder' && <><label className="label">Folder</label><select className="select" value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Choose folder</option>{scan.folders.map((f) => <option key={f} value={f}>{f}</option>)}</select></>}
                <label className="label">Question limit</label>
                <input className="input" type="number" min="1" max="50" value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
                <button className="btn" onClick={() => startSession()} disabled={loading}>Start session</button>
              </div>
            </div>
            <div className="card">
              <h2>Vault folders</h2>
              <div className="list">{weakFolders.map((f) => <div className="list-item" key={f}>{f}</div>)}</div>
            </div>
          </section>
        </>
      )}

      {session && current && (
        <section className="card section">
          <div className="row"><span className="badge">{progress}</span><span className="badge">{current.noteTitle}</span><span className="badge">{current.folder || 'root'}</span></div>
          <div className="question">{current.question}</div>
          <textarea className="textarea" placeholder="Type your answer before revealing the expected answer…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
          <div className="row section">
            <button className="btn secondary" onClick={() => setRevealed((v) => !v)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
          </div>
          {revealed && <div className="section"><div className="label">Expected answer / source guidance</div><div className="answer">{current.answer}</div></div>}
          {revealed && <div className="row section">
            <button className="btn danger" onClick={() => rate('again')} disabled={loading}>Again</button>
            <button className="btn warn" onClick={() => rate('hard')} disabled={loading}>Hard</button>
            <button className="btn good" onClick={() => rate('good')} disabled={loading}>Good</button>
            <button className="btn easy" onClick={() => rate('easy')} disabled={loading}>Easy</button>
          </div>}
        </section>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="card"><div className="stat">{value}</div><div className="label">{label}</div></div>;
}
