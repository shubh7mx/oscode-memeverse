import { NextResponse } from "next/server";
import { isAdmin } from "../../../../../../../lib/auth";
import { canRevealBattle, getBattle, revealBattle } from "../../../../../../../lib/runtime-state";

export async function POST(_req, { params }) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Battle id required" }, { status: 400 });
    }

    const existingBattle = getBattle(id);
    if (!existingBattle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }
    if (!canRevealBattle(existingBattle)) {
      return NextResponse.json({ error: "Both teams must upload before reveal" }, { status: 400 });
    }

    const battle = revealBattle(id);
    if (!battle) {
      return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, battle });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Reveal failed" }, { status: 500 });
  }
}
