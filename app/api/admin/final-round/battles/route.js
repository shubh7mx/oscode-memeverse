import { NextResponse } from "next/server";
import { databases, ids } from "../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../lib/auth";
import { createBattle, runtimeState } from "../../../../../lib/runtime-state";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, battles: runtimeState.finalRound.battles });
}

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const teamAId = String(body?.teamAId || "").trim();
    const teamBId = String(body?.teamBId || "").trim();
    if (!teamAId || !teamBId) {
      return NextResponse.json({ error: "Both teams required" }, { status: 400 });
    }
    if (teamAId === teamBId) {
      return NextResponse.json({ error: "Choose two different teams" }, { status: 400 });
    }

    const [teamA, teamB] = await Promise.all([
      databases.getDocument(ids.databaseId, ids.participants, teamAId),
      databases.getDocument(ids.databaseId, ids.participants, teamBId),
    ]);

    if (runtimeState.finalRound.activeBattleId) {
      return NextResponse.json({ error: "Finish current battle before starting another" }, { status: 409 });
    }

    const battle = createBattle({
      teamAId: teamA.$id,
      teamAName: teamA.name,
      teamBId: teamB.$id,
      teamBName: teamB.name,
      topic: body?.topic || runtimeState.finalRound.topic,
      creationMinutes: body?.creationMinutes || runtimeState.finalRound.creationMinutes,
      counterMemeAllowed: body?.counterMemeAllowed ?? runtimeState.finalRound.counterMemeAllowed,
    });

    return NextResponse.json({ ok: true, battle });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Create battle failed" }, { status: 500 });
  }
}
