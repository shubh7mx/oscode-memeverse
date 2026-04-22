import { NextResponse } from "next/server";
import { databases, ids } from "../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../lib/auth";
import { runtimeState } from "../../../../../lib/runtime-state";

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    runtimeState.currentRound = "battle";
    runtimeState.finalRound.topic = (body?.topic || "").trim();
    runtimeState.finalRound.creationMinutes = Math.max(3, Math.min(5, Number(body?.creationMinutes || 3)));
    runtimeState.finalRound.counterMemeAllowed = body?.counterMemeAllowed !== false;

    await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "battle",
      questionEndsAt: null,
    });

    return NextResponse.json({ ok: true, currentRound: runtimeState.currentRound, finalRound: runtimeState.finalRound });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to start battle" }, { status: 500 });
  }
}
