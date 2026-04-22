import { NextResponse } from "next/server";
import { Query, databases, ids } from "../../../lib/server-appwrite";

const CACHE_TTL_MS = 4000;
const QUERY_TIMEOUT_MS = 2500;

let cachedAt = 0;
let cachedPayload = { ok: true, rows: [], total: 0, cached: true };
let inflight = null;

export async function GET() {
  const now = Date.now();
  if (now - cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload, {
      headers: { "x-leaderboard-cache": "hit" },
    });
  }

  if (inflight) {
    return NextResponse.json(
      { ...cachedPayload, cached: true, stale: true },
      { headers: { "x-leaderboard-cache": "stale-inflight" } },
    );
  }

  try {
    inflight = databases.listDocuments(ids.databaseId, ids.participants, [
      Query.orderDesc("score"),
      Query.orderAsc("name"),
      Query.limit(200),
    ]);

    const timeout = new Promise((resolve) => {
      setTimeout(() => resolve("timeout"), QUERY_TIMEOUT_MS);
    });

    const result = await Promise.race([inflight, timeout]);
    if (result === "timeout") {
      return NextResponse.json(
        { ...cachedPayload, cached: true, stale: true, error: "timeout" },
        { headers: { "x-leaderboard-cache": "timeout" } },
      );
    }

    const res = result;

    const rows = res.documents.map((d, i) => ({
      rank: i + 1,
      id: d.$id,
      name: d.name,
      score: d.score || 0,
      finished: !!d.finished,
    }));

    cachedPayload = { ok: true, rows, total: rows.length, cached: false };
    cachedAt = Date.now();
    return NextResponse.json(cachedPayload, {
      headers: { "x-leaderboard-cache": "miss" },
    });
  } catch (e) {
    if (cachedPayload?.ok) {
      return NextResponse.json(
        { ...cachedPayload, cached: true, stale: true, error: e?.message || "degraded" },
        { headers: { "x-leaderboard-cache": "stale" } },
      );
    }
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  } finally {
    inflight = null;
  }
}
