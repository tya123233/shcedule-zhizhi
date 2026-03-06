"use client";

import type { InterviewSession } from "@/lib/scheduler-bot/types";

const CURRENT_SESSION_KEY = "schedule-interview-current-session";
const SESSION_IDS_KEY = "schedule-interview-session-ids";
const SESSION_KEY_PREFIX = "schedule-interview-session:";
const STORAGE_CHANGE_EVENT = "schedule-interview-storage-changed";

function getSessionKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}${sessionId}`;
}

function readJson<T>(key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function emitStorageChange() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
}

function readSessionIds() {
  return readJson<string[]>(SESSION_IDS_KEY) ?? [];
}

function writeSessionIds(ids: string[]) {
  writeJson(
    SESSION_IDS_KEY,
    Array.from(new Set(ids.filter(Boolean))),
  );
}

export function getCurrentSessionId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(CURRENT_SESSION_KEY);
}

export function setCurrentSessionId(sessionId: string) {
  window.localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
  emitStorageChange();
}

export function saveSessionLocally(session: InterviewSession) {
  if (typeof window === "undefined") {
    return;
  }

  writeJson(getSessionKey(session.id), session);
  writeSessionIds([session.id, ...readSessionIds()]);
  setCurrentSessionId(session.id);
  emitStorageChange();
}

export function getLocalSession(sessionId: string) {
  return readJson<InterviewSession>(getSessionKey(sessionId));
}

export function getLocalSessionRaw(sessionId: string) {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(getSessionKey(sessionId)) ?? "";
}

export function getCurrentLocalSession() {
  const currentSessionId = getCurrentSessionId();
  return currentSessionId ? getLocalSession(currentSessionId) : null;
}

export function listLocalSessions() {
  const sessions = readSessionIds()
    .map((sessionId) => getLocalSession(sessionId))
    .filter((session): session is InterviewSession => Boolean(session));

  return sessions.sort(
    (left, right) =>
      new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
  );
}

export function getLocalSessionsDigest() {
  if (typeof window === "undefined") {
    return "";
  }

  const ids = readSessionIds();
  return JSON.stringify(
    ids.map((sessionId) => [sessionId, window.localStorage.getItem(getSessionKey(sessionId)) ?? ""]),
  );
}

export function subscribeToSessionStore(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(STORAGE_CHANGE_EVENT, handler);

  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(STORAGE_CHANGE_EVENT, handler);
  };
}
