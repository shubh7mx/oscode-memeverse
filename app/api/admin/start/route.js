import { NextResponse } from "next/server";
import { Query, databases, ids } from "../../../../lib/server-appwrite";
import { isAdmin } from "../../../../lib/auth";
import { getOrCreateSession, isGoldenCandidateQuestion, listQuestions } from "../../../../lib/server-quiz";
import { QUIZ_RULES } from "../../../../lib/rules";
import { applyQuestionOrder, resetFinalRound, resetGoldenQuestion, runtimeState, setRandomQuestionOrder } from "../../../../lib/runtime-state";

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allQuestions = await listQuestions();
    const questions = allQuestions.slice(0, QUIZ_RULES.totalQuestions);
    if (!questions.length) {
      return NextResponse.json({ error: "No questions" }, { status: 400 });
    }

    await getOrCreateSession();
    runtimeState.currentRound = "quiz";
    resetFinalRound();
    resetGoldenQuestion();
    setRandomQuestionOrder(questions);
    const orderedQuestions = applyQuestionOrder(questions);

    const goldenCandidates = orderedQuestions.filter((q) => isGoldenCandidateQuestion(q));
    if (goldenCandidates.length) {
      const randomIndex = Math.floor(Math.random() * goldenCandidates.length);
      runtimeState.goldenQuestionId = goldenCandidates[randomIndex].$id;
    }

    const participants = await databases.listDocuments(ids.databaseId, ids.participants, [Query.limit(500)]);
    await Promise.all(participants.documents.map((p) =>
      databases.updateDocument(ids.databaseId, ids.participants, p.$id, {
        score: 0,
        lastAnsweredIndex: -1,
        finished: false,
      }),
    ));

    const now = Date.now();
    const firstSeconds = Math.max(QUIZ_RULES.minSeconds, Math.min(QUIZ_RULES.maxSeconds, Number(orderedQuestions[0].timeLimit || QUIZ_RULES.minSeconds)));

    await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "live",
      currentQuestionIndex: 0,
      questionEndsAt: new Date(now + firstSeconds * 1000).toISOString(),
    });

    return NextResponse.json({
      ok: true,
      questionCount: orderedQuestions.length,
      goldenQuestionId: runtimeState.goldenQuestionId || null,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Start failed" }, { status: 500 });
  }
}
