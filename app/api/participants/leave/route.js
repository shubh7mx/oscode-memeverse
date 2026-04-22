import { NextResponse } from "next/server";
import { clearParticipantCookies } from "../../../../lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearParticipantCookies(res);
  return res;
}
