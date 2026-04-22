import { NextResponse } from "next/server";
import { ID, Query, databases, ids } from "../../../../lib/server-appwrite";
import { createParticipantToken, getParticipantAuth, setParticipantCookies } from "../../../../lib/auth";

function normalizeName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 40);
}

function validateTeamName(name) {
  if (!name) return "Name required";
  if (name.length < 3) return "Use a proper team name";
  if (/[@_#]/.test(name)) return "Use a team name, not a username";
  if (!/[A-Za-z]/.test(name)) return "Team name must include letters";
  if (/^[a-z0-9-]+$/.test(name)) return "Use a proper team name with spaces or title style";
  if (!/^[A-Za-z0-9 '&.-]+$/.test(name)) return "Only letters, numbers, spaces and basic punctuation allowed";
  return "";
}

export async function POST(req) {
  try {
    const body = await req.json();
    const name = normalizeName(body?.name);
    const validationError = validateTeamName(name);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Idempotent join on same device.
    const auth = await getParticipantAuth();
    if (auth?.id && auth?.token) {
      try {
        const existing = await databases.getDocument(ids.databaseId, ids.participants, auth.id);
        if (existing.token === auth.token) {
          const updated =
            existing.name === name
              ? existing
              : await databases.updateDocument(ids.databaseId, ids.participants, existing.$id, { name });

          const res = NextResponse.json({
            ok: true,
            participantId: updated.$id,
            name: updated.name,
            reused: true,
          });
          setParticipantCookies(res, updated.$id, auth.token);
          return res;
        }
      } catch {}
    }

    // Avoid duplicate team names by mistake.
    const clash = await databases.listDocuments(ids.databaseId, ids.participants, [Query.equal("name", name), Query.limit(1)]);
    if (clash.documents.length) {
      return NextResponse.json({ error: "Name already joined. Use this team's original device." }, { status: 409 });
    }

    const token = createParticipantToken();
    const participant = await databases.createDocument(ids.databaseId, ids.participants, ID.unique(), {
      name,
      score: 0,
      joinedAt: new Date().toISOString(),
      lastAnsweredIndex: -1,
      finished: false,
      token,
    });

    const res = NextResponse.json({
      ok: true,
      participantId: participant.$id,
      name: participant.name,
      reused: false,
    });
    setParticipantCookies(res, participant.$id, token);
    return res;
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Join failed" }, { status: 500 });
  }
}
