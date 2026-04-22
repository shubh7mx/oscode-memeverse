import { NextResponse } from "next/server";
import { ID, Query, databases, ids } from "../../../../lib/server-appwrite";
import { isAdmin } from "../../../../lib/auth";
import { markGoldenPrefix } from "../../../../lib/server-quiz";

const DEFAULT_QUESTION = "What does the meme say?";
const DEFAULT_TIME_SECONDS = 10;

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawTime = body.timeLimit;
    const hasTime = !(rawTime === undefined || rawTime === null || String(rawTime).trim() === "");
    const parsedTime = Number(rawTime);
    if (hasTime && (!Number.isFinite(parsedTime) || parsedTime <= 0)) {
      return NextResponse.json({ error: "timeLimit must be a positive number (seconds)" }, { status: 400 });
    }
    const safeTimeLimit = hasTime ? Math.round(parsedTime) : DEFAULT_TIME_SECONDS;

    const baseQuestion = (body.question || "").trim() || DEFAULT_QUESTION;
    const isGolden = !!body.isGolden;
    const questionText = isGolden ? markGoldenPrefix(baseQuestion) : baseQuestion;
    const list = await databases.listDocuments(ids.databaseId, ids.questions, [Query.orderDesc("order"), Query.limit(1)]);
    const nextOrder = list.documents.length ? Number(list.documents[0].order) + 1 : 0;

    const doc = await databases.createDocument(ids.databaseId, ids.questions, ID.unique(), {
      question: questionText,
      imageUrl: (body.imageUrl || "").trim(),
      optionA: (body.optionA || "").trim(),
      optionB: (body.optionB || "").trim(),
      optionC: (body.optionC || "").trim(),
      optionD: (body.optionD || "").trim(),
      correctOption: Number(body.correctOption),
      timeLimit: safeTimeLimit,
      order: nextOrder,
    });

    return NextResponse.json({ ok: true, id: doc.$id });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Add question failed" }, { status: 500 });
  }
}
