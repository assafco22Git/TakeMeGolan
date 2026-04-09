import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LeaderboardTable from "@/components/charts/LeaderboardTable";
import { DashboardTimelineChart, DashboardCustomChart } from "@/components/charts/DashboardCharts";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/types";

export const dynamic = "force-dynamic";

interface GirlRow {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  startDate: Date;
  endDate: Date | null;
  ranking: number;
  status: string;
}

async function getStats() {
  const girls = (await prisma.girl.findMany({ orderBy: { startDate: "asc" } })) as GirlRow[];

  function dur(start: Date, end?: Date | null) {
    return Math.max(1, Math.floor(((end ?? new Date()).getTime() - start.getTime()) / 86400000));
  }

  const timeline = girls.map((g) => ({
    id: g.id,
    name: g.name,
    startMs: g.startDate.getTime(),
    endMs: (g.endDate ?? new Date()).getTime(),
    ranking: g.ranking,
    status: g.status as "ACTIVE" | "PAST",
  }));

  const leaderboard = [...girls]
    .sort((a, b) => b.ranking - a.ranking)
    .map((g) => ({
      id: g.id,
      name: g.name,
      origin: g.origin,
      occupation: g.occupation,
      ranking: g.ranking,
      durationDays: dur(g.startDate, g.endDate),
      status: g.status as "ACTIVE" | "PAST",
    }));

  const originMap = new Map<string, { count: number; total: number }>();
  for (const g of girls) {
    const key = g.origin || "Unknown";
    const e = originMap.get(key) ?? { count: 0, total: 0 };
    originMap.set(key, { count: e.count + 1, total: e.total + g.ranking });
  }
  const distribution = Array.from(originMap.entries())
    .map(([label, { count, total }]) => ({
      label,
      count,
      avgRanking: Math.round((total / count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  return { timeline, leaderboard, distribution };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as unknown as { role: Role }).role;
  const { timeline, leaderboard, distribution } = await getStats();

  const activeCount = timeline.filter((t) => t.status === "ACTIVE").length;
  const avgRanking =
    leaderboard.length > 0
      ? Math.round((leaderboard.reduce((s, g) => s + g.ranking, 0) / leaderboard.length) * 10) / 10
      : 0;

  return (
    <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Golan&apos;s dating overview</p>
        </div>
        {role === "OWNER" && (
          <Link
            href="/girls/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Link>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Total</p>
          <p className="text-3xl font-bold text-white mt-1">{leaderboard.length}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Active</p>
          <p className="text-3xl font-bold text-green-400 mt-1">{activeCount}</p>
        </div>
        <div className="bg-[#111827] rounded-2xl p-4 border border-slate-800">
          <p className="text-slate-400 text-xs uppercase tracking-wider">Avg Rank</p>
          <p className="text-3xl font-bold text-blue-400 mt-1">{avgRanking || "—"}</p>
        </div>
      </div>

      {/* Timeline chart */}
      <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
        <div className="mb-4">
          <h2 className="text-white font-semibold">Relationship Timeline</h2>
          <p className="text-slate-400 text-xs mt-0.5">Duration &amp; ranking over time</p>
        </div>
        <DashboardTimelineChart data={timeline} />
      </div>

      {/* Leaderboard */}
      <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
        <div className="mb-4">
          <h2 className="text-white font-semibold">Leaderboard</h2>
          <p className="text-slate-400 text-xs mt-0.5">Ranked by score</p>
        </div>
        <LeaderboardTable data={leaderboard} />
      </div>

      {/* Custom chart */}
      <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
        <div className="mb-4">
          <h2 className="text-white font-semibold">Distribution</h2>
          <p className="text-slate-400 text-xs mt-0.5">Explore data by category</p>
        </div>
        <DashboardCustomChart initialData={distribution} initialGroupBy="origin" />
      </div>
    </div>
  );
}
