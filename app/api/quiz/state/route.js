import { NextResponse } from "next/server";
import { databases, ids } from "../../../../lib/server-appwrite";
import { getParticipantAuth } from "../../../../lib/auth";
import { buildParticipantQuestionView, getOrCreateSession, listQuestions } from "../../../../lib/server-quiz";
import { QUIZ_RULES } from "../../../../lib/rules";
import { applyQuestionOrder, getBattleForParticipant, getActiveBattle, runtimeState } from "../../../../lib/runtime-state";

export async function GET() {
  try {
    const auth = await getParticipantAuth();
    if (!auth) {
      return NextResponse.json({ error: "Not joined" }, { status: 401 });
    }

    const [participant, session, allQuestions] = await Promise.all([
      databases.getDocument(ids.databaseId, ids.participants, auth.id),
      getOrCreateSession(),
      listQuestions(),
    ]);

    if (participant.token !== auth.token) {
      return NextResponse.json({ error: "Invalid participant auth" }, { status: 403 });
    }

    const cappedQuestions = allQuestions.slice(0, QUIZ_RULES.totalQuestions);
    const questions = applyQuestionOrder(cappedQuestions);
    const currentQuestion = questions[session.currentQuestionIndex] || null;
    const currentIsGolden = !!(currentQuestion && runtimeState.goldenQuestionId && currentQuestion.$id === runtimeState.goldenQuestionId);
    const questionEndsAtMs = session?.questionEndsAt ? new Date(session.questionEndsAt).getTime() : 0;
    const questionEnded =
      session.status === "live" &&
      runtimeState.currentRound === "quiz" &&
      !!currentQuestion &&
      questionEndsAtMs > 0 &&
      Date.now() >= questionEndsAtMs;

    const participantBattle = getBattleForParticipant(participant.$id);
    const activeBattle = getActiveBattle();
    const battleForClient = participantBattle
      ? {
          id: participantBattle.id,
          topic: participantBattle.topic,
          status: participantBattle.status,
          creationMinutes: participantBattle.creationMinutes,
          counterMemeAllowed: participantBattle.counterMemeAllowed,
          startedAt: participantBattle.startedAt,
          revealStartedAt: participantBattle.revealStartedAt,
          teamName: participantBattle.teamAId === participant.$id ? participantBattle.teamAName : participantBattle.teamBName,
          opponentName: participantBattle.teamAId === participant.$id ? participantBattle.teamBName : participantBattle.teamAName,
          submitted:
            participantBattle.teamAId === participant.$id
              ? !!participantBattle.teamASubmission?.imageUrl
              : !!participantBattle.teamBSubmission?.imageUrl,
          opponentSubmitted:
            participantBattle.teamAId === participant.$id
              ? !!participantBattle.teamBSubmission?.imageUrl
              : !!participantBattle.teamASubmission?.imageUrl,
          mySubmissionImageUrl:
            participantBattle.teamAId === participant.$id
              ? participantBattle.teamASubmission?.imageUrl || ""
              : participantBattle.teamBSubmission?.imageUrl || "",
          opponentSubmissionImageUrl:
            participantBattle.teamAId === participant.$id
              ? participantBattle.teamBSubmission?.imageUrl || ""
              : participantBattle.teamASubmission?.imageUrl || "",
          winnerId: participantBattle.winnerId || "",
          winnerName: participantBattle.winnerName || "",
        }
      : null;

    return NextResponse.json({
      ok: true,
      participant: {
        id: participant.$id,
        name: participant.name,
        score: participant.score || 0,
        lastAnsweredIndex: participant.lastAnsweredIndex,
      },
      session: {
        status: session.status,
        currentQuestionIndex: session.currentQuestionIndex,
        questionEndsAt: session.questionEndsAt,
      },
      rules: {
        ...QUIZ_RULES,
        negativeMarking: runtimeState.negativeMarking,
      },
      goldenQuestionId: runtimeState.goldenQuestionId || null,
      currentIsGolden,
      currentRound: runtimeState.currentRound,
      finalRound: runtimeState.finalRound,
      activeBattle: activeBattle
        ? {
            id: activeBattle.id,
            teamAName: activeBattle.teamAName,
            teamBName: activeBattle.teamBName,
            topic: activeBattle.topic,
            status: activeBattle.status,
          }
        : null,
      battle: battleForClient,
      totalQuestions: questions.length,
      questionEnded,
      revealAnswer: questionEnded,
      correctOptionId: questionEnded && currentQuestion ? Number(currentQuestion.correctOption) : null,
      alreadyAnswered: participant.lastAnsweredIndex === session.currentQuestionIndex,
      question:
        session.status === "live" && runtimeState.currentRound === "quiz"
          ? buildParticipantQuestionView(currentQuestion, participant.$id)
          : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "State load failed" }, { status: 500 });
  }
}
