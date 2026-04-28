export type VaultNote = {
  id: string;
  title: string;
  path: string;
  relativePath: string;
  folder: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  wikilinks: string[];
  headings: string[];
  content: string;
};

export type RecallQuestion = {
  id: string;
  vaultPath: string;
  noteId: string;
  noteTitle: string;
  notePath: string;
  folder: string;
  question: string;
  answer: string;
  sourceHeading?: string;
  tags: string[];
};

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export type ReviewRecord = {
  questionId: string;
  rating: ReviewRating;
  answeredAt: string;
  answerText?: string;
};

export type QuestionSchedule = {
  questionId: string;
  lastReviewed?: string;
  nextReview: string;
  rating?: ReviewRating;
  intervalDays: number;
  ease: number;
  attempts: number;
  misses: number;
};

export type VaultState = {
  vaultPath: string;
  indexedAt?: string;
  schedules: Record<string, QuestionSchedule>;
  reviews: ReviewRecord[];
  sessions: StudySessionSummary[];
};

export type StudySessionSummary = {
  id: string;
  startedAt: string;
  endedAt?: string;
  vaultPath: string;
  mode: StudyMode;
  totalQuestions: number;
  answered: number;
  ratings: Record<ReviewRating, number>;
  questionIds: string[];
};

export type StudyMode = 'all' | 'due' | 'weak' | 'folder';

export type VaultScanResult = {
  vaultPath: string;
  notes: VaultNote[];
  questions: RecallQuestion[];
  folders: string[];
  stats: {
    noteCount: number;
    questionCount: number;
    folderCount: number;
    dueCount: number;
    weakCount: number;
  };
};
