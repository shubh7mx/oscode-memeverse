const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;
const ADMIN_PIN = '1234';

let quizData = JSON.parse(fs.readFileSync(path.join(__dirname, 'quiz.json'), 'utf-8'));

const COLORS = ['#FF2D8D', '#FFE600', '#00E5FF', '#7C3AED', '#FF6B35', '#00D68F'];
const EMOJIS = ['😂', '🔥', '💀', '😎', '🤡', '🥶', '👀', '🫡', '💯', '🤣', '😤', '🤯'];

let gameState = {
  status: 'waiting',             // waiting | question | ended
  participants: {},              // socketId -> { id, name, score, color, emoji }
  participantProgress: {},       // socketId -> { index, questionStartTime, answered, completedAt }
  firstCompleter: null,          // socketId of first to finish all questions
  quizStartTime: 0,
};

function getLeaderboard() {
  return Object.values(gameState.participants)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => {
      const prog = gameState.participantProgress[p.id];
      const qDone = prog ? Math.min(prog.index, quizData.length) : 0;
      return { ...p, rank: i + 1, questionsAnswered: qDone, completed: prog?.completedAt != null };
    });
}

function broadcastLeaderboard() {
  io.emit('leaderboard', getLeaderboard());
}

// Send a specific question to a specific socket
function sendQuestionToParticipant(socketId, questionIndex) {
  if (questionIndex >= quizData.length) return false;
  const q = quizData[questionIndex];
  io.to(socketId).emit('question', {
    index: questionIndex,
    total: quizData.length,
    question: q.question,
    image: q.image,
    options: q.options,
    timeLimit: q.timeLimit,
    remaining: q.timeLimit,
  });
  return true;
}

// Called when participant completes all questions
function handleParticipantComplete(socketId) {
  const participant = gameState.participants[socketId];
  if (!participant) return;
  const progress = gameState.participantProgress[socketId];
  if (!progress || progress.completedAt != null) return;

  const completionTime = (Date.now() - gameState.quizStartTime) / 1000;
  progress.completedAt = completionTime;

  let bonusPoints = 0;
  const isFirst = !gameState.firstCompleter;
  if (isFirst) {
    gameState.firstCompleter = socketId;
    bonusPoints = 5;
    participant.score += 5;
    // Announce to everyone
    io.emit('notification', {
      msg: `🏆 ${participant.name} finished first! +5 bonus points!`,
      emoji: participant.emoji,
    });
  }

  io.to(socketId).emit('quiz:personal_end', {
    firstCompleter: isFirst,
    bonusPoints,
    score: participant.score,
    completionTime: completionTime.toFixed(1),
    rank: getLeaderboard().findIndex(p => p.id === socketId) + 1,
    total: Object.keys(gameState.participants).length,
  });
  broadcastLeaderboard();
}

// Advance participant to next question after a delay
function advanceParticipant(socketId, delay = 1800) {
  setTimeout(() => {
    const participant = gameState.participants[socketId];
    const progress = gameState.participantProgress[socketId];
    if (!participant || !progress || gameState.status !== 'question') return;

    const nextIndex = progress.index + 1;
    progress.answered = false;
    progress.index = nextIndex;
    progress.questionStartTime = Date.now();

    if (nextIndex >= quizData.length) {
      handleParticipantComplete(socketId);
    } else {
      sendQuestionToParticipant(socketId, nextIndex);
    }
  }, delay);
}

