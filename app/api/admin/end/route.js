import { NextResponse } from "next/server";
import { databases, ids } from "../../../../lib/server-appwrite";
import { isAdmin } from "../../../../lib/auth";
import { resetQuestionOrder } from "../../../../lib/runtime-state";

export async function POST() {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    resetQuestionOrder();

    await databases.updateDocument(ids.databaseId, ids.session, ids.sessionDocId, {
      status: "ended",
      questionEndsAt: null,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "End failed" }, { status: 500 });
  }
}
