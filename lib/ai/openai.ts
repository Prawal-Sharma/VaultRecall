import type { AiGrade, AiSettings, GeneratedQuestion, ReviewRating, VaultNote } from '../types';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function stripCodeFence(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
}

async function callOpenAI(settings: AiSettings, messages: { role: 'system' | 'user'; content: string }[]) {
  if (!settings.apiKey) throw new Error('OpenAI API key is missing. Add it in Settings first.');
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model || 'gpt-4o-mini',
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'OpenAI request failed.');
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenAI returned no content.');
  return JSON.parse(stripCodeFence(content));
}

export async function testOpenAI(settings: AiSettings) {
  const data = await callOpenAI(settings, [
    { role: 'system', content: 'Return only valid JSON.' },
    { role: 'user', content: 'Return {"ok":true,"message":"connected"}.' },
  ]);
  return { ok: Boolean(data.ok), message: String(data.message ?? 'connected') };
}

export async function generateQuestions(settings: AiSettings, note: VaultNote, count = 6): Promise<Omit<GeneratedQuestion, 'id' | 'vaultPath' | 'noteId' | 'noteTitle' | 'notePath' | 'folder' | 'status' | 'createdAt'>[]> {
  const content = note.content.slice(0, 12000);
  const data = await callOpenAI(settings, [
    {
      role: 'system',
      content: 'You create high-quality active recall questions from Markdown notes. Return strict JSON with a questions array. Each item must have type, question, and answer. Types allowed: recall, explain, scenario, compare. Prefer practical understanding over trivia.',
    },
    {
      role: 'user',
      content: `Create ${count} active recall questions from this note. Note title: ${note.title}\n\nMarkdown:\n${content}\n\nReturn JSON: {"questions":[{"type":"recall|explain|scenario|compare","question":"...","answer":"..."}]}`,
    },
  ]);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const mapped: Omit<GeneratedQuestion, 'id' | 'vaultPath' | 'noteId' | 'noteTitle' | 'notePath' | 'folder' | 'status' | 'createdAt'>[] = questions.slice(0, count).map((q: Record<string, unknown>) => ({
    type: ['recall', 'explain', 'scenario', 'compare'].includes(String(q.type)) ? q.type as 'recall' | 'explain' | 'scenario' | 'compare' : 'recall',
    question: String(q.question ?? '').trim(),
    answer: String(q.answer ?? '').trim(),
  }));
  return mapped.filter((q) => q.question && q.answer);
}

export async function gradeAnswer(settings: AiSettings, args: { question: string; expectedAnswer: string; userAnswer: string; noteExcerpt?: string }): Promise<AiGrade> {
  const data = await callOpenAI(settings, [
    {
      role: 'system',
      content: 'You grade active recall answers. Be fair but demanding. Return strict JSON only: score number 0-100, summary string, correct string array, missing string array, idealAnswer string, suggestedRating one of again/hard/good/easy.',
    },
    {
      role: 'user',
      content: `Question: ${args.question}\n\nExpected answer/source guidance:\n${args.expectedAnswer}\n\nUser answer:\n${args.userAnswer}\n\nRelated note excerpt:\n${args.noteExcerpt ?? ''}`,
    },
  ]);
  const suggested = String(data.suggestedRating ?? 'good') as ReviewRating;
  return {
    score: Math.max(0, Math.min(100, Number(data.score ?? 0))),
    summary: String(data.summary ?? ''),
    correct: Array.isArray(data.correct) ? data.correct.map(String) : [],
    missing: Array.isArray(data.missing) ? data.missing.map(String) : [],
    idealAnswer: String(data.idealAnswer ?? args.expectedAnswer),
    suggestedRating: ['again', 'hard', 'good', 'easy'].includes(suggested) ? suggested : 'good',
  };
}
