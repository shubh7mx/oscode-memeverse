import { NextResponse } from "next/server";
import { databases, ids } from "../../../../../lib/server-appwrite";
import { isAdmin } from "../../../../../lib/auth";

export async function DELETE(_req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Participant id missing" }, { status: 400 });
    }

    await databases.deleteDocument(ids.databaseId, ids.participants, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Delete failed" }, { status: 500 });
  }
}
