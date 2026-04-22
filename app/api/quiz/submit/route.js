import { NextResponse } from "next/server";
import { databases, ids } from "../../../../lib/server-appwrite";
import { getParticipantAuth } from "../../../../lib/auth";
import { getOrCreateSession, listQuestions } from "../../../../lib/server-quiz";
import { QUIZ_RULES } from "../../../../lib/rules";
import { applyQuestionOrder, runtimeState } from "../../../../lib/runtime-state";

export async function POST(req) {
  try {
    const auth = await getParticipantAuth();
    if (!auth) {
      return NextResponse.json({ error: "Not joined" }, { status: 401 });
    }

    const body = await req.json();
    const optionIndex = Number(body?.optionIndex);

    const [participant, session, allQuestions] = await Promise.all([
      databases.getDocument(ids.databaseId, ids.participants, auth.id),
      getOrCreateSession(),
      listQuestions(),
    ]);

    if (participant.token !== auth.token) {
      return NextResponse.json({ error: "Invalid participant auth" }, { status: 403 });
    }

    if (runtimeState.currentRound !== "quiz" || session.status !== "live") {
      return NextResponse.json({ error: "Quiz not live" }, { status: 400 });
    }

    if (participant.lastAnsweredIndex === session.currentQuestionIndex) {
      return NextResponse.json({ ok: true, alreadyAnswered: true, score: participant.score || 0 });
    }

    const cappedQuestions = allQuestions.slice(0, QUIZ_RULES.totalQuestions);
    const questions = applyQuestionOrder(cappedQuestions);
    const question = questions[session.currentQuestionIndex];
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 400 });
    }

    const endedAtMs = session?.questionEndsAt ? new Date(session.questionEndsAt).getTime() : 0;
    const questionTimedOut = endedAtMs > 0 && Date.now() >= endedAtMs;
    const timedOut = optionIndex === -1 || questionTimedOut;
    const isCorrect = !timedOut && optionIndex === question.correctOption;
    const isGolden = runtimeState.goldenQuestionId && question.$id === runtimeState.goldenQuestionId;

    let points = 0;
    if (isCorrect) points = isGolden ? QUIZ_RULES.goldenCorrectPoints : QUIZ_RULES.correctPoints;
    else if (!timedOut) points = isGolden ? QUIZ_RULES.goldenWrongPoints : QUIZ_RULES.wrongPoints;

    const updated = await databases.updateDocument(ids.databaseId, ids.participants, participant.$id, {
      score: (participant.score || 0) + points,
      lastAnsweredIndex: session.currentQuestionIndex,
      finished: session.currentQuestionIndex >= questions.length - 1,
    });

    return NextResponse.json({
      ok: true,
      isCorrect,
      timedOut,
      points,
      isGolden,
      score: updated.score || 0,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Submit failed" }, { status: 500 });
  }
}
