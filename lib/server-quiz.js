import { databases, ids, Query } from "./server-appwrite";
import { QUIZ_RULES } from "./rules";

const GOLDEN_PREFIX = "[GOLDEN]";

export async function listQuestions() {
  const res = await databases.listDocuments(ids.databaseId, ids.questions, [Query.orderAsc("order"), Query.limit(500)]);
  return res.documents;
}

export async function getSession() {
  return databases.getDocument(ids.databaseId, ids.session, ids.sessionDocId);
}

export async function getOrCreateSession() {
  try {
    return await getSession();
  } catch {
    return databases.createDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "waiting",
      currentQuestionIndex: 0,
    });
  }
}

function clampQuestionSeconds(value) {
  return Math.max(QUIZ_RULES.minSeconds, Math.min(QUIZ_RULES.maxSeconds, Number(value || QUIZ_RULES.minSeconds)));
}

export async function syncQuizSessionProgress(session, questions) {
  if (!session || session.status !== "live" || !questions?.length) return session;

  const questionEndsAtMs = session.questionEndsAt ? new Date(session.questionEndsAt).getTime() : 0;
  if (!questionEndsAtMs) return session;

  const revealEndsAtMs = questionEndsAtMs + QUIZ_RULES.revealSeconds * 1000;
  if (Date.now() < revealEndsAtMs) return session;

  const currentIndex = Number(session.currentQuestionIndex || 0);
  const nextIndex = currentIndex + 1;

  if (nextIndex >= questions.length) {
    await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "ended",
      questionEndsAt: null,
    });
    return {
      ...session,
      status: "ended",
      questionEndsAt: null,
    };
  }

  const nextSeconds = clampQuestionSeconds(questions[nextIndex]?.timeLimit);
  const updatedSession = await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
    status: "live",
    currentQuestionIndex: nextIndex,
    questionEndsAt: new Date(Date.now() + nextSeconds * 1000).toISOString(),
  });

  return updatedSession;
}

export function cleanQuestionForClient(question) {
  if (!question) return null;
  const raw = String(question.question || "");
  const isGoldenCandidate = raw.trimStart().startsWith(GOLDEN_PREFIX);
  const cleanQuestion = isGoldenCandidate ? raw.replace(GOLDEN_PREFIX, "").trimStart() : raw;
  return {
    id: question.$id,
    question: cleanQuestion,
    imageUrl: normalizeImageUrl(question.imageUrl),
    optionA: question.optionA,
    optionB: question.optionB,
    optionC: question.optionC,
    optionD: question.optionD,
    timeLimit: question.timeLimit,
    order: question.order,
    isGoldenCandidate,
  };
}

export function normalizeImageUrl(imageUrl) {
  const raw = String(imageUrl || "").trim();
  if (!raw) return "";
  if (raw.startsWith("/api/media/")) return raw;

  // raw Appwrite file id pasted directly in admin form
  if (/^[A-Za-z0-9][A-Za-z0-9._-]{5,}$/.test(raw) && !raw.includes("/")) {
    return `/api/media/${raw}`;
  }

  // full Appwrite storage URLs (view/preview/download)
  const anyStorageFileMatch = raw.match(/\/storage\/buckets\/[^/]+\/files\/([^/]+)\//i);
  if (anyStorageFileMatch?.[1]) {
    return `/api/media/${anyStorageFileMatch[1]}`;
  }

  // query form: ?fileId=<id>
  const fileIdQueryMatch = raw.match(/[?&]fileId=([^&]+)/i);
  if (fileIdQueryMatch?.[1]) {
    return `/api/media/${decodeURIComponent(fileIdQueryMatch[1])}`;
  }

  const match = raw.match(/\/storage\/buckets\/[^/]+\/files\/([^/]+)\/view/i);
  if (match?.[1]) {
    return `/api/media/${match[1]}`;
  }
  return raw;
}

function seededNumber(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function deterministicShuffle(arr, seedStr) {
  const out = [...arr];
  let seed = seededNumber(seedStr);
  for (let i = out.length - 1; i > 0; i--) {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildParticipantQuestionView(question, participantId) {
  if (!question) return null;
  const clean = cleanQuestionForClient(question);
  const options = [
    { id: 0, text: question.optionA },
    { id: 1, text: question.optionB },
    { id: 2, text: question.optionC },
    { id: 3, text: question.optionD },
  ];
  const shuffled = deterministicShuffle(options, `${participantId}:${question.$id}`);
  return {
    ...clean,
    options: shuffled,
  };
}

export function isGoldenCandidateQuestion(question) {
  const raw = String(question?.question || "");
  return raw.trimStart().startsWith(GOLDEN_PREFIX);
}

export function markGoldenPrefix(questionText) {
  const text = String(questionText || "").trim();
  if (!text) return "";
  if (text.startsWith(GOLDEN_PREFIX)) return text;
  return `${GOLDEN_PREFIX} ${text}`;
}
