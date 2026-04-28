'use client';

import { useMemo, useState } from 'react';
import type { AiGrade, GeneratedQuestion, RecallQuestion, ReviewRating, StudySessionSummary, VaultNote, VaultScanResult } from '../lib/types';

type ScanWithGenerated = VaultScanResult & { generatedQuestions?: GeneratedQuestion[] };
type Session = { session: StudySessionSummary; questions: RecallQuestion[] };
const defaultPath = '/Users/prawal-mini/.openclaw/workspace/KnowledgeBank';

export default function Home() {
  const [vaultPath, setVaultPath] = useState(defaultPath);
  const [scan, setScan] = useState<ScanWithGenerated | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState('due');
  const [folder, setFolder] = useState('');
  const [limit, setLimit] = useState(10);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [selectedNote, setSelectedNote] = useState('');
  const [generationCount, setGenerationCount] = useState(6);
  const [grade, setGrade] = useState<AiGrade | null>(null);
  const [loading, setLoading] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const current = session?.questions[index];
  const pending = (scan?.generatedQuestions ?? []).filter((q) => q.status === 'pending');
  const approvedCount = (scan?.generatedQuestions ?? []).filter((q) => q.status === 'approved').length;
  const notesWithoutQuestions = useMemo(() => {
    if (!scan) return [] as VaultNote[];
    const counts = new Map<string, number>();
    scan.questions.forEach((q) => counts.set(q.noteId, (counts.get(q.noteId) ?? 0) + 1));
    return scan.notes.filter((n) => !counts.get(n.id)).slice(0, 80);
  }, [scan]);

  async function scanVault(showMessage = true) {
    setLoading('scan'); setError(''); if (showMessage) setMessage('');
    try {
      const res = await fetch('/api/vault/scan', { method: 'POST', body: JSON.stringify({ vaultPath }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setScan(data); setVaultPath(data.vaultPath);
      if (showMessage) setMessage('Vault indexed. Choose a review, generate questions, or inspect weak areas.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to scan vault'); }
    finally { setLoading(''); }
  }

  async function saveSettings() {
    setLoading('settings'); setError(''); setMessage('');
    try {
      const res = await fetch('/api/settings', { method: 'POST', body: JSON.stringify({ vaultPath, aiSettings: { provider: 'openai', apiKey, model } }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage('AI settings saved locally inside the vault state.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save settings'); }
    finally { setLoading(''); }
  }

  async function testProvider() {
    setLoading('test'); setError(''); setMessage('');
    try {
      await saveSettings();
      const res = await fetch('/api/ai/test', { method: 'POST', body: JSON.stringify({ vaultPath }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`AI provider connected: ${data.message}`);
    } catch (e) { setError(e instanceof Error ? e.message : 'Provider test failed'); }
    finally { setLoading(''); }
  }

  async function generateQuestions() {
    if (!selectedNote) return setError('Choose a note first.');
    setLoading('generate'); setError(''); setMessage('');
    try {
      const res = await fetch('/api/ai/generate', { method: 'POST', body: JSON.stringify({ vaultPath, noteId: selectedNote, count: generationCount }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessage(`Generated ${data.generated.length} draft questions. Review and approve them below.`);
      await scanVault(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Question generation failed'); }
    finally { setLoading(''); }
  }

  async function updateGenerated(q: GeneratedQuestion, status: 'approved' | 'discarded' | 'pending') {
    setLoading(q.id); setError('');
    try {
      const res = await fetch('/api/ai/approve', { method: 'POST', body: JSON.stringify({ vaultPath, questionId: q.id, status, question: q.question, answer: q.answer }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await scanVault(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update generated question'); }
    finally { setLoading(''); }
  }

  async function startSession(selectedMode = mode) {
    setLoading('session'); setError(''); setMessage(''); setRevealed(false); setAnswer(''); setIndex(0); setGrade(null);
    try {
      const res = await fetch('/api/study/start', { method: 'POST', body: JSON.stringify({ vaultPath, mode: selectedMode, folder: folder || undefined, limit }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSession(data);
      if (!data.questions.length) setMessage('No questions found. Try All Questions or generate questions for notes without prompts.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to start session'); }
    finally { setLoading(''); }
  }

  async function gradeWithAI() {
    if (!current) return;
    setLoading('grade'); setError(''); setGrade(null);
    try {
      const res = await fetch('/api/ai/grade', { method: 'POST', body: JSON.stringify({ vaultPath, questionId: current.id, userAnswer: answer }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setGrade(data.grade);
      setRevealed(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'AI grading failed'); }
    finally { setLoading(''); }
  }

  async function rate(rating: ReviewRating) {
    if (!session || !current) return;
    setLoading('rate'); setError('');
    try {
      const last = index === session.questions.length - 1;
      const res = await fetch('/api/study/answer', { method: 'POST', body: JSON.stringify({ vaultPath, sessionId: session.session.id, questionId: current.id, rating, answerText: answer, finish: last }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (last) { setMessage('Session complete. Markdown log written to your vault.'); setSession(null); await scanVault(false); }
      else { setIndex((i) => i + 1); setAnswer(''); setRevealed(false); setGrade(null); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save answer'); }
    finally { setLoading(''); }
  }

  return (
    <main className="shell">
      <section className="topbar">
        <div><div className="mark">VR</div></div>
        <div className="brand"><span>VaultRecall</span><small>Local-first active recall for Markdown vaults</small></div>
        <button className="ghost" onClick={() => scanVault()} disabled={loading === 'scan'}>{loading === 'scan' ? 'Indexing…' : 'Scan vault'}</button>
      </section>

      <section className="heroPanel fadeIn">
        <div>
          <p className="kicker">Batman-grade study cockpit</p>
          <h1>Stop browsing. Start recalling.</h1>
          <p>Generate questions, review weak concepts, grade answers with AI, and keep your Markdown vault as the source of truth.</p>
        </div>
        <div className="vaultBox">
          <label>Vault path</label>
          <input value={vaultPath} onChange={(e) => setVaultPath(e.target.value)} placeholder="/absolute/path/to/vault" />
          <p className="hint">AI actions send selected note content to your configured provider only when you click them.</p>
        </div>
      </section>

      {error && <div className="toast error">{error}</div>}
      {message && <div className="toast success">{message}</div>}

      {scan && <section className="metrics fadeIn">
        <Metric value={scan.stats.noteCount} label="Notes" />
        <Metric value={scan.stats.questionCount} label="Questions" />
        <Metric value={scan.stats.dueCount} label="Due" />
        <Metric value={scan.stats.weakCount} label="Weak" />
        <Metric value={approvedCount} label="AI-approved" />
      </section>}

      <section className="workspace">
        <div className="panel studyPanel">
          <div className="panelHeader"><h2>Study</h2><span>{session ? `${Math.min(index + 1, session.questions.length)} / ${session.questions.length}` : 'Ready'}</span></div>
          {!session ? <div className="stack">
            <div className="segmented">
              {['due', 'weak', 'all', 'folder'].map((m) => <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>{m}</button>)}
            </div>
            {mode === 'folder' && <select value={folder} onChange={(e) => setFolder(e.target.value)}><option value="">Choose folder</option>{scan?.folders.map((f) => <option key={f}>{f}</option>)}</select>}
            <label>Questions <input type="number" min="1" max="50" value={limit} onChange={(e) => setLimit(Number(e.target.value))} /></label>
            <button className="primary" disabled={!scan || loading === 'session'} onClick={() => startSession()}>{loading === 'session' ? 'Preparing…' : 'Start session'}</button>
          </div> : current && <div className="sessionCard slideUp">
            <div className="badges"><span>{current.noteTitle}</span><span>{current.origin ?? 'note'}</span></div>
            <h3>{current.question}</h3>
            <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer first. Then reveal or ask AI to grade." />
            <div className="actions"><button className="ghost" onClick={() => setRevealed((v) => !v)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button><button className="ghost" onClick={gradeWithAI} disabled={loading === 'grade'}>{loading === 'grade' ? 'Grading…' : 'Grade with AI'}</button></div>
            {revealed && <div className="answerBox"><strong>Expected answer</strong><p>{current.answer}</p></div>}
            {grade && <div className="gradeBox"><strong>AI grade: {grade.score}/100 — {grade.suggestedRating}</strong><p>{grade.summary}</p>{grade.missing.length > 0 && <p><b>Missing:</b> {grade.missing.join('; ')}</p>}<p><b>Ideal:</b> {grade.idealAnswer}</p></div>}
            <div className="ratingGrid"><button onClick={() => rate('again')}>Again</button><button onClick={() => rate('hard')}>Hard</button><button onClick={() => rate('good')}>Good</button><button onClick={() => rate('easy')}>Easy</button>{grade && <button className="primary" onClick={() => rate(grade.suggestedRating)}>Use AI rating</button>}</div>
          </div>}
        </div>

        <div className="panel">
          <div className="panelHeader"><h2>AI generation</h2><span>{pending.length} pending</span></div>
          <div className="stack">
            <label>OpenAI API key <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-..." /></label>
            <label>Model <input value={model} onChange={(e) => setModel(e.target.value)} /></label>
            <div className="actions"><button className="ghost" onClick={saveSettings}>Save</button><button className="ghost" onClick={testProvider}>Test</button></div>
            <label>Note <select value={selectedNote} onChange={(e) => setSelectedNote(e.target.value)}><option value="">Choose note</option>{(notesWithoutQuestions.length ? notesWithoutQuestions : scan?.notes ?? []).map((n) => <option key={n.id} value={n.id}>{n.relativePath}</option>)}</select></label>
            <label>Count <input type="number" min="1" max="12" value={generationCount} onChange={(e) => setGenerationCount(Number(e.target.value))} /></label>
            <button className="primary" disabled={!scan || loading === 'generate'} onClick={generateQuestions}>{loading === 'generate' ? 'Generating…' : 'Generate draft questions'}</button>
          </div>
        </div>
      </section>

      {pending.length > 0 && <section className="panel fadeIn"><div className="panelHeader"><h2>Approval queue</h2><span>App-state only by default</span></div><div className="queue">{pending.map((q) => <DraftCard key={q.id} q={q} busy={loading === q.id} onUpdate={updateGenerated} />)}</div></section>}
    </main>
  );
}

function Metric({ value, label }: { value: number; label: string }) { return <div className="metric"><strong>{value}</strong><span>{label}</span></div>; }

function DraftCard({ q, busy, onUpdate }: { q: GeneratedQuestion; busy: boolean; onUpdate: (q: GeneratedQuestion, status: 'approved' | 'discarded' | 'pending') => void }) {
  const [draft, setDraft] = useState(q);
  return <div className="draft"><div className="badges"><span>{q.noteTitle}</span><span>{q.type}</span></div><input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} /><textarea value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} /><div className="actions"><button className="primary" disabled={busy} onClick={() => onUpdate(draft, 'approved')}>Approve</button><button className="ghost" disabled={busy} onClick={() => onUpdate(draft, 'discarded')}>Discard</button></div></div>;
}
