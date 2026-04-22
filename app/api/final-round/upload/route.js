import { NextResponse } from "next/server";
import { InputFile, ID, databases, ids, storage } from "../../../../lib/server-appwrite";
import { getParticipantAuth } from "../../../../lib/auth";
import { getBattleForParticipant, runtimeState, setBattleSubmission } from "../../../../lib/runtime-state";

export async function POST(req) {
  try {
    const auth = await getParticipantAuth();
    if (!auth) {
      return NextResponse.json({ error: "Not joined" }, { status: 401 });
    }

    const participant = await databases.getDocument(ids.databaseId, ids.participants, auth.id);
    if (participant.token !== auth.token) {
      return NextResponse.json({ error: "Invalid participant auth" }, { status: 403 });
    }

    if (runtimeState.currentRound !== "battle") {
      return NextResponse.json({ error: "Battle round is not active" }, { status: 400 });
    }

    const battle = getBattleForParticipant(participant.$id);
    if (!battle) {
      return NextResponse.json({ error: "No active head-to-head battle for this team" }, { status: 403 });
    }
    if (battle.status !== "active") {
      return NextResponse.json({ error: "Uploads are closed for this battle" }, { status: 400 });
    }
    if (!ids.bucket) {
      return NextResponse.json({ error: "APPWRITE_BUCKET_ID not set" }, { status: 400 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const input = InputFile.fromBuffer(bytes, file.name || "battle-meme.jpg");
    const uploaded = await storage.createFile(ids.bucket, ID.unique(), input);
    const submission = setBattleSubmission(battle.id, participant.$id, {
      fileId: uploaded.$id,
      imageUrl: `/api/media/${uploaded.$id}`,
    });

    return NextResponse.json({ ok: true, battle: submission });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
