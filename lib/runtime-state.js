import { randomUUID } from "node:crypto";
import { QUIZ_RULES } from "./rules";

function blankBattleSubmission() {
  return {
    fileId: "",
    imageUrl: "",
    submittedAt: "",
  };
}

export const runtimeState = {
  negativeMarking: true,
  goldenQuestionId: "",
  questionOrderIds: [],
  currentRound: "quiz", // quiz | battle
  finalRound: {
    topic: "",
    creationMinutes: 3,
    counterMemeAllowed: true,
    activeBattleId: "",
    battles: [],
  },
};

export function resetFinalRound() {
  runtimeState.finalRound = {
    topic: "",
    creationMinutes: 3,
    counterMemeAllowed: true,
    activeBattleId: "",
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

export function createBattle({
  teamAId,
  teamAName,
  teamBId,
  teamBName,
  topic,
  creationMinutes,
  counterMemeAllowed,
}) {
  const battle = {
    id: randomUUID(),
    teamAId,
    teamAName,
    teamBId,
    teamBName,
    topic: String(topic || "").trim(),
    creationMinutes: Math.max(3, Math.min(5, Number(creationMinutes || 3))),
    counterMemeAllowed: !!counterMemeAllowed,
    status: "active", // active | reveal | judged
    startedAt: new Date().toISOString(),
    revealStartedAt: "",
    winnerId: "",
    winnerName: "",
    pointsAwarded: QUIZ_RULES.finalRoundPoints,
    teamASubmission: blankBattleSubmission(),
    teamBSubmission: blankBattleSubmission(),
  };

  runtimeState.finalRound.activeBattleId = battle.id;
  runtimeState.finalRound.battles.unshift(battle);
  return battle;
}

export function getBattle(battleId) {
  return runtimeState.finalRound.battles.find((battle) => battle.id === battleId) || null;
}

export function getActiveBattle() {
  if (!runtimeState.finalRound.activeBattleId) return null;
  return getBattle(runtimeState.finalRound.activeBattleId);
}

export function getBattleForParticipant(participantId) {
  const active = getActiveBattle();
  if (!active) return null;
  if (active.teamAId === participantId || active.teamBId === participantId) {
    return active;
  }
  return null;
}

export function setBattleSubmission(battleId, participantId, { fileId, imageUrl }) {
  const battle = getBattle(battleId);
  if (!battle) return null;

  const payload = {
    fileId: fileId || "",
    imageUrl: imageUrl || "",
    submittedAt: new Date().toISOString(),
  };

  if (battle.teamAId === participantId) {
    battle.teamASubmission = payload;
    return battle;
  }
  if (battle.teamBId === participantId) {
    battle.teamBSubmission = payload;
    return battle;
  }
  return null;
}

export function canRevealBattle(battle) {
  return !!(
    battle &&
    battle.teamASubmission?.imageUrl &&
    battle.teamBSubmission?.imageUrl
  );
}

export function revealBattle(battleId) {
  const battle = getBattle(battleId);
  if (!battle) return null;
  battle.status = "reveal";
  battle.revealStartedAt = new Date().toISOString();
  return battle;
}

export function setBattleWinner(battleId, winnerId, winnerName) {
  const battle = getBattle(battleId);
  if (!battle) return null;
  battle.winnerId = winnerId;
  battle.winnerName = winnerName || "";
  battle.status = "judged";
  runtimeState.finalRound.activeBattleId = "";
  return battle;
}
