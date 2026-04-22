import { NextResponse } from "next/server";
import { databases, ids } from "../../../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../../../lib/auth";
import { QUIZ_RULES } from "../../../../../../../lib/rules";
import { getBattle, runtimeState, setBattleWinner } from "../../../../../../../lib/runtime-state";

export async function POST(req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const p = await params;
    if (!p?.id) return NextResponse.json({ error: "Battle id required" }, { status: 400 });

    const body = await req.json();
    const winnerId = String(body?.winnerId || "").trim();
    if (!winnerId) {
      return NextResponse.json({ error: "Winner id required" }, { status: 400 });
    }

    const currentBattle = getBattle(p.id);
    if (!currentBattle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }
    if (![currentBattle.teamAId, currentBattle.teamBId].includes(winnerId)) {
      return NextResponse.json({ error: "Winner must be one of the two battle teams" }, { status: 400 });
    }

    const winner = await databases.getDocument(ids.databaseId, ids.participants, winnerId);

    await databases.updateDocument(ids.databaseId, ids.participants, winner.$id, {
      score: (winner.score || 0) + QUIZ_RULES.finalRoundPoints,
    });

    const battle = setBattleWinner(p.id, winner.$id, winner.name);
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, battle, finalRound: runtimeState.finalRound });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Set winner failed" }, { status: 500 });
  }
}
