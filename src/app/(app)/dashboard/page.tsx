import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import Link from "next/link";
import LeaderboardTable from "@/components/charts/LeaderboardTable";
import { DashboardTimelineChart, DashboardCustomChart } from "@/components/charts/DashboardCharts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface GirlRow {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  startDate: Date | null;
  endDate: Date | null;
  matchedDate: Date | null;
  ranking: number;
  status: string;
}

async function getStats() {
  let girls: GirlRow[] = [];
  try {
    girls = (await prisma.girl.findMany({ orderBy: { matchedDate: "asc" } })) as GirlRow[];
  } catch {
    return { timeline: [], leaderboard: [], distribution: [] };
  }

  function dur(start: Date | null, end?: Date | null) {
    const s = start ?? new Date();
    return Math.max(1, Math.floor(((end ?? new Date()).getTime() - s.getTime()) / 86400000));
  }

  function effectiveStart(g: GirlRow): Date {
    return g.startDate ?? g.matchedDate ?? new Date();
  }

  const timeline = girls.map((g) => ({
    id: g.id,
    name: g.name,
    startMs: effectiveStart(g).getTime(),
    endMs: (g.endDate ?? new Date()).getTime(),
    ranking: g.ranking,
    status: g.status as "ACTIVE" | "PAST",
    hasFirstDate: g.startDate !== null,
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
      hasFirstDate: g.startDate !== null,
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
  const role = await getRole();
  if (!role) redirect("/login");

  const { timeline, leaderboard, distribution } = await getStats();
  const activeCount = timeline.filter((t) => t.status === "ACTIVE").length;
  const avgRanking =
    leaderboard.length > 0
      ? Math.round((leaderboard.reduce((s, g) => s + g.ranking, 0) / leaderboard.length) * 10) / 10
      : 0;

  return (
    <div className="px-4 py-6 md:px-8 max-w-5xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Golan&apos;s dating overview</p>
        </div>
        {role === "OWNER" && (
          <Link href="/girls/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add
          </Link>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Total</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{leaderboard.length}</p>
        </div>
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Active</p>
          <p className="text-3xl font-bold text-green-500 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-xs uppercase tracking-wider">Avg Rank</p>
          <p className="text-3xl font-bold text-blue-500 mt-1">{avgRanking || "—"}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h2 className="text-slate-900 dark:text-white font-semibold">Relationship Timeline</h2>
          <p className="text-slate-500 text-xs mt-0.5">Duration &amp; ranking over time</p>
        </div>
        <DashboardTimelineChart data={timeline} />
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h2 className="text-slate-900 dark:text-white font-semibold">Leaderboard</h2>
          <p className="text-slate-500 text-xs mt-0.5">Ranked by score</p>
        </div>
        <LeaderboardTable data={leaderboard} />
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h2 className="text-slate-900 dark:text-white font-semibold">Distribution</h2>
          <p className="text-slate-500 text-xs mt-0.5">Explore data by category</p>
        </div>
        <DashboardCustomChart initialData={distribution} initialGroupBy="origin" />
      </div>
    </div>
  );
}
