"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function HomePage() {
  const [name, setName] = useState("");
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadingRef = useRef(false);

  useEffect(() => {
    restoreParticipant();
    loadLeaderboard();
    const t = setInterval(loadLeaderboard, 2000);
    return () => clearInterval(t);
  }, []);

  async function restoreParticipant() {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    try {
      const res = await fetch("/api/participants/session", { cache: "no-store", signal: controller.signal });
      if (res.ok) {
        const out = await res.json();
        if (out.joined) window.location.href = "/quiz";
      }
    } catch {}
    clearTimeout(t);
  }

  async function loadLeaderboard() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1600);
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store", signal: controller.signal });
      const data = await res.json();
      setCount(data.total || 0);
    } catch {
      setCount(0);
    }
    clearTimeout(t);
    loadingRef.current = false;
  }

  async function join() {
    setError("");
    const finalName = name.trim().slice(0, 40);
    if (!finalName) return setError("Enter team name");

    setLoading(true);
    try {
      const res = await fetch("/api/participants/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: finalName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Join failed");
        setLoading(false);
        return;
      }
      window.location.href = "/quiz";
    } catch {
      setError("Join failed");
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <div className="topbar">
        <div className="badge"><span className="live-dot" /> LIVE EVENT</div>
        <div className="inline-actions">
          <Link className="badge" href="/leaderboard">Leaderboard</Link>
          <Link className="badge" href="/admin">Admin</Link>
        </div>
      </div>

      <section className="card" style={{ overflow: "hidden" }}>
        <div className="topbar" style={{ alignItems: "flex-end" }}>
          <h1 className="hero-title">
            <span className="meme">Meme</span>
            <span className="verse">Verse</span>
          </h1>
          <div className="badge">{count} teams joined</div>
        </div>

        <div className="scribble black">Decode. Create. Dominate.</div>
        <div className="poster-divider" />

        <div className="responsive-grid-auto" style={{ alignItems: "start" }}>
          <div className="panel">
            <h2 style={{ marginBottom: 8, marginTop: 0 }}>Join Quiz</h2>
            <p className="small" style={{ marginTop: 0 }}>One device per team.</p>
            <div className="grid">
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name" maxLength={40} />
              <button className="btn btn-primary" onClick={join} disabled={loading}>{loading ? "Joining..." : "Join Now"}</button>
              {error ? <p style={{ color: "#cb1f1f", fontWeight: 800, margin: 0 }}>{error}</p> : null}
            </div>
          </div>

          <details className="panel details-card">
            <summary>
              <span className="scribble purple">Round 1: Meme Quiz</span>
              <span className="badge">20 points</span>
            </summary>
            <div className="details-body">
              <ul className="compact-list">
                <li>20 questions</li>
                <li>10-15 sec per question</li>
                <li>+1 points for correct</li>
                <li>-1 for wrong</li>
                <li>1 random golden question: +5 / -5</li>
              </ul>
            </div>
          </details>

          <details className="panel details-card">
            <summary>
              <span className="scribble blue">Final Round: Meme Battle</span>
              <span className="badge">30 points</span>
            </summary>
            <div className="details-body">
              <ul className="compact-list">
                <li>Head-to-head battles</li>
                <li>Topic revealed by admin</li>
                <li>3-5 mins to create</li>
                <li>Present your meme</li>
                <li>Counter meme allowed (optional)</li>
              </ul>
            </div>
          </details>
        </div>

        <p className="small" style={{ marginBottom: 0 }}>If already joined on this device, this page auto-sends to quiz.</p>
      </section>
    </main>
  );
}
