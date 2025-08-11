"use client";
import { useEffect, useState } from "react";
import { DiaryData, Note } from "@/lib/types";
import { addNote, deleteNote, loadData, saveData, updateNote, fetchData } from "@/lib/storage";

export default function RememberThis() {
  const [data, setData] = useState<DiaryData>(() => loadData());
  const [draft, setDraft] = useState<{ title: string; content: string }>(() => ({ title: "", content: "" }));

  // initial load from Firestore
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const latest = await fetchData();
      if (!cancelled) setData(structuredClone(latest));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // autosave on data change
  useEffect(() => {
    const id = setTimeout(() => saveData(data), 150);
    return () => clearTimeout(id);
  }, [data]);

  function createNote() {
    const payload = {
      title: draft.title.trim() || "Untitled",
      content: draft.content,
    } as Omit<Note, "id" | "createdAt">;
    const d = structuredClone(data);
    addNote(d, payload);
    setData(d);
    setDraft({ title: "", content: "" });
  }

  function patchNote(id: string, patch: Partial<Note>) {
    const d = structuredClone(data);
    updateNote(d, id, patch);
    setData(d);
  }

  function removeNote(id: string) {
    const d = structuredClone(data);
    deleteNote(d, id);
    setData(d);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-6 grid grid-cols-1 gap-2">
        <input
          value={draft.title}
          onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
          placeholder="Note title"
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        />
        <textarea
          value={draft.content}
          onChange={(e) => setDraft((s) => ({ ...s, content: e.target.value }))}
          placeholder="Content"
          rows={3}
          className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
        />
        <button
          onClick={createNote}
          className="rounded-md border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 px-3 py-2 text-sm"
        >
          Add Note
        </button>
      </div>

      <ul className="space-y-3">
        {data.notes.map((n) => (
          <li key={n.id} className="rounded-md border border-black/10 dark:border-white/10 p-3">
            <div className="flex items-start gap-2">
              <input
                value={n.title}
                onChange={(e) => patchNote(n.id, { title: e.target.value })}
                className="flex-1 bg-transparent text-base font-semibold outline-none"
              />
              <button
                onClick={() => removeNote(n.id)}
                className="px-2 py-1 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10"
              >
                Delete
              </button>
            </div>
            <div className="mt-2">
              <textarea
                value={n.content}
                onChange={(e) => patchNote(n.id, { content: e.target.value })}
                rows={Math.max(3, n.content.split("\n").length)}
                className="w-full resize-y rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
              />
            </div>
            <div className="mt-2 text-xs text-black/60 dark:text-white/60">Created: {new Date(n.createdAt).toLocaleString()}</div>
          </li>
        ))}
      </ul>

      {!data.notes.length && (
        <div className="text-sm text-black/60 dark:text-white/60">No notes yet. Create one above.</div>
      )}
    </div>
  );
}
