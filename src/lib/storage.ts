"use client";
import { DiaryData, DailyLog, LogEntry, Note } from "./types";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const KEY = "nj7diary:data:v1";
const DIARY_DOC = doc(db, "diary", "default");

export function loadData(): DiaryData {
  // synchronous: use local cache for initial render
  if (typeof window === "undefined") {
    return defaultData();
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultData();
    const parsed = JSON.parse(raw) as DiaryData;
    return {
      logs: parsed.logs ?? {},
      notes: parsed.notes ?? [],
    } as DiaryData;
  } catch {
    return defaultData();
  }
}

export async function fetchData(): Promise<DiaryData> {
  try {
    const snap = await getDoc(DIARY_DOC);
    if (snap.exists()) {
      const data = snap.data() as DiaryData;
      // cache locally for faster boot next time
      if (typeof window !== "undefined") {
        localStorage.setItem(KEY, JSON.stringify(data));
      }
      return sanitizeData(data);
    }
  } catch {
    // ignore network errors; fall back to local
  }
  return loadData();
}

export function saveData(data: DiaryData) {
  // fire-and-forget persist to Firestore and update cache
  const sanitized = sanitizeData(data);
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(sanitized));
  }
  // best-effort async write; swallow errors to avoid unhandled rejections in UI
  void setDoc(DIARY_DOC, sanitized).catch(() => {});
}

export function defaultData(): DiaryData {
  return { logs: {}, notes: [] } as DiaryData;
}

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function ensureDay(data: DiaryData, ymd: string): DailyLog {
  if (!data.logs[ymd]) {
    data.logs[ymd] = { date: ymd, entries: [] };
  }
  return data.logs[ymd];
}

export function addEntry(data: DiaryData, text: string, opts?: { mood?: LogEntry["mood"]; tags?: string[] }): LogEntry {
  const now = new Date();
  const entry: LogEntry = {
    id: cryptoRandomId(),
    time: now.toISOString(),
    text,
    mood: opts?.mood,
    tags: opts?.tags?.filter(Boolean),
  };
  const day = ensureDay(data, todayKey(now));
  day.entries.push(entry);
  return entry;
}

export function updateEntry(data: DiaryData, dayKey: string, entryId: string, patch: Partial<LogEntry>) {
  const day = ensureDay(data, dayKey);
  const idx = day.entries.findIndex((e) => e.id === entryId);
  if (idx >= 0) {
    day.entries[idx] = { ...day.entries[idx], ...patch };
  }
}

export function deleteEntry(data: DiaryData, dayKey: string, entryId: string) {
  const day = ensureDay(data, dayKey);
  day.entries = day.entries.filter((e) => e.id !== entryId);
}

export function addNote(data: DiaryData, note: Omit<Note, "id" | "createdAt">): Note {
  const n: Note = { ...note, id: cryptoRandomId(), createdAt: new Date().toISOString() };
  data.notes.push(n);
  return n;
}

export function updateNote(data: DiaryData, id: string, patch: Partial<Note>) {
  const idx = data.notes.findIndex((n) => n.id === id);
  if (idx >= 0) {
    data.notes[idx] = { ...data.notes[idx], ...patch };
  }
}

export function deleteNote(data: DiaryData, id: string) {
  data.notes = data.notes.filter((n) => n.id !== id);
}

export function exportJson(data: DiaryData): Blob {
  return new Blob([JSON.stringify(sanitizeData(data), null, 2)], { type: "application/json" });
}

export function exportMarkdown(data: DiaryData): Blob {
  const lines: string[] = [];
  lines.push(`# nj7diary Export`);
  lines.push("");
  lines.push("## Daily Logs");
  const days = Object.values(data.logs).sort((a, b) => a.date.localeCompare(b.date));
  for (const day of days) {
    lines.push("");
    lines.push(`### ${day.date}`);
    for (const e of day.entries) {
      const t = new Date(e.time);
      const hh = t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      const tags = e.tags?.length ? ` [#${e.tags.join(" #")}]` : "";
      lines.push(`- ${hh}${e.mood ? " " + e.mood : ""}${tags}: ${e.text}`);
    }
  }
  lines.push("");
  lines.push("## Remember This Notes");
  const notes = [...data.notes];
  for (const n of notes) {
    lines.push("");
    lines.push(`### ${n.title}`);
    lines.push(`Created: ${new Date(n.createdAt).toLocaleString()}`);
    lines.push("");
    lines.push(n.content);
  }
  return new Blob([lines.join("\n")], { type: "text/markdown" });
}

export function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function sanitizeData(data: DiaryData): DiaryData {
  // Ensure stable structure and strip all undefined fields (Firestore doesn't allow undefined)
  const logs: DiaryData["logs"] = {};
  for (const [k, v] of Object.entries(data.logs || {})) {
    const entries = (v?.entries || []).map((e) => {
      const out: Partial<LogEntry> = { id: e.id, time: e.time, text: e.text };
      if (e.mood !== undefined) out.mood = e.mood;
      if (Array.isArray(e.tags) && e.tags.length) out.tags = e.tags.filter(Boolean);
      return out as LogEntry;
    });
    logs[k] = { date: v?.date ?? k, entries };
  }
  const notes = (data.notes || []).map((n) => ({
    id: n.id,
    title: n.title,
    content: n.content,
    createdAt: n.createdAt,
  } as Note));
  return { logs, notes } as DiaryData;
}

function cryptoRandomId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return (crypto as Crypto & { randomUUID(): string }).randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
