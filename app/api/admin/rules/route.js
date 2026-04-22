import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/auth";
import { runtimeState } from "../../../../lib/runtime-state";

export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, negativeMarking: runtimeState.negativeMarking });
}

export async function POST(req) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    runtimeState.negativeMarking = !!body?.negativeMarking;
    return NextResponse.json({ ok: true, negativeMarking: runtimeState.negativeMarking });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Update failed" }, { status: 500 });
  }
}
