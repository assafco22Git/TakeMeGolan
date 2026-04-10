"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Girl } from "@/types";

interface GirlFormProps {
  initial?: Partial<Girl>;
  girlId?: string;
  mode: "create" | "edit";
  readOnly?: boolean;
}

export default function GirlForm({ initial, girlId, mode, readOnly = false }: GirlFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isOngoing = !initial?.endDate;
  const [ongoing, setOngoing] = useState(isOngoing);

  const [form, setForm] = useState({
    name: initial?.name || "",
    origin: initial?.origin || "",
    hometown: initial?.hometown || "",
    occupation: initial?.occupation || "",
    startDate: initial?.startDate ? (initial.startDate as string).slice(0, 10) : "",
    endDate: initial?.endDate ? initial.endDate.slice(0, 10) : "",
    ranking: initial?.ranking?.toString() || "5",
    notes: initial?.notes || "",
    matchedDate: initial?.matchedDate ? initial.matchedDate.slice(0, 10) : "",
    matchedApp: initial?.matchedApp || "",
    firstWhatsapp: initial?.firstWhatsapp ? initial.firstWhatsapp.slice(0, 10) : "",
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
      hometown: form.hometown || null,
      occupation: form.occupation || null,
      startDate: form.startDate ? new Date(form.startDate + "T12:00:00Z").toISOString() : null,
      endDate: ongoing ? null : (form.endDate ? new Date(form.endDate + "T12:00:00Z").toISOString() : null),
      ranking: parseFloat(form.ranking),
      notes: form.notes || null,
      status: ongoing ? "ACTIVE" : "PAST",
      matchedDate: form.matchedDate ? new Date(form.matchedDate + "T12:00:00Z").toISOString() : null,
      matchedApp: form.matchedApp || null,
      firstWhatsapp: form.firstWhatsapp ? new Date(form.firstWhatsapp + "T12:00:00Z").toISOString() : null,
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
        const msg = typeof data.error === "string" ? data.error : data.error?.formErrors?.[0] ?? JSON.stringify(data.error);
      throw new Error(msg || "Something went wrong");
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
    `w-full bg-slate-50 dark:bg-[#0a0f1e] border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-sm${readOnly ? " opacity-70 cursor-default" : ""}`;
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {readOnly && (
        <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          View only — switch to Golan to make changes
        </div>
      )}
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
            required={!readOnly}
            disabled={readOnly}
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
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>Current City</label>
          <input
            type="text"
            value={form.hometown}
            onChange={(e) => set("hometown", e.target.value)}
            className={inputClass}
            placeholder="e.g. Tel Aviv, Berlin"
            disabled={readOnly}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>Occupation</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => set("occupation", e.target.value)}
            className={inputClass}
            placeholder="e.g. Designer, Engineer"
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>First Date</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className={inputClass}
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>End Date</label>
          {/* Still ongoing toggle */}
          <label className="flex items-center gap-2 mb-2 cursor-pointer w-fit">
            <div
              onClick={() => !readOnly && setOngoing((v) => !v)}
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
              disabled={readOnly}
            />
          )}
        </div>
        <div>
          <label className={labelClass}>Matched Date *</label>
          <input
            type="date"
            value={form.matchedDate}
            onChange={(e) => set("matchedDate", e.target.value)}
            className={inputClass}
            required={!readOnly}
            disabled={readOnly}
          />
        </div>

        <div>
          <label className={labelClass}>Matched App</label>
          <select
            value={form.matchedApp}
            onChange={(e) => set("matchedApp", e.target.value)}
            className={inputClass}
            disabled={readOnly}
          >
            <option value="">— select app —</option>
            <option value="Hinge">Hinge</option>
            <option value="Tinder">Tinder</option>
            <option value="OKCupid">OKCupid</option>
            <option value="Bumble">Bumble</option>
            <option value="Matchmaking">Matchmaking</option>
            <option value="Met her on my own">Met her on my own</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>First WhatsApp Conversation</label>
          <input
            type="date"
            value={form.firstWhatsapp}
            onChange={(e) => set("firstWhatsapp", e.target.value)}
            className={inputClass}
            disabled={readOnly}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>
          Ranking: <span className="text-blue-400 font-bold">{parseFloat(form.ranking).toFixed(1)}/10</span>
        </label>
        <input
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={form.ranking}
          onChange={(e) => set("ranking", e.target.value)}
          className="w-full accent-blue-500"
          disabled={readOnly}
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
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
          disabled={readOnly}
        />
      </div>

      {!readOnly && (
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
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
      )}
    </form>
  );
}
