"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SelectRolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function select(role: "OWNER" | "ADMIN") {
    setLoading(role);
    await fetch("/api/select-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0a0f1e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 text-2xl">
            💙
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Take me Golan</h1>
          <p className="text-slate-500 text-sm mt-1">Who are you?</p>
        </div>

        {/* Role cards */}
        <div className="space-y-4">
          <button
            onClick={() => select("OWNER")}
            disabled={!!loading}
            className="w-full group bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1a2436] border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600 rounded-2xl p-6 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-2xl flex-shrink-0">
                🦁
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">
                  {loading === "OWNER" ? "Loading..." : "I'm Golan"}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">Full access — add, edit &amp; delete</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 group-hover:text-blue-500 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => select("ADMIN")}
            disabled={!!loading}
            className="w-full group bg-white dark:bg-[#111827] hover:bg-slate-50 dark:hover:bg-[#1a2436] border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 rounded-2xl p-6 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700/40 flex items-center justify-center text-2xl flex-shrink-0">
                👀
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white text-lg">
                  {loading === "ADMIN" ? "Loading..." : "I'm Golan's friend"}
                </p>
                <p className="text-slate-500 text-sm mt-0.5">View &amp; edit — can't add or delete</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-400 ml-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
