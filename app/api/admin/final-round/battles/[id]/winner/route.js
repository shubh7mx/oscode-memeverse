import { NextResponse } from "next/server";
import { databases, ids, Query } from "../../../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../../../lib/auth";
import { QUIZ_RULES } from "../../../../../../../lib/rules";
import { runtimeState, setBattleWinner } from "../../../../../../../lib/runtime-state";

export async function POST(req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const p = await params;
    if (!p?.id) return NextResponse.json({ error: "Battle id required" }, { status: 400 });

    const body = await req.json();
    const winnerName = (body?.winnerName || "").trim();
    if (!winnerName) {
      return NextResponse.json({ error: "Winner name required" }, { status: 400 });
    }

    const participants = await databases.listDocuments(ids.databaseId, ids.participants, [Query.limit(500)]);
    const winner = participants.documents.find((p) => p.name.toLowerCase() === winnerName.toLowerCase());
    if (!winner) {
      return NextResponse.json({ error: "Winner not found in participants" }, { status: 404 });
    }

    await databases.updateDocument(ids.databaseId, ids.participants, winner.$id, {
      score: (winner.score || 0) + QUIZ_RULES.finalRoundPoints,
    });

    const battle = setBattleWinner(p.id, winner.$id);
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    battle.winnerName = winner.name;
    battle.pointsAwarded = QUIZ_RULES.finalRoundPoints;

    return NextResponse.json({ ok: true, battle, finalRound: runtimeState.finalRound });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Set winner failed" }, { status: 500 });
  }
}
