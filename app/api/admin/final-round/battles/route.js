import { NextResponse } from "next/server";
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
    const teamA = body?.teamA?.trim();
    const teamB = body?.teamB?.trim();
    if (!teamA || !teamB) {
      return NextResponse.json({ error: "Both teams required" }, { status: 400 });
    }

    const battle = createBattle({
      teamA,
      teamB,
      topic: body?.topic || runtimeState.finalRound.topic,
      creationMinutes: body?.creationMinutes || runtimeState.finalRound.creationMinutes,
      counterMemeAllowed: body?.counterMemeAllowed ?? runtimeState.finalRound.counterMemeAllowed,
    });

    return NextResponse.json({ ok: true, battle });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Create battle failed" }, { status: 500 });
  }
}
