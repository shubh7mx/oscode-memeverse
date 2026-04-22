import { randomUUID } from "node:crypto";
import { QUIZ_RULES } from "./rules";

export const runtimeState = {
  negativeMarking: true,
  goldenQuestionId: "",
  questionOrderIds: [],
  currentRound: "quiz", // quiz | battle
  finalRound: {
    topic: "",
    creationMinutes: 3,
    counterMemeAllowed: true,
    battles: [],
  },
};

export function resetFinalRound() {
  runtimeState.finalRound = {
    topic: "",
    creationMinutes: 3,
    counterMemeAllowed: true,
    battles: [],
  };
}

export function resetGoldenQuestion() {
  runtimeState.goldenQuestionId = "";
}

export function resetQuestionOrder() {
  runtimeState.questionOrderIds = [];
}

export function setRandomQuestionOrder(questions) {
  const ids = (questions || []).map((q) => q.$id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  runtimeState.questionOrderIds = ids;
}

export function applyQuestionOrder(questions) {
  const order = runtimeState.questionOrderIds || [];
  if (!order.length) return questions;

  const map = new Map((questions || []).map((q) => [q.$id, q]));
  const ordered = [];
  for (const id of order) {
    const q = map.get(id);
    if (q) ordered.push(q);
  }
  if (!ordered.length) return questions;
  return ordered;
}

export function createBattle({ teamA, teamB, topic, creationMinutes, counterMemeAllowed }) {
  const battle = {
    id: randomUUID(),
    teamA,
    teamB,
    topic,
    creationMinutes: Math.max(3, Math.min(5, Number(creationMinutes || 3))),
    counterMemeAllowed: !!counterMemeAllowed,
    status: "pending", // pending | active | judged
    winnerId: "",
    pointsAwarded: QUIZ_RULES.finalRoundPoints,
  };
  runtimeState.finalRound.battles.push(battle);
  return battle;
}

export function setBattleWinner(battleId, winnerId) {
  const battle = runtimeState.finalRound.battles.find((b) => b.id === battleId);
  if (!battle) return null;
  battle.winnerId = winnerId;
  battle.status = "judged";
  return battle;
}
