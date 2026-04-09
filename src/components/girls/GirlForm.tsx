"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Girl } from "@/types";

interface GirlFormProps {
  initial?: Partial<Girl>;
  girlId?: string;
  mode: "create" | "edit";
}

export default function GirlForm({ initial, girlId, mode }: GirlFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOngoing = !initial?.endDate;
  const [ongoing, setOngoing] = useState(isOngoing);

  const [form, setForm] = useState({
    name: initial?.name || "",
    origin: initial?.origin || "",
    occupation: initial?.occupation || "",
    startDate: initial?.startDate ? initial.startDate.slice(0, 10) : "",
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : "",
    ranking: initial?.ranking?.toString() || "5",
    notes: initial?.notes || "",
    status: initial?.status || "ACTIVE",
  });

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      name: form.name,
      origin: form.origin || null,
      occupation: form.occupation || null,
      startDate: form.startDate ? new Date(form.startDate + "T12:00:00Z").toISOString() : null,
      endDate: ongoing ? null : (form.endDate ? new Date(form.endDate + "T12:00:00Z").toISOString() : null),
      ranking: parseInt(form.ranking),
      notes: form.notes || null,
      status: form.status,
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/girls" : `/api/girls/${girlId}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const text = await res.text();
      const data = text ? JSON.parse(text) : {};

      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Something went wrong");
      }

      router.push("/girls");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full bg-[#0a0f1e] border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputClass}
            placeholder="Her name"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Origin</label>
          <input
            type="text"
            value={form.origin}
            onChange={(e) => set("origin", e.target.value)}
            className={inputClass}
            placeholder="e.g. Tel Aviv, New York"
          />
        </div>

        <div>
          <label className={labelClass}>Occupation</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            className={inputClass}
            placeholder="e.g. Designer, Engineer"
          />
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className={inputClass}
          >
            <option value="ACTIVE">Active 💚</option>
            <option value="PAST">Past 💀</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className={inputClass}
            required
          />
        </div>

        <div>
          <label className={labelClass}>End Date</label>
          {/* Still ongoing toggle */}
          <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
            <div
              onClick={() => setOngoing((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${ongoing ? "bg-green-500" : "bg-slate-700"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${ongoing ? "translate-x-4" : "translate-x-0"}`} />
            </div>
            <span className="text-sm text-slate-400">Still ongoing 💚</span>
          </label>
          {!ongoing && (
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => set("endDate", e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Ranking: <span className="text-blue-400 font-bold">{form.ranking}/10</span>
        </label>
        <input
          type="range"
          min={1}
          max={10}
          value={form.ranking}
          onChange={(e) => set("ranking", e.target.value)}
          className="w-full accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>1</span>
          <span>5</span>
          <span>10</span>
        </div>
      </div>

      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className={inputClass}
          rows={3}
          placeholder="Any thoughts..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold transition-colors text-sm"
        >
          {loading ? "Saving..." : mode === "create" ? "Add Girl" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
