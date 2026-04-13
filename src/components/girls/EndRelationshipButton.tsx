"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EndRelationshipButton({ girlId }: { girlId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function confirm() {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await fetch(`/api/girls/${girlId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAST",
          endDate: new Date(today + "T12:00:00Z").toISOString(),
          endReason: reason.trim() || null,
        }),
      });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-300 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
        End Relationship
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 p-4 space-y-3">
      <p className="text-sm font-semibold text-red-600 dark:text-red-400">End this relationship?</p>
      <p className="text-xs text-slate-500">Today&apos;s date will be set as the end date. This can be changed later.</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Reason (optional)"
        className="w-full resize-none bg-white dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 transition"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setReason(""); }}
          className="flex-1 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={loading}
          className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {loading ? "Saving…" : "Confirm"}
        </button>
      </div>
    </div>
  );
}