// ─── Socket.IO ───────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  // ── SPECTATOR (leaderboard page) ──
  socket.on('spectate', () => {
    socket.join('spectators');
    socket.emit('leaderboard', getLeaderboard());
    socket.emit('participants:count', Object.keys(gameState.participants).length);
  });

  // ── PARTICIPANT: Join ──
  socket.on('join', ({ name }) => {
    if (gameState.participants[socket.id]) return;
    if (Object.keys(gameState.participants).length >= 100) {
      socket.emit('error', 'Quiz is full (100 max)');
      return;
    }
    const colorIndex = Object.keys(gameState.participants).length % COLORS.length;
    const emojiIndex = Math.floor(Math.random() * EMOJIS.length);
    gameState.participants[socket.id] = {
      id: socket.id,
      name: name.trim().substring(0, 20),
      score: 0,
      color: COLORS[colorIndex],
      emoji: EMOJIS[emojiIndex],
    };
    console.log(`Joined: ${name} (total: ${Object.keys(gameState.participants).length})`);

    socket.emit('joined', {
      participant: gameState.participants[socket.id],
      gameStatus: gameState.status,
      participantCount: Object.keys(gameState.participants).length,
    });

    // If quiz is live, start them from Q0
    if (gameState.status === 'question') {
      gameState.participantProgress[socket.id] = {
        index: 0,
        questionStartTime: Date.now(),
        answered: false,
        completedAt: null,
      };
      sendQuestionToParticipant(socket.id, 0);
    }

    io.emit('participants:count', Object.keys(gameState.participants).length);
    broadcastLeaderboard();
  });

  // ── PARTICIPANT: Submit Answer ──
  socket.on('answer', ({ optionIndex }) => {
    const participant = gameState.participants[socket.id];
    if (!participant) return;
    if (gameState.status !== 'question') return;

    const progress = gameState.participantProgress[socket.id];
    if (!progress || progress.answered) return; // Already answered this question

    const currentIndex = progress.index;
    if (currentIndex >= quizData.length) return;

    const timeTaken = (Date.now() - progress.questionStartTime) / 1000;
    const question = quizData[currentIndex];
    const isTimeout = optionIndex === -1;
    const isCorrect = !isTimeout && optionIndex === question.answer;

    progress.answered = true;

    const points = isCorrect ? 1 : (isTimeout ? 0 : -1);
    participant.score += points;

    socket.emit('answer:result', {
      isCorrect,
      isTimeout,
      points,
      score: participant.score,
      correctAnswer: question.answer,
    });
    broadcastLeaderboard();

    // Answer count for admin
    const answeredNow = Object.values(gameState.participantProgress).filter(p => p.answered).length;
    io.emit('answer:count', {
      answered: answeredNow,
      total: Object.keys(gameState.participants).length,
    });

    // Advance to next question after feedback time
    advanceParticipant(socket.id, isTimeout ? 1000 : 1800);
  });

  // ── ADMIN: Authenticate ──
  socket.on('admin:auth', ({ pin }, callback) => {
    if (pin === ADMIN_PIN) {
      socket.join('admins');
      callback({
        success: true,
        quizLength: quizData.length,
        participants: Object.keys(gameState.participants).length,
        status: gameState.status,
      });
    } else {
      callback({ success: false });
    }
  });

  // ── ADMIN: Start Quiz ──
  socket.on('admin:start', () => {
    if (!socket.rooms.has('admins')) return;
    gameState.status = 'question';
    gameState.firstCompleter = null;
    gameState.quizStartTime = Date.now();
    gameState.participantProgress = {};

    // Reset all scores
    Object.values(gameState.participants).forEach(p => { p.score = 0; });

    // Initialize progress and send Q0 to all participants
    Object.keys(gameState.participants).forEach(sid => {
      gameState.participantProgress[sid] = {
        index: 0,
        questionStartTime: Date.now(),
        answered: false,
        completedAt: null,
      };
      sendQuestionToParticipant(sid, 0);
    });

    io.emit('quiz:started');
    io.to('admins').emit('game:status', { status: 'question' });
    broadcastLeaderboard();
    console.log(`Quiz started with ${Object.keys(gameState.participants).length} participants`);
  });

  // ── ADMIN: Force skip current question for all ──
  socket.on('admin:skip', () => {
    if (!socket.rooms.has('admins')) return;
    Object.keys(gameState.participantProgress).forEach(sid => {
      const progress = gameState.participantProgress[sid];
      if (!progress || progress.completedAt != null) return;
      // Force advance with 0 points
      progress.answered = true;
      advanceParticipant(sid, 200);
    });
  });

  // ── ADMIN: End Quiz ──
  socket.on('admin:end', () => {
    if (!socket.rooms.has('admins')) return;
    gameState.status = 'ended';
    io.emit('quiz:ended', { leaderboard: getLeaderboard() });
    io.to('admins').emit('game:status', { status: 'ended' });
  });

  // ── DISCONNECT ──
  socket.on('disconnect', () => {
    delete gameState.participants[socket.id];
    delete gameState.participantProgress[socket.id];
    io.emit('participants:count', Object.keys(gameState.participants).length);
    broadcastLeaderboard();
    console.log(`Disconnected: ${socket.id}`);
  });
});

// ─── Static + Routes ──────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/quiz', (req, res) => res.sendFile(path.join(__dirname, 'public', 'quiz.html')));
app.get('/leaderboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'leaderboard.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

server.listen(PORT, () => {
  console.log(`🔥 MemeVerse Quiz Server running at http://localhost:${PORT}`);
  console.log(`🔑 Admin PIN: ${ADMIN_PIN}`);
});
