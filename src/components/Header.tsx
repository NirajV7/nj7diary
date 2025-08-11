"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { downloadBlob, exportJson, exportMarkdown, fetchData } from "@/lib/storage";

export default function Header({ onSearch }: { onSearch?: (q: string) => void }) {
  const [query, setQuery] = useState("");

  async function handleExport(kind: "json" | "md") {
    const data = await fetchData();
    if (kind === "json") {
      downloadBlob(exportJson(data), `nj7diary-export-${new Date().toISOString().slice(0,10)}.json`);
    } else {
      downloadBlob(exportMarkdown(data), `nj7diary-export-${new Date().toISOString().slice(0,10)}.md`);
    }
  }

  useEffect(() => {
    onSearch?.(query);
  }, [query, onSearch]);

  return (
    <header className="sticky top-0 z-10 backdrop-blur bg-background/80 border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <span className="select-none">nj7diary</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" href="/">Daily Log</Link>
          <Link className="px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10" href="/remember">Remember This</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-48 sm:w-64 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
          />
          <div className="flex gap-1">
            <button onClick={() => handleExport("json")} className="px-2 py-1 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">JSON</button>
            <button onClick={() => handleExport("md")} className="px-2 py-1 text-xs rounded-md border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10">MD</button>
          </div>
        </div>
      </div>
    </header>
  );
}
