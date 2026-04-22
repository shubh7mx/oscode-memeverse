import { NextResponse } from "next/server";
import { databases, ids } from "../../../../lib/server-appwrite";
import { isAdmin } from "../../../../lib/auth";
import { getOrCreateSession, listQuestions } from "../../../../lib/server-quiz";
import { QUIZ_RULES } from "../../../../lib/rules";
import { applyQuestionOrder } from "../../../../lib/runtime-state";

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [session, allQuestions] = await Promise.all([getOrCreateSession(), listQuestions()]);
    const cappedQuestions = allQuestions.slice(0, QUIZ_RULES.totalQuestions);
    const questions = applyQuestionOrder(cappedQuestions);

    const nextIndex = Number(session.currentQuestionIndex || 0) + 1;
    if (nextIndex >= questions.length) {
      await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
        status: "ended",
        questionEndsAt: null,
      });
      return NextResponse.json({ ok: true, ended: true });
    }

    const now = Date.now();
    const nextSeconds = Math.max(QUIZ_RULES.minSeconds, Math.min(QUIZ_RULES.maxSeconds, Number(questions[nextIndex].timeLimit || QUIZ_RULES.minSeconds)));

    await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "live",
      currentQuestionIndex: nextIndex,
      questionEndsAt: new Date(now + nextSeconds * 1000).toISOString(),
    });

    return NextResponse.json({ ok: true, currentQuestionIndex: nextIndex });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Next failed" }, { status: 500 });
  }
}
