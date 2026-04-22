export function formatTimeLeft(ms) {
  if (!ms || ms <= 0) return 0;
  return Math.ceil(ms / 1000);
}

export function safeName(input) {
  return input.trim().slice(0, 30);
}

export function pointsForAnswer(isCorrect, timedOut) {
  if (timedOut) return 0;
  return isCorrect ? 1 : -1;
}