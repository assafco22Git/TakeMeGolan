"use client";

import { useState } from "react";
import type { RelationshipBreak } from "@/types";

// dd/mm/yyyy ↔ yyyy-mm-dd helpers (mirrors GirlForm DateInput logic)
function toDisplay(v: string) {
  if (!v || v.length < 10) return v;
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}
function toISO(v: string): string {
  const digits = v.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(4)}-${digits.slice(2, 4)}-${digits.slice(0, 2)}`;
  }
  return v;
}

function DateInput({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [display, setDisplay] = useState(value ? toDisplay(value) : "");

  function handleChange(raw: string) {
    // auto-insert slashes
    const digits = raw.replace(/\D/g, "");
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + "/" + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + "/" + formatted.slice(5, 9);
    setDisplay(formatted);
    if (digits.length === 8) onChange(toISO(formatted));
  }

  return (
    <div className="flex flex-col gap-1 flex-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <input
        type="text"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        value={display}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
    </div>
  );
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

interface Props {
  girlId: string;
  initialBreaks: RelationshipBreak[];
  role: string;
}

export default function BreaksSection({ girlId, initialBreaks, role }: Props) {
  const [breaks, setBreaks] = useState<RelationshipBreak[]>(initialBreaks);
  const [adding, setAdding] = useState(false);
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addBreak() {
    setError("");
    if (!newStart || !newEnd) { setError("Both dates required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/girls/${girlId}/breaks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: newStart, endDate: newEnd }),
      });
      if (!res.ok) { const j = await res.json(); setError(j.error || "Error"); return; }
      const b: RelationshipBreak = await res.json();
      setBreaks((prev) => [...prev, b].sort((a, z) => a.startDate.localeCompare(z.startDate)));
      setAdding(false);
      setNewStart("");
      setNewEnd("");
    } finally {
      setSaving(false);
    }
  }

  async function removeBreak(id: string) {
    await fetch(`/api/girls/${girlId}/breaks/${id}`, { method: "DELETE" });
    setBreaks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="space-y-3">
      <h2 className="text-slate-900 dark:text-white font-semibold">Breaks</h2>

      {breaks.length === 0 && !adding && (
        <p className="text-sm text-slate-400">No breaks recorded.</p>
      )}

      {breaks.length > 0 && (
        <div className="space-y-2">
          {breaks.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 px-4 py-2.5"
            >
              <div className="flex items-center gap-2 text-sm">
                <span>☕</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {fmt(b.startDate)} — {fmt(b.endDate)}
                </span>
              </div>
              {role === "OWNER" && (
                <button
                  onClick={() => removeBreak(b.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {role === "OWNER" && !adding && (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm font-semibold text-amber-500 hover:text-amber-400 transition-colors"
        >
          <span className="text-base">☕</span> We were on a break!
        </button>
      )}

      {adding && (
        <div className="rounded-xl bg-slate-100 dark:bg-[#0a0f1e] border border-amber-500/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-500">☕ Add a break</p>
          <div className="flex gap-3">
            <DateInput label="Break started" value={newStart} onChange={setNewStart} />
            <DateInput label="Break ended" value={newEnd} onChange={setNewEnd} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={addBreak}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save break"}
            </button>
            <button
              onClick={() => { setAdding(false); setError(""); setNewStart(""); setNewEnd(""); }}
              className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
