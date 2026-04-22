import { NextResponse } from "next/server";
import { setAdminCookie } from "../../../../lib/auth";

export async function POST(req) {
  try {
    const body = await req.json();
    const pin = body?.pin || "";
    if (pin !== (process.env.ADMIN_PIN || "1234")) {
      return NextResponse.json({ error: "Wrong pin" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    setAdminCookie(res);
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
