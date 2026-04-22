"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    loadRows();
    const t = setInterval(loadRows, 1500);
    return () => clearInterval(t);
  }, []);

  async function loadRows() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1700);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store", signal: controller.signal });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
        setLastSync(new Date());
      }
    } catch {
      setRows([]);
    }
    clearTimeout(t);
    loadingRef.current = false;
  }

  const topScore = rows[0]?.score ?? 0;
  const avg = useMemo(() => {
    if (!rows.length) return 0;
    return Math.round(rows.reduce((a, b) => a + (b.score || 0), 0) / rows.length);
  }, [rows]);

  return (
    <main className="container">
      <div className="topbar">
        <h1 className="hero-title" style={{ lineHeight: 0.95 }}>
          <span className="meme" style={{ fontSize: "clamp(2.2rem,6vw,3.6rem)" }}>Live</span>
          <span className="verse" style={{ fontSize: "clamp(2.4rem,7vw,4rem)" }}>Leaderboard</span>
        </h1>
        <div className="inline-actions" style={{ alignItems: "center" }}>
          <div className="badge"><span className="live-dot" /> LIVE</div>
          <Link className="badge" href="/">Join</Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 12 }}>
        <div className="stat"><h3>{rows.length}</h3><p>Teams</p></div>
        <div className="stat"><h3>{topScore}</h3><p>Top Score</p></div>
        <div className="stat"><h3>{avg}</h3><p>Average Score</p></div>
      </div>

      <div className="card">
        <div className="table-scroll-box">
          <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Team</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ background: i < 3 ? "#fff5bd" : "transparent" }}>
                <td>{row.rank}</td>
                <td>{row.name}</td>
                <td>{row.score}</td>
              </tr>
            ))}
            {!rows.length ? <tr><td colSpan={3}>No teams yet</td></tr> : null}
          </tbody>
          </table>
        </div>
        <p className="small" style={{ marginTop: 10, marginBottom: 0 }}>
          {lastSync ? `Synced: ${lastSync.toLocaleTimeString()}` : "Syncing..."}
        </p>
      </div>
    </main>
  );
}
