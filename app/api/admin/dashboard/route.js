import { NextResponse } from "next/server";
import { Query, databases, ids } from "../../../../lib/server-appwrite";
import { isAdmin } from "../../../../lib/auth";
import { cleanQuestionForClient, getOrCreateSession, listQuestions } from "../../../../lib/server-quiz";
import { QUIZ_RULES } from "../../../../lib/rules";
import { applyQuestionOrder, runtimeState } from "../../../../lib/runtime-state";

export async function GET() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [session, participantsRes, allQuestions] = await Promise.all([
      getOrCreateSession(),
      databases.listDocuments(ids.databaseId, ids.participants, [Query.orderDesc("score"), Query.limit(500)]),
      listQuestions(),
    ]);

    const cappedQuestions = allQuestions.slice(0, QUIZ_RULES.totalQuestions);
    const questions = applyQuestionOrder(cappedQuestions);

    const participants = participantsRes.documents.map((d) => ({
      id: d.$id,
      name: d.name,
      score: d.score || 0,
      lastAnsweredIndex: d.lastAnsweredIndex,
    }));

    const currentQuestion = questions[session.currentQuestionIndex] || null;

    return NextResponse.json({
      ok: true,
      session,
      participants,
      rules: {
        ...QUIZ_RULES,
        negativeMarking: runtimeState.negativeMarking,
      },
      finalRound: runtimeState.finalRound,
      currentRound: runtimeState.currentRound,
      goldenQuestionId: runtimeState.goldenQuestionId || null,
      questions: questions.map((q) => {
        const clean = cleanQuestionForClient(q);
        return {
          id: q.$id,
          order: q.order,
          question: clean.question,
          imageUrl: clean.imageUrl || "",
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          correctOption: Number(q.correctOption),
          timeLimit: q.timeLimit,
          isGoldenCandidate: clean.isGoldenCandidate,
        };
      }),
      currentQuestion: cleanQuestionForClient(currentQuestion),
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
