import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";
import { vibeOrder } from "@/lib/utils";
import type { TimelineEntry, TimelinePeriod, LeaderboardEntry, DistributionEntry, MonthlyStats, ChartGroupBy } from "@/types";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

function durationDays(start: Date | null, end?: Date | null): number {
  const s = start ?? new Date();
  return Math.max(1, Math.floor(((end ?? new Date()).getTime() - s.getTime()) / 86400000));
}

export async function GET(req: NextRequest) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "all";
  const groupBy = (searchParams.get("groupBy") || "origin") as ChartGroupBy;

  interface BreakRow { id: string; girlId: string; startDate: Date; endDate: Date; }
  interface GirlRow { id: string; name: string; origin: string | null; occupation: string | null; startDate: Date | null; endDate: Date | null; matchedDate: Date | null; vibe: string; status: string; matchedApp: string | null; breaks: BreakRow[]; }
  const girls = (await prisma.girl.findMany({
    orderBy: { matchedDate: "asc" },
    include: { breaks: { orderBy: { startDate: "asc" } } },
  })) as GirlRow[];

  function effectiveStart(g: GirlRow): Date {
    return g.startDate ?? g.matchedDate ?? new Date();
  }

  function computePeriods(g: GirlRow): TimelinePeriod[] {
    const start = effectiveStart(g).getTime();
    const end = (g.endDate ?? new Date()).getTime();
    if (!g.breaks.length) return [{ startMs: start, endMs: end }];

    const periods: TimelinePeriod[] = [];
    let cur = start;
    for (const brk of g.breaks) {
      const brkStart = brk.startDate.getTime();
      const brkEnd = brk.endDate.getTime();
      if (brkStart > cur) periods.push({ startMs: cur, endMs: brkStart });
      cur = brkEnd;
    }
    if (cur < end) periods.push({ startMs: cur, endMs: end });
    return periods.length ? periods : [{ startMs: start, endMs: end }];
  }

  const timeline: TimelineEntry[] = girls.map((g) => {
    const periods = computePeriods(g);
    return {
      id: g.id, name: g.name,
      startMs: periods[0].startMs,
      endMs: periods[periods.length - 1].endMs,
      periods,
      vibe: g.vibe as "good" | "bad" | "neutral",
      status: g.status as "ACTIVE" | "PAST",
      hasFirstDate: g.startDate !== null,
    };
  });

  const leaderboard: LeaderboardEntry[] = [...girls]
    .sort((a, b) => vibeOrder(a.vibe) - vibeOrder(b.vibe))
    .map((g) => ({
      id: g.id, name: g.name, origin: g.origin, occupation: g.occupation,
      vibe: g.vibe as "good" | "bad" | "neutral",
      durationDays: durationDays(g.startDate ?? g.matchedDate ?? new Date(), g.endDate),
      status: g.status as "ACTIVE" | "PAST",
      hasFirstDate: g.startDate !== null,
    }));

  const distMap = new Map<string, { count: number }>();
  for (const g of girls) {
    const key = groupBy === "status" ? g.status : groupBy === "occupation" ? (g.occupation || "Unknown") : groupBy === "matchedApp" ? (g.matchedApp || "Unknown") : (g.origin || "Unknown");
    const e = distMap.get(key) ?? { count: 0 };
    distMap.set(key, { count: e.count + 1 });
  }
  const distribution: DistributionEntry[] = Array.from(distMap.entries())
    .map(([label, { count }]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  const monthMap = new Map<string, { newEntries: number; girls: string[] }>();
  for (const g of girls) {
    const month = effectiveStart(g).toISOString().slice(0, 7);
    const e = monthMap.get(month) ?? { newEntries: 0, girls: [] };
    monthMap.set(month, { newEntries: e.newEntries + 1, girls: [...e.girls, g.name] });
  }
  const monthly: MonthlyStats[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { newEntries, girls: mg }]) => ({
      month, newEntries, activeCount: girls.filter(g => g.status === "ACTIVE").length,
      topGirl: mg[0] ?? null,
    }));

  if (view === "monthly") return NextResponse.json({ monthly });
  return NextResponse.json({ timeline, leaderboard, distribution, monthly });
}
