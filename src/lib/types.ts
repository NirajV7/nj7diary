export type Mood = "😊" | "😐" | "😠" | "😴" | "🚀" | "🤔";

export interface LogEntry {
  id: string;
  time: string; // ISO time string or human like 10:35 AM; we store ISO for accuracy and format in UI
  text: string;
  mood?: Mood; // at most one mood per entry
  tags?: string[]; // hashtags without the leading '#'
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  entries: LogEntry[];
}

export interface Note {
  id: string;
  title: string;
  content: string; // plain text
  createdAt: string; // ISO
}

export interface DiaryData {
  logs: Record<string, DailyLog>; // keyed by YYYY-MM-DD
  notes: Note[];
}
