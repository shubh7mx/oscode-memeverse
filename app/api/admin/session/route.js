import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";

export async function GET() {
  try {
    const authed = await isAdmin();
    return NextResponse.json({ ok: true, authed });
  } catch {
    return NextResponse.json({ ok: true, authed: false });
  }
}
