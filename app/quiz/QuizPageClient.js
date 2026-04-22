"use client";

import { useEffect, useRef, useState } from "react";

export default function QuizPage() {
  const [state, setState] = useState(null);
  const [left, setLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [goldenBurst, setGoldenBurst] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState(null);
  const [battleFile, setBattleFile] = useState(null);
  const [battleUploading, setBattleUploading] = useState(false);
  const loadingRef = useRef(false);
  const prevQuestionIndexRef = useRef(-1);

  useEffect(() => {
    loadState();
    const poll = setInterval(loadState, 1200);
    const tick = setInterval(() => setLeft((prev) => Math.max(0, prev - 1)), 1000);

    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, []);

  async function loadState() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1700);

    try {
      const res = await fetch("/api/quiz/state", { cache: "no-store", signal: controller.signal });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = "/";
          return;
        }
        setError(data.error || "Failed loading quiz");
        return;
      }

      setState(data);
      setImageFailed(false);

      const currentIndex = Number(data?.session?.currentQuestionIndex ?? -1);
      if (currentIndex !== prevQuestionIndexRef.current) {
        prevQuestionIndexRef.current = currentIndex;
        setFeedback("");
        setSelectedOptionId(null);
      }

      if (data.session?.questionEndsAt) {
        const ms = new Date(data.session.questionEndsAt).getTime() - Date.now();
        setLeft(Math.max(0, Math.ceil(ms / 1000)));
      } else {
        setLeft(0);
      }
    } catch {
      setError("Failed loading quiz");
    }

    clearTimeout(timeout);
    loadingRef.current = false;
  }

  async function submit(optionIndex) {
    if (submitting) return;
    if (!state || state.alreadyAnswered || state.session?.status !== "live") return;

    setSubmitting(true);
    setFeedback("");
    setSelectedOptionId(optionIndex);

    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionIndex }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback(data.error || "Submit failed");
        setSubmitting(false);
        return;
      }

      if (!data.alreadyAnswered) {
        if (data.timedOut) setFeedback("Time up: 0 points");
        else if (data.isCorrect) setFeedback(`Correct: +${data.points}`);
        else setFeedback(`Wrong: ${data.points}`);

        if (data.isGolden) {
          setGoldenBurst(true);
          setTimeout(() => setGoldenBurst(false), 1400);
        }
      }

      await loadState();
    } catch {
      setFeedback("Submit failed");
    }

    setSubmitting(false);
  }

  async function uploadBattleMeme() {
    if (!battleFile || battleUploading) return;
    setBattleUploading(true);
    setFeedback("");

    try {
      const fd = new FormData();
      fd.set("file", battleFile);
      const res = await fetch("/api/final-round/upload", { method: "POST", body: fd });
      const out = await res.json();
      if (!res.ok) {
        setFeedback(out.error || "Upload failed");
      } else {
        setFeedback("Meme uploaded. Waiting for the other team.");
        setBattleFile(null);
        await loadState();
      }
    } catch {
      setFeedback("Upload failed");
    }

    setBattleUploading(false);
  }

  async function leaveTeam() {
    try {
      await fetch("/api/participants/leave", { method: "POST" });
    } catch {}

    window.location.href = "/";
  }

  if (error) {
    return (
      <main className="container quiz-screen" suppressHydrationWarning>
        <div className="quiz-shell">
          <div className="quiz-empty-state">
            <h2>Quiz error</h2>
            <p>{error}</p>
          </div>
        </div>
      </main>
    );
  }

  const session = state?.session;
  const question = state?.question;
  const status = session?.status || "loading";
  const total = state?.totalQuestions || 0;
  const currentIndex = session?.currentQuestionIndex || 0;
  const current = currentIndex + 1;
  const questionCountLabel = total ? `${current}/${total}` : "--/--";
  const quizProgress = total ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;
  const limit = Number(question?.timeLimit || 0);
  const timeProgress = limit > 0 ? Math.max(0, Math.min(100, (left / limit) * 100)) : 0;
  const urgent = left <= 5;
  const revealAnswer = !!state?.revealAnswer;
  const correctOptionId = state?.correctOptionId;
  const isLiveQuestion = status === "live" && question;
  const questionKey = `${currentIndex}-${question?.id ?? "none"}`;
  const feedbackTone = feedback.startsWith("Correct")
    ? "positive"
    : feedback.startsWith("Wrong") || feedback.startsWith("Time") || feedback.includes("failed")
      ? "negative"
      : "neutral";
  const battle = state?.battle;
  const activeBattle = state?.activeBattle;

  return (
    <main className="container quiz-screen" suppressHydrationWarning>
      <div className="quiz-shell">
        <section className="quiz-hero">
          <div className="quiz-hero-copy">
            <div className="quiz-brand-row">
              <h1 className="quiz-wordmark">
                <span className="quiz-wordmark-meme">Meme</span>
                <span className="quiz-wordmark-verse">Verse</span>
              </h1>
            </div>
            <p className="quiz-tagline">Decode. Create. Dominate.</p>
          </div>

          <div className="quiz-toolbar">
            {isLiveQuestion ? <span className="quiz-chip">Progress: {questionCountLabel}</span> : null}
            <button className="quiz-chip quiz-chip-button" type="button" onClick={leaveTeam}>
              Exit Quiz
            </button>
          </div>
        </section>

        {state?.currentRound === "battle" ? (
          battle ? (
            <section className="quiz-stage quiz-stage-final">
              <div className="quiz-stage-head">
                <div>
                  <p className="quiz-stage-label">Head To Head</p>
                  <h2>{battle.teamName} vs {battle.opponentName}</h2>
                </div>
                <span className="quiz-timer-pill">30 pts</span>
              </div>

              <div className="quiz-final-grid">
                <div className="quiz-final-card">
                  <p className="quiz-final-title">Theme</p>
                  <h3>{battle.topic || "To be announced"}</h3>
                </div>
                <div className="quiz-final-card">
                  <p className="quiz-final-title">Build Time</p>
                  <h3>{battle.creationMinutes} minutes</h3>
                </div>
                <div className="quiz-final-card">
                  <p className="quiz-final-title">Counter Meme</p>
                  <h3>{battle.counterMemeAllowed ? "Allowed" : "Not allowed"}</h3>
                </div>
              </div>

              {battle.status === "active" ? (
                <div className="battle-upload-shell">
                  <div className="battle-upload-card">
                    <p className="quiz-stage-label">Your Upload</p>
                    <h3>{battle.submitted ? "Meme submitted" : "Upload your meme"}</h3>
                    {battle.submitted && battle.mySubmissionImageUrl ? (
                      <img className="battle-upload-preview" src={battle.mySubmissionImageUrl} alt="your meme" />
                    ) : (
                      <>
                        <input
                          className="input"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setBattleFile(e.target.files?.[0] || null)}
                        />
                        <button className="btn btn-primary" type="button" onClick={uploadBattleMeme} disabled={!battleFile || battleUploading}>
                          {battleUploading ? "Uploading..." : "Upload Meme"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="battle-upload-card">
                    <p className="quiz-stage-label">Battle Status</p>
                    <h3>{battle.opponentSubmitted ? `${battle.opponentName} uploaded` : `Waiting for ${battle.opponentName}`}</h3>
                    <p className="small" style={{ marginBottom: 0 }}>
                      Once both teams upload, admin will trigger result reveal.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="battle-reveal-shell">
                  <div className="battle-reveal-theme">{battle.topic}</div>
                  <div className="battle-versus-grid">
                    <div className={`battle-meme-card ${battle.status === "reveal" ? "is-revealing" : "is-clear"} ${battle.winnerId && battle.winnerName === battle.teamName ? "is-winner" : ""}`}>
                      <p className="battle-team-name">{battle.teamName}</p>
                      <img className="battle-reveal-image" src={battle.mySubmissionImageUrl} alt={battle.teamName} />
                    </div>
                    <div className="battle-versus-text">VS</div>
                    <div className={`battle-meme-card ${battle.status === "reveal" ? "is-revealing" : "is-clear"} ${battle.winnerId && battle.winnerName === battle.opponentName ? "is-winner" : ""}`}>
                      <p className="battle-team-name">{battle.opponentName}</p>
                      <img className="battle-reveal-image" src={battle.opponentSubmissionImageUrl} alt={battle.opponentName} />
                    </div>
                  </div>
                  <div className="quiz-status-card">
                    <span className="quiz-status-label">Battle Result</span>
                    <strong>
                      {battle.winnerName
                        ? `${battle.winnerName} wins the head-to-head battle.`
                        : "Reveal is live. Waiting for admin to choose the winner."}
                    </strong>
                  </div>
                </div>
              )}

              {feedback ? (
                <div className={`quiz-status-card tone-${feedbackTone}`} style={{ marginTop: 12 }}>
                  <span className="quiz-status-label">Update</span>
                  <strong>{feedback}</strong>
                </div>
              ) : null}
            </section>
          ) : (
            <section className="quiz-stage quiz-empty-stage">
              <div className="quiz-empty-state">
                <p className="quiz-stage-label">Final Round</p>
                <h2>{activeBattle ? "Another battle is in progress" : "Waiting for head-to-head battle"}</h2>
                <p>
                  {activeBattle
                    ? `${activeBattle.teamAName} vs ${activeBattle.teamBName} is currently active.`
                    : "Admin will start your match when it is your turn."}
                </p>
              </div>
            </section>
          )
        ) : isLiveQuestion ? (
          <section className={`quiz-stage ${state?.currentIsGolden ? "is-golden-stage" : ""}`}>
            {goldenBurst ? (
              <div className="golden-confetti">
                {Array.from({ length: 24 }).map((_, i) => (
                  <span
                    key={i}
                    className="golden-piece"
                    style={{ left: `${(i * 4) % 100}%`, animationDelay: `${(i % 8) * 0.08}s` }}
                  />
                ))}
              </div>
            ) : null}

            <div className="quiz-stage-head">
              <div>
                <p className="quiz-stage-label">Round 1</p>
                <h2>Question {questionCountLabel}</h2>
              </div>
            </div>

            <div className="quiz-progress-stack">
              <div className="quiz-progress-group">
                <div className="quiz-progress-meta">
                  <span>Question timer</span>
                  <strong>{revealAnswer ? "Reveal phase" : `${left}s remaining`}</strong>
                </div>
                <div className={`quiz-progress-track is-time ${revealAnswer ? "is-reveal" : ""} ${urgent && !revealAnswer ? "is-urgent" : ""}`}>
                  <div className="quiz-progress-fill" style={{ width: `${timeProgress}%` }} />
                </div>
              </div>

              <div className="quiz-progress-group">
                <div className="quiz-progress-meta">
                  <span>Overall progress</span>
                  <strong>{Math.round(quizProgress)}%</strong>
                </div>
                <div className="quiz-progress-track is-total">
                  <div className="quiz-progress-fill" style={{ width: `${quizProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="quiz-stage-body question-enter" key={questionKey}>
              <div className="quiz-visual-panel">
                <div className="quiz-image-frame">
                  {question.imageUrl && !imageFailed ? (
                    <img
                      src={question.imageUrl}
                      alt="meme question"
                      onError={() => setImageFailed(true)}
                      className="quiz-image"
                    />
                  ) : (
                    <div className="quiz-image-fallback">
                      <span>No meme image</span>
                      <p>Upload an image from admin to show it here.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="quiz-question-panel">
                <div className="quiz-question-block">
                  <p className="quiz-stage-label">Prompt</p>
                  <h3 className="quiz-question">{question.question}</h3>
                </div>

                <div className="quiz-options">
                  {(question.options || []).map((opt, idx) => {
                    const isSelected = selectedOptionId === opt.id;
                    const isCorrectReveal = revealAnswer && opt.id === correctOptionId;
                    const isWrongReveal = revealAnswer && isSelected && opt.id !== correctOptionId;

                    return (
                      <button
                        key={`${opt.id}-${idx}`}
                        className={[
                          "quiz-option",
                          state?.alreadyAnswered || revealAnswer ? "locked" : "",
                          isSelected ? "selected" : "",
                          isCorrectReveal ? "correct-reveal" : "",
                          isWrongReveal ? "wrong-reveal" : "",
                        ].join(" ").trim()}
                        onClick={() => submit(opt.id)}
                        disabled={submitting || state?.alreadyAnswered || revealAnswer}
                      >
                        <span className="quiz-option-label">{String.fromCharCode(65 + idx)}</span>
                        <span className="quiz-option-text">{opt.text}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="quiz-status-row">
                  <div className={`quiz-status-card tone-${feedbackTone}`}>
                    <span className="quiz-status-label">Update</span>
                    <strong>
                      {feedback ||
                        (revealAnswer
                          ? "Time up. Correct answer is highlighted."
                          : state?.alreadyAnswered
                            ? "Answer locked. Waiting for next question."
                            : "Choose the best answer before the timer ends.")}
                    </strong>
                  </div>

                  <div className="quiz-rule-card">
                    <span className="quiz-status-label">Scoring</span>
                    <strong>{state?.currentIsGolden ? "Golden +5 / -5" : "Normal +1 / -1"}</strong>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section className="quiz-stage quiz-empty-stage">
            <div className="quiz-empty-state">
              <p className="quiz-stage-label">Quiz Lobby</p>
              <h2>{status === "waiting" ? "Waiting for admin to start" : status === "ended" ? "Quiz ended" : "Loading quiz"}</h2>
              <p>
                Team: <strong>{state?.participant?.name || "-"}</strong>
              </p>
              {status === "ended" ? <p>Final score: {state?.participant?.score ?? 0}</p> : null}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
