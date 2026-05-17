export interface AnswerOption {
  index: string;
  text: string;
}

export interface Question {
  testName: string;
  questionNumber: number;
  question: string;
  questionImageUrl: string | null;
  answerOptions: AnswerOption[];
  correctAnswer: string | null;
  explanation: string;
}

export interface Test {
  id: string;
  label: string;
  questions: Question[];
}

const M1_TEST_META: Record<string, { label: string; order: number }> = {
  "m1-practice-test-1": { label: "Practice Test 1", order: 1 },
  "m1-practice-test-2": { label: "Practice Test 2", order: 2 },
  "m1-practice-test-3": { label: "Practice Test 3", order: 3 },
  "m1-practice-test-4": { label: "Fines & Limits", order: 4 },
  "m1-practice-test-5": { label: "Road Sign Test", order: 5 },
};

const G1_TEST_META: Record<string, { label: string; order: number }> = {
  "g1-practice-test-1": { label: "Practice Test 1", order: 1 },
  "g1-practice-test-2": { label: "Practice Test 2", order: 2 },
  "g1-practice-test-3": { label: "Practice Test 3", order: 3 },
};

export const M1_BANK_KEY = "m1-missed";
export const G1_BANK_KEY = "g1-missed";

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function questionId(q: Question): string {
  return `${q.testName}-${q.questionNumber}`;
}

export function getBankQuestions(bankKey = M1_BANK_KEY): Question[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(bankKey) || "[]");
  } catch {
    return [];
  }
}

export function updateBank(question: Question, correct: boolean, bankKey = M1_BANK_KEY): void {
  if (typeof window === "undefined") return;
  const bank = getBankQuestions(bankKey);
  const id = questionId(question);
  const updated = correct
    ? bank.filter((q) => questionId(q) !== id)
    : bank.some((q) => questionId(q) === id)
    ? bank
    : [...bank, question];
  localStorage.setItem(bankKey, JSON.stringify(updated));
}

async function fetchQuestions(dataFile: string): Promise<Question[]> {
  const res = await fetch(dataFile);
  const raw = await res.json();
  return raw.map(({ testName, questionNumber, question, questionImageUrl, answerOptions, correctAnswer, explanation }: Question) => ({
    testName,
    questionNumber,
    question,
    questionImageUrl,
    answerOptions,
    correctAnswer,
    explanation,
  }));
}

function groupIntoTests(
  all: Question[],
  meta: Record<string, { label: string; order: number }>
): Test[] {
  const grouped = new Map<string, Question[]>();
  for (const q of all) {
    if (!grouped.has(q.testName)) grouped.set(q.testName, []);
    grouped.get(q.testName)!.push(q);
  }
  return [...grouped.entries()]
    .map(([id, questions]) => ({
      id,
      label: meta[id]?.label ?? id,
      questions,
    }))
    .sort((a, b) => (meta[a.id]?.order ?? 99) - (meta[b.id]?.order ?? 99));
}

export async function getAllQuestions(): Promise<Question[]> {
  return fetchQuestions("/data/all-questions.json");
}

export async function getG1AllQuestions(): Promise<Question[]> {
  return fetchQuestions("/data/g1-all-questions.json");
}

export async function getTests(): Promise<Test[]> {
  return groupIntoTests(await getAllQuestions(), M1_TEST_META);
}

export async function getG1Tests(): Promise<Test[]> {
  return groupIntoTests(await getG1AllQuestions(), G1_TEST_META);
}
