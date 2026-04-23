"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const blank = {
  question: "What does the meme say?",
  imageUrl: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "0",
  timeLimitSeconds: "10",
  isGolden: false,
};

const blankBattle = {
  teamAId: "",
  teamBId: "",
  topic: "",
  creationMinutes: "3",
  counterMemeAllowed: true,
};

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(blank);
  const [battleForm, setBattleForm] = useState(blankBattle);
  const [pickedFile, setPickedFile] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editPickedFile, setEditPickedFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("quiz");
  const [selectedTeam, setSelectedTeam] = useState(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    restoreSession();
  }, []);

  useEffect(() => {
    if (!authed) return;
    loadDashboard();
    const t = setInterval(loadDashboard, 1200);
    return () => clearInterval(t);
  }, [authed]);

  async function restoreSession() {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const out = await res.json();
      setAuthed(!!out?.authed);
    } catch {
      setAuthed(false);
    }
    setCheckingSession(false);
  }

  async function login() {
    setMsg("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    const out = await res.json();
    if (!res.ok) return setMsg(out.error || "Login failed");
    setAuthed(true);
    await loadDashboard();
  }

  async function loadDashboard() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1800);
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store", signal: controller.signal });
      const out = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          setAuthed(false);
          setCheckingSession(false);
          return;
        }
        setMsg(out.error || "Dashboard failed");
        return;
      }
      setData(out);
      setSelectedTeam((prev) => {
        if (!prev?.id) return prev;
        return out.participants?.find((p) => p.id === prev.id) || null;
      });
    } catch {
      setMsg("Dashboard failed");
    }
    clearTimeout(t);
    loadingRef.current = false;
  }

  async function callAdmin(path, okMsg, body) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const out = await res.json();
      if (!res.ok) setMsg(out.error || "Action failed");
      else setMsg(okMsg || "Done");
      await loadDashboard();
    } catch {
      setMsg("Action failed");
    }
    setBusy(false);
  }

  async function uploadFile(file) {
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: fd });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || "Upload failed");
    return out.imageUrl;
  }

  async function addQuestion(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const uploadedImageUrl = pickedFile ? await uploadFile(pickedFile) : form.imageUrl;
      const seconds = Number(form.timeLimitSeconds);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        setMsg("Time limit must be a positive number in seconds");
        setBusy(false);
        return;
      }
      const safeSeconds = Math.max(1, Math.round(seconds));

      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: form.question,
          imageUrl: uploadedImageUrl || "",
          optionA: form.optionA,
          optionB: form.optionB,
          optionC: form.optionC,
          optionD: form.optionD,
          correctOption: Number(form.correctOption),
          timeLimit: safeSeconds,
          isGolden: !!form.isGolden,
        }),
      });
      const out = await res.json();
      if (!res.ok) setMsg(out.error || "Add failed");
      else {
        setMsg("Question added");
        setForm(blank);
        setPickedFile(null);
      }
      await loadDashboard();
    } catch (err) {
      setMsg(err?.message || "Add failed");
    }
    setBusy(false);
  }

  function startEditQuestion(q) {
    setEditPickedFile(null);
    setEditForm({
      id: q.id,
      question: q.question || "",
      imageUrl: q.imageUrl || "",
      optionA: q.optionA || "",
      optionB: q.optionB || "",
      optionC: q.optionC || "",
      optionD: q.optionD || "",
      correctOption: String(Number(q.correctOption || 0)),
      timeLimitSeconds: String(Number(q.timeLimit || 10)),
      isGolden: !!q.isGoldenCandidate,
    });
  }

  async function saveEditedQuestion(e) {
    e.preventDefault();
    if (!editForm?.id) return;

    setBusy(true);
    setMsg("");
    try {
      const uploadedImageUrl = editPickedFile ? await uploadFile(editPickedFile) : editForm.imageUrl;
      const seconds = Number(editForm.timeLimitSeconds);
      if (!Number.isFinite(seconds) || seconds <= 0) {
        setMsg("Time limit must be a positive number in seconds");
        setBusy(false);
        return;
      }

      const res = await fetch(`/api/admin/questions/${editForm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: editForm.question,
          imageUrl: uploadedImageUrl || "",
          optionA: editForm.optionA,
          optionB: editForm.optionB,
          optionC: editForm.optionC,
          optionD: editForm.optionD,
          correctOption: Number(editForm.correctOption),
          timeLimit: Math.max(1, Math.round(seconds)),
          isGolden: !!editForm.isGolden,
        }),
      });

      const out = await res.json();
      if (!res.ok) {
        setMsg(out.error || "Update failed");
      } else {
        setMsg("Question updated");
        setEditForm(null);
        setEditPickedFile(null);
      }

      await loadDashboard();
    } catch (err) {
      setMsg(err?.message || "Update failed");
    }
    setBusy(false);
  }

  async function addBattle(e) {
    e.preventDefault();
    await callAdmin("/api/admin/final-round/battles", "Battle started", {
      teamAId: battleForm.teamAId,
      teamBId: battleForm.teamBId,
      topic: battleForm.topic,
      creationMinutes: Number(battleForm.creationMinutes),
      counterMemeAllowed: battleForm.counterMemeAllowed,
    });
    setBattleForm(blankBattle);
  }

  async function showBattleResult(battleId) {
    await callAdmin(`/api/admin/final-round/battles/${battleId}/reveal`, "Result reveal started");
  }

  async function setBattleWinner(battleId, winnerId) {
    await callAdmin(`/api/admin/final-round/battles/${battleId}/winner`, "Winner awarded (+30)", { winnerId });
  }

  async function removeQuestion(id) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
      const out = await res.json();
      if (!res.ok) setMsg(out.error || "Delete failed");
      else setMsg("Question removed");
      await loadDashboard();
    } catch {
      setMsg("Delete failed");
    }
    setBusy(false);
  }

  async function deleteTeam(id) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/admin/participants/${id}`, { method: "DELETE" });
      const out = await res.json();
      if (!res.ok) {
        setMsg(out.error || "Delete failed");
      } else {
        setMsg("Team deleted");
        setSelectedTeam((prev) => (prev?.id === id ? null : prev));
      }
      await loadDashboard();
    } catch {
      setMsg("Delete failed");
    }
    setBusy(false);
  }

  const answered = useMemo(() => {
    if (!data?.participants || !data?.session) return 0;
    return data.participants.filter((p) => p.lastAnsweredIndex === data.session.currentQuestionIndex).length;
  }, [data]);

  const availableTeams = data?.participants || [];

  if (checkingSession) {
    return (
      <main className="container" suppressHydrationWarning>
        <div className="card" style={{ maxWidth: 440, margin: "0 auto" }} suppressHydrationWarning>
          <h1 className="hero-title" style={{ marginBottom: 8 }}>
            <span className="meme" style={{ fontSize: "3rem" }}>Admin</span>
            <span className="verse" style={{ fontSize: "3.2rem" }}>Panel</span>
          </h1>
          <p style={{ margin: 0, fontWeight: 800 }}>Checking session...</p>
        </div>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="container" suppressHydrationWarning>
        <div className="card" style={{ maxWidth: 440, margin: "0 auto" }} suppressHydrationWarning>
          <h1 className="hero-title" style={{ marginBottom: 8 }}>
            <span className="meme" style={{ fontSize: "3rem" }}>Admin</span>
            <span className="verse" style={{ fontSize: "3.2rem" }}>Panel</span>
          </h1>
          <p style={{ marginTop: 0, fontWeight: 800 }}>Host controls for MemeVerse</p>
          <input className="input" type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" />
          <button className="btn btn-primary" style={{ marginTop: 10, width: "100%" }} onClick={login}>Enter</button>
          {msg ? <p style={{ marginBottom: 0, fontWeight: 900 }}>{msg}</p> : null}
          <p className="small"><Link href="/">Back</Link></p>
        </div>
      </main>
    );
  }

  return (
    <main className="container" suppressHydrationWarning>
      <div className="topbar">
        <h1 className="hero-title" style={{ lineHeight: 0.95 }}>
          <span className="meme" style={{ fontSize: "clamp(2.1rem,6vw,3.4rem)" }}>Control</span>
          <span className="verse" style={{ fontSize: "clamp(2.3rem,7vw,3.9rem)" }}>Room</span>
        </h1>
        <div className="inline-actions">
          <Link className="badge" href="/leaderboard">Leaderboard</Link>
          <Link className="badge" href="/">Join Page</Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat"><h3>{data?.participants?.length || 0}</h3><p>Teams</p></div>
        <div className="stat"><h3>{data?.currentRound || "quiz"}</h3><p>Current Round</p></div>
        <div className="stat"><h3>{answered}/{data?.participants?.length || 0}</h3><p>Teams Answered</p></div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="tab-row">
          <button className={`tab-btn ${tab === "quiz" ? "active" : ""}`} onClick={() => setTab("quiz")}>Rules + Quiz</button>
          <button className={`tab-btn ${tab === "final" ? "active" : ""}`} onClick={() => setTab("final")}>Final Round</button>
          <button className={`tab-btn ${tab === "questions" ? "active" : ""}`} onClick={() => setTab("questions")}>Questions</button>
          <button className={`tab-btn ${tab === "teams" ? "active" : ""}`} onClick={() => setTab("teams")}>Teams</button>
        </div>
      </div>

      {tab === "quiz" ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Round 1 Rules</h2>
            <p className="small" style={{ marginTop: 0 }}>
              20 questions, 10-15 sec, normal question: +1/-1, random golden question: +5/-5.
            </p>
            <div className="inline-actions">
              <span className="badge">Normal: +1 / -1</span>
              <span className="badge">Golden: +5 / -5</span>
              <span className="badge">
                Random Golden Selected: {data?.goldenQuestionId ? "Yes" : "No"}
              </span>
            </div>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Quiz Controls</h2>
            <div className="inline-actions">
              <button className="btn btn-primary" disabled={busy} onClick={() => callAdmin("/api/admin/start", "Quiz started")}>Start Round 1</button>
              <button className="btn btn-alt" disabled={busy || data?.session?.status !== "live"} onClick={() => callAdmin("/api/admin/next", "Skipped to next question")}>Skip To Next</button>
              <button className="btn btn-danger" disabled={busy} onClick={() => callAdmin("/api/admin/end", "Quiz ended")}>End Quiz</button>
            </div>
            <p className="small" style={{ marginBottom: 0 }}>
              Current index: {data?.session?.currentQuestionIndex ?? 0}. Questions auto-advance after a {data?.rules?.revealSeconds ?? 4}s reveal.
            </p>
          </div>
        </>
      ) : null}

      {tab === "final" ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Final Round Setup</h2>
            <div className="responsive-grid-3" style={{ marginBottom: 10 }}>
              <input className="input" placeholder="Battle Topic" value={battleForm.topic} onChange={(e) => setBattleForm({ ...battleForm, topic: e.target.value })} />
              <input className="input" type="number" min={3} max={5} value={battleForm.creationMinutes} onChange={(e) => setBattleForm({ ...battleForm, creationMinutes: e.target.value })} />
              <label className="small" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                <input type="checkbox" checked={battleForm.counterMemeAllowed} onChange={(e) => setBattleForm({ ...battleForm, counterMemeAllowed: e.target.checked })} />
                Counter meme allowed
              </label>
            </div>
            <button className="btn btn-alt" disabled={busy} onClick={() => callAdmin("/api/admin/final-round/start", "Final round started", {
              topic: battleForm.topic,
              creationMinutes: Number(battleForm.creationMinutes),
              counterMemeAllowed: battleForm.counterMemeAllowed,
            })}>Start Final Round</button>
          </div>

          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Start Head-to-Head Battle</h2>
            <form className="responsive-grid-3" onSubmit={addBattle}>
              <select value={battleForm.teamAId} onChange={(e) => setBattleForm({ ...battleForm, teamAId: e.target.value })} required>
                <option value="">Select Team A</option>
                {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <select value={battleForm.teamBId} onChange={(e) => setBattleForm({ ...battleForm, teamBId: e.target.value })} required>
                <option value="">Select Team B</option>
                {availableTeams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <button className="btn btn-primary" type="submit" disabled={busy || data?.finalRound?.activeBattleId}>Start Battle</button>
            </form>
            <p className="small" style={{ marginBottom: 0 }}>
              Starting a battle sends only those two teams to the upload screen on their phones.
            </p>

            {(data?.finalRound?.battles || []).length ? (
              <div className="table-scroll-box" style={{ marginTop: 10 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Battle</th>
                      <th>Topic</th>
                      <th>Status</th>
                      <th>Uploads</th>
                      <th>Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.finalRound?.battles || []).map((b) => (
                      <tr key={b.id}>
                        <td>{b.teamAName} vs {b.teamBName}</td>
                        <td>{b.topic || data?.finalRound?.topic || "-"}</td>
                        <td>{b.status}</td>
                        <td>
                          <div className="inline-actions">
                            <span className="badge">{b.teamASubmission?.imageUrl ? `${b.teamAName}: uploaded` : `${b.teamAName}: waiting`}</span>
                            <span className="badge">{b.teamBSubmission?.imageUrl ? `${b.teamBName}: uploaded` : `${b.teamBName}: waiting`}</span>
                            {b.status === "active" ? (
                              <button className="btn" disabled={busy || !b.teamASubmission?.imageUrl || !b.teamBSubmission?.imageUrl} onClick={() => showBattleResult(b.id)}>
                                Show Result
                              </button>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {b.winnerName ? b.winnerName : (
                            <div className="inline-actions">
                              <button className="btn" disabled={busy || b.status !== "reveal"} onClick={() => setBattleWinner(b.id, b.teamAId)}>{b.teamAName} +30</button>
                              <button className="btn" disabled={busy || b.status !== "reveal"} onClick={() => setBattleWinner(b.id, b.teamBId)}>{b.teamBName} +30</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="small">No battles added yet.</p>}
          </div>
        </>
      ) : null}

      {tab === "questions" ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Add Quiz Question</h2>
            <form className="grid" onSubmit={addQuestion}>
              <input className="input" placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
              <input className="input" placeholder="Meme image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
              <input className="input" type="file" accept="image/*" onChange={(e) => setPickedFile(e.target.files?.[0] || null)} />
              <div className="small">Use image URL or upload from device.</div>
              <div className="responsive-grid-2">
                <input className="input" placeholder="Option A" value={form.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} required />
                <input className="input" placeholder="Option B" value={form.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} required />
                <input className="input" placeholder="Option C" value={form.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} required />
                <input className="input" placeholder="Option D" value={form.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} required />
              </div>
              <div className="responsive-grid-2">
                <select value={form.correctOption} onChange={(e) => setForm({ ...form, correctOption: e.target.value })}>
                  <option value="0">Correct: A</option>
                  <option value="1">Correct: B</option>
                  <option value="2">Correct: C</option>
                  <option value="3">Correct: D</option>
                </select>
                <input
                  className="input"
                  type="number"
                  min={1}
                  step={1}
                  value={form.timeLimitSeconds}
                  onChange={(e) => setForm({ ...form, timeLimitSeconds: e.target.value })}
                  placeholder="Time (seconds)"
                />
              </div>
              <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!form.isGolden}
                  onChange={(e) => setForm({ ...form, isGolden: e.target.checked })}
                />
                Mark as Golden Question candidate
              </label>
              <button className="btn btn-primary" type="submit" disabled={busy}>Add Question</button>
            </form>
          </div>

          {editForm ? (
            <div className="card" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>Edit Saved Question</h2>
              <form className="grid" onSubmit={saveEditedQuestion}>
                <input className="input" placeholder="Question" value={editForm.question} onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} required />
                <input className="input" placeholder="Meme image URL (optional)" value={editForm.imageUrl} onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} />
                <input className="input" type="file" accept="image/*" onChange={(e) => setEditPickedFile(e.target.files?.[0] || null)} />
                <div className="small">If you upload a file here, it will replace the current image.</div>
                <div className="responsive-grid-2">
                  <input className="input" placeholder="Option A" value={editForm.optionA} onChange={(e) => setEditForm({ ...editForm, optionA: e.target.value })} required />
                  <input className="input" placeholder="Option B" value={editForm.optionB} onChange={(e) => setEditForm({ ...editForm, optionB: e.target.value })} required />
                  <input className="input" placeholder="Option C" value={editForm.optionC} onChange={(e) => setEditForm({ ...editForm, optionC: e.target.value })} required />
                  <input className="input" placeholder="Option D" value={editForm.optionD} onChange={(e) => setEditForm({ ...editForm, optionD: e.target.value })} required />
                </div>
                <div className="responsive-grid-2">
                  <select value={editForm.correctOption} onChange={(e) => setEditForm({ ...editForm, correctOption: e.target.value })}>
                    <option value="0">Correct: A</option>
                    <option value="1">Correct: B</option>
                    <option value="2">Correct: C</option>
                    <option value="3">Correct: D</option>
                  </select>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    step={1}
                    value={editForm.timeLimitSeconds}
                    onChange={(e) => setEditForm({ ...editForm, timeLimitSeconds: e.target.value })}
                    placeholder="Time (seconds)"
                  />
                </div>
                <label className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={!!editForm.isGolden} onChange={(e) => setEditForm({ ...editForm, isGolden: e.target.checked })} />
                  Mark as Golden Question candidate
                </label>
                <div className="inline-actions">
                  <button className="btn btn-primary" type="submit" disabled={busy}>Save Changes</button>
                  <button className="btn" type="button" onClick={() => { setEditForm(null); setEditPickedFile(null); }} disabled={busy}>Cancel</button>
                </div>
              </form>
            </div>
          ) : null}

          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Round 1 Questions ({data?.questions?.length || 0}/20)</h2>
            <div className="table-scroll-box">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Question</th>
                    <th>Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.questions || []).map((q) => (
                    <tr key={q.id}>
                      <td>{Number(q.order) + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {q.imageUrl ? (
                            <img
                              src={q.imageUrl}
                              alt="question meme"
                              style={{
                                width: 58,
                                height: 58,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "2px solid #111",
                                background: "#fff",
                                flexShrink: 0,
                              }}
                            />
                          ) : null}
                          <span>{q.question}</span>
                        </div>
                        {q.isGoldenCandidate ? <span className="badge" style={{ marginLeft: 8 }}>Golden Candidate</span> : null}
                        {data?.goldenQuestionId === q.id ? <span className="badge" style={{ marginLeft: 8, background: "#b8860b" }}>Selected Golden</span> : null}
                      </td>
                      <td>{Number(q.timeLimit)} sec</td>
                      <td>
                        <div className="inline-actions">
                          <button className="btn" disabled={busy} onClick={() => startEditQuestion(q)}>Edit</button>
                          <button className="btn" disabled={busy} onClick={() => removeQuestion(q.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!(data?.questions || []).length ? <tr><td colSpan={4}>No questions yet</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {tab === "teams" ? (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <h2 style={{ marginTop: 0 }}>Joined Teams ({data?.participants?.length || 0})</h2>
            <div className="table-scroll-box">
              <table className="table">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Score</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.participants || []).map((team) => (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>{team.score}</td>
                      <td>{team.finished ? "Finished" : "Active"}</td>
                      <td>
                        <div className="inline-actions">
                          <button className="btn" disabled={busy} onClick={() => setSelectedTeam(team)}>View</button>
                          <button className="btn btn-danger" disabled={busy} onClick={() => deleteTeam(team.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!(data?.participants || []).length ? <tr><td colSpan={4}>No teams joined yet</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTeam ? (
            <div className="card" style={{ marginTop: 12 }}>
              <h2 style={{ marginTop: 0 }}>Team Details</h2>
              <div className="responsive-grid-2">
                <div className="panel">
                  <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>Team Name</p>
                  <p style={{ margin: 0 }}>{selectedTeam.name}</p>
                </div>
                <div className="panel">
                  <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>Score</p>
                  <p style={{ margin: 0 }}>{selectedTeam.score}</p>
                </div>
                <div className="panel">
                  <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>Last Answered Question</p>
                  <p style={{ margin: 0 }}>
                    {Number.isFinite(Number(selectedTeam.lastAnsweredIndex)) && Number(selectedTeam.lastAnsweredIndex) >= 0
                      ? Number(selectedTeam.lastAnsweredIndex) + 1
                      : "Not answered yet"}
                  </p>
                </div>
                <div className="panel">
                  <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>Joined At</p>
                  <p style={{ margin: 0 }}>{selectedTeam.joinedAt || "-"}</p>
                </div>
                <div className="panel">
                  <p style={{ marginTop: 0, marginBottom: 6, fontWeight: 900 }}>Status</p>
                  <p style={{ margin: 0 }}>{selectedTeam.finished ? "Finished quiz" : "Still in game"}</p>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {msg ? <p style={{ marginTop: 12, fontWeight: 900 }}>{msg}</p> : null}
    </main>
  );
}
