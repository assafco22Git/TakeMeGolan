import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import Link from "next/link";
import LeaderboardTable from "@/components/charts/LeaderboardTable";
import { DashboardTimelineChart, DashboardCustomChart } from "@/components/charts/DashboardCharts";
import { prisma } from "@/lib/prisma";
import { vibeOrder } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface BreakRow { startDate: Date; endDate: Date; }
interface GirlRow {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  startDate: Date | null;
  endDate: Date | null;
  matchedDate: Date | null;
  vibe: string;
  status: string;
  breaks: BreakRow[];
}

async function getStats() {
  let girls: GirlRow[] = [];
  try {
    girls = (await prisma.girl.findMany({
      orderBy: { matchedDate: "asc" },
      include: { breaks: { orderBy: { startDate: "asc" } } },
    })) as GirlRow[];
  } catch {
    return { timeline: [], leaderboard: [], distribution: [], goodCount: 0 };
  }

  function dur(start: Date | null, end?: Date | null) {
    const s = start ?? new Date();
    return Math.max(1, Math.floor(((end ?? new Date()).getTime() - s.getTime()) / 86400000));
  }

  function effectiveStart(g: GirlRow): Date {
    return g.startDate ?? g.matchedDate ?? new Date();
  }

  function computePeriods(g: GirlRow) {
    const start = effectiveStart(g).getTime();
    const end = (g.endDate ?? new Date()).getTime();
    if (!g.breaks?.length) return [{ startMs: start, endMs: end }];
    const periods: { startMs: number; endMs: number }[] = [];
    let cur = start;
    for (const brk of g.breaks) {
      const bs = brk.startDate.getTime();
      const be = brk.endDate.getTime();
      if (bs > cur) periods.push({ startMs: cur, endMs: bs });
      cur = be;
    }
    if (cur < end) periods.push({ startMs: cur, endMs: end });
    return periods.length ? periods : [{ startMs: start, endMs: end }];
  }

  const timeline = girls.map((g) => {
    const periods = computePeriods(g);
    return {
      id: g.id,
      name: g.name,
      startMs: periods[0].startMs,
      endMs: periods[periods.length - 1].endMs,
      periods,
      vibe: g.vibe as "good" | "bad" | "neutral",
      status: g.status as "ACTIVE" | "PAST",
      hasFirstDate: g.startDate !== null,
    };
  });

  const leaderboard = [...girls]
    .sort((a, b) => vibeOrder(a.vibe) - vibeOrder(b.vibe))
    .map((g) => ({
      id: g.id,
      name: g.name,
      origin: g.origin,
      occupation: g.occupation,
      vibe: g.vibe as "good" | "bad" | "neutral",
      durationDays: dur(g.startDate, g.endDate),
      status: g.status as "ACTIVE" | "PAST",
      hasFirstDate: g.startDate !== null,
    }));

  const originMap = new Map<string, { count: number }>();
  for (const g of girls) {
    const key = g.origin || "Unknown";
    const e = originMap.get(key) ?? { count: 0 };
    originMap.set(key, { count: e.count + 1 });
  }
  const distribution = Array.from(originMap.entries())
    .map(([label, { count }]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const goodCount = girls.filter((g) => g.vibe === "good").length;

  return { timeline, leaderboard, distribution, goodCount };
}

export default async function DashboardPage() {
  const role = await getRole();
  if (!role) redirect("/login");

  const { timeline, leaderboard, distribution, goodCount } = await getStats();
  const activeCount = timeline.filter((t) => t.status === "ACTIVE").length;

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
          <p className="text-slate-500 text-xs uppercase tracking-wider">Good Vibes</p>
          <p className="text-3xl font-bold mt-1" style={{ color: "#f472b6" }}>{goodCount} 💗</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h2 className="text-slate-900 dark:text-white font-semibold">Relationship Timeline</h2>
          <p className="text-slate-500 text-xs mt-0.5">Duration &amp; vibe over time</p>
        </div>
        <DashboardTimelineChart data={timeline} />
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
        <div className="mb-4">
          <h2 className="text-slate-900 dark:text-white font-semibold">Leaderboard</h2>
          <p className="text-slate-500 text-xs mt-0.5">Sorted by vibe</p>
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
