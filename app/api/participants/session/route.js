import { NextResponse } from "next/server";
import { getParticipantAuth } from "../../../../lib/auth";
import { databases, ids } from "../../../../lib/server-appwrite";

export async function GET() {
  try {
    const auth = await getParticipantAuth();
    if (!auth) return NextResponse.json({ ok: true, joined: false });

    try {
      const participant = await databases.getDocument(ids.databaseId, ids.participants, auth.id);
      const joined = participant.token === auth.token;
      return NextResponse.json({ ok: true, joined, participantId: joined ? participant.$id : null });
    } catch {
      return NextResponse.json({ ok: true, joined: false });
    }
  } catch {
    return NextResponse.json({ ok: true, joined: false });
  }
}
