import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { ID, InputFile, ids, storage } from "../../../../lib/server-appwrite";

export async function POST(req) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const input = InputFile.fromBuffer(bytes, file.name || "meme.jpg");
    const uploaded = await storage.createFile(ids.bucket, ID.unique(), input);

    const imageUrl = `/api/media/${uploaded.$id}`;

    return NextResponse.json({ ok: true, fileId: uploaded.$id, imageUrl });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
