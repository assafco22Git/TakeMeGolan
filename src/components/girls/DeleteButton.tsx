"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({ girlId }: { girlId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/girls/${girlId}`, { method: "DELETE" });
    router.push("/girls");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-sm hover:bg-slate-800 transition"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50"
        >
          {loading ? "Deleting..." : "Confirm"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="px-4 py-2 rounded-xl border border-red-800 text-red-400 hover:bg-red-900/20 text-sm transition"
    >
      Delete
    </button>
  );
}
