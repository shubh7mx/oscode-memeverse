import crypto from "node:crypto";
import { cookies } from "next/headers";

const PARTICIPANT_ID_COOKIE = "mv_pid";
const PARTICIPANT_TOKEN_COOKIE = "mv_ptk";
const ADMIN_COOKIE = "mv_admin";

export function createParticipantToken() {
  return crypto.randomBytes(24).toString("hex");
}

export function setParticipantCookies(response, participantId, token) {
  response.cookies.set(PARTICIPANT_ID_COOKIE, participantId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  response.cookies.set(PARTICIPANT_TOKEN_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export function clearParticipantCookies(response) {
  response.cookies.set(PARTICIPANT_ID_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  response.cookies.set(PARTICIPANT_TOKEN_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getParticipantAuth() {
  const store = await cookies();
  const id = store.get(PARTICIPANT_ID_COOKIE)?.value;
  const token = store.get(PARTICIPANT_TOKEN_COOKIE)?.value;
  if (!id || !token) return null;
  return { id, token };
}

export function setAdminCookie(response) {
  response.cookies.set(ADMIN_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}

export async function isAdmin() {
  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === "1";
}
