import { NextResponse } from "next/server";
import { ids, storage } from "../../../../lib/server-appwrite";

export async function GET(_req, { params }) {
  try {
    if (!ids.bucket) {
      return NextResponse.json({ error: "Bucket not configured" }, { status: 500 });
    }

    const p = await params;
    const fileId = p?.fileId;
    if (!fileId) {
      return NextResponse.json({ error: "fileId required" }, { status: 400 });
    }
    const [meta, blob] = await Promise.all([
      storage.getFile(ids.bucket, fileId),
      storage.getFileView(ids.bucket, fileId),
    ]);

    return new NextResponse(blob, {
      headers: {
        "Content-Type": meta.mimeType || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Image not found" }, { status: 404 });
  }
}
