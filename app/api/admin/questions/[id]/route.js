import { NextResponse } from "next/server";
import { databases, ids } from "../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../lib/auth";
import { markGoldenPrefix } from "../../../../../lib/server-quiz";

function stripGoldenPrefix(text) {
  return String(text || "").replace(/^\s*\[GOLDEN\]\s*/i, "").trim();
}

export async function DELETE(_req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const p = await params;
    if (!p?.id) return NextResponse.json({ error: "Question id required" }, { status: 400 });

    await databases.deleteDocument(ids.databaseId, ids.questions, p.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const p = await params;
    if (!p?.id) return NextResponse.json({ error: "Question id required" }, { status: 400 });

    const body = await req.json();
    const parsedTime = Number(body.timeLimit);
    const parsedCorrect = Number(body.correctOption);

    if (!Number.isFinite(parsedTime) || parsedTime <= 0) {
      return NextResponse.json({ error: "timeLimit must be a positive number (seconds)" }, { status: 400 });
    }
    if (![0, 1, 2, 3].includes(parsedCorrect)) {
      return NextResponse.json({ error: "correctOption must be 0-3" }, { status: 400 });
    }

    const baseQuestion = stripGoldenPrefix(body.question);
    if (!baseQuestion) {
      return NextResponse.json({ error: "Question text required" }, { status: 400 });
    }

    const isGolden = !!body.isGolden;
    const questionText = isGolden ? markGoldenPrefix(baseQuestion) : baseQuestion;

    await databases.updateDocument(ids.databaseId, ids.questions, p.id, {
      question: questionText,
      imageUrl: String(body.imageUrl || "").trim(),
      optionA: String(body.optionA || "").trim(),
      optionB: String(body.optionB || "").trim(),
      optionC: String(body.optionC || "").trim(),
      optionD: String(body.optionD || "").trim(),
      correctOption: parsedCorrect,
      timeLimit: Math.round(parsedTime),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}
