"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { DiaryData, Mood } from "@/lib/types";
import { addEntry, ensureDay, loadData, saveData, todayKey, deleteEntry, fetchData, defaultData } from "@/lib/storage";

const MOODS: Mood[] = ["😊", "😐", "😠", "😴", "🚀", "🤔"];

function formatDateHeading(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  // Use a fixed locale and UTC timezone to ensure SSR and client render identical output
  return dt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

function formatTime(iso: string) {
  const dt = new Date(iso);
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function DailyLog() {
  // Initialize with defaultData to ensure SSR and client initial render match
  const [data, setData] = useState<DiaryData>(() => defaultData());
  const [selectedDate, setSelectedDate] = useState<string>(() => todayKey());
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood | undefined>(undefined);
  const [tagsInput, setTagsInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial load: first hydrate from local cache, then fetch remote; ensure today exists
  useEffect(() => {
    let cancelled = false;

    // Step 1: local cache (fast, matches client only after hydration)
    const local = loadData();
    const d1 = structuredClone(local);
    ensureDay(d1, todayKey());
    if (!cancelled) setData(d1);

    // Step 2: remote fetch (may overwrite with latest)
    (async () => {
      const latest = await fetchData();
      const d2 = structuredClone(latest);
      ensureDay(d2, todayKey());
      if (!cancelled) setData(d2);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // autosave on data change
  useEffect(() => {
    const id = setTimeout(() => saveData(data), 150);
    return () => clearTimeout(id);
  }, [data]);

  // Scroll to bottom when entries change or date changes
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [selectedDate, data.logs[selectedDate]?.entries.length]);

  // Focus composer on initial mount and when switching dates to today
  useEffect(() => {
    // focus only when the selected date changes to today
    // avoid stealing focus from other inputs like the tags field on regular renders
    if (isToday) inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const isToday = selectedDate === todayKey();

  const day = useMemo(() => {
    return data.logs[selectedDate] ?? { date: selectedDate, entries: [] };
  }, [data.logs, selectedDate]);

  function parseTags(raw: string): string[] {
    return raw
      .split(/[\s,]+/)
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);
  }

  function handleSend() {
    const txt = text.trim();
    if (!txt) return;
    const d = structuredClone(data);
    addEntry(d, txt, { mood, tags: parseTags(tagsInput) });
    setData(d);
    // Immediately persist to Firestore to avoid races with initial fetch/overwrite
    saveData(d);
    setText("");
    setMood(undefined);
    setTagsInput("");
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDelete(entryId: string) {
    if (!isToday) return;
    const d = structuredClone(data);
    deleteEntry(d, selectedDate, entryId);
    setData(d);
    // Persist delete immediately for consistency
    saveData(d);
  }

  // For the date input, cap max at today
  const maxDate = todayKey();

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 pb-24 min-h-[calc(100vh-56px)] flex flex-col">
      <div className="mb-2 flex items-center gap-2">
        <label className="text-sm text-black/60 dark:text-white/60">Jump to date:</label>
        <input
          type="date"
          value={selectedDate}
          max={maxDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        />
        {!isToday && (
          <button
            onClick={() => setSelectedDate(todayKey())}
            className="ml-auto px-2 py-1 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
          >
            Today
          </button>
        )}
        {isToday && <div className="ml-auto text-xs text-black/60 dark:text-white/60">Append-only • Enter to send • Shift+Enter = newline</div>}
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto rounded-md border border-black/10 dark:border-white/10 p-3 flex flex-col justify-end">
        <div className="text-center text-xs text-black/60 dark:text-white/60 mb-2">{formatDateHeading(day.date)}</div>
        <ul className="flex flex-col gap-2">
          {day.entries.map((e) => (
            <li key={e.id} className="flex">
              <div className="w-full rounded-md px-3 py-2 border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 font-mono">
                <div className="text-xs text-black/60 dark:text-white/60 mb-1 flex items-center gap-2">
                  <span>{formatTime(e.time)}</span>
                  {e.mood && <span>{e.mood}</span>}
                  {e.tags?.length ? (
                    <span className="opacity-80">{e.tags.map((t) => `#${t}`).join(" ")}</span>
                  ) : null}
                </div>
                <div className="text-sm whitespace-pre-wrap">{e.text}</div>
                {isToday && (
                  <div className="mt-2 text-right">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-xs px-2 py-1 rounded-md border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/20"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
          {!day.entries.length && (
            <li className="text-center text-sm text-black/60 dark:text-white/60">No entries for this day.</li>
          )}
        </ul>
      </div>

      {isToday && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-black/10 dark:border-white/10 bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto max-w-4xl px-4 py-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  rows={1}
                  className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 resize-none font-mono"
                />
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMood((cur) => (cur === m ? undefined : m))}
                        className={`h-7 w-7 rounded-full border border-black/10 dark:border-white/10 ${mood === m ? "ring-2 ring-black/20 dark:ring-white/20" : "hover:bg-black/5 dark:hover:bg-white/10"}`}
                        title={m}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="#tags (comma or space separated)"
                    className="flex-1 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>
              </div>
              <button
                onClick={handleSend}
                className="self-stretch px-4 py-2 rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-sm"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
