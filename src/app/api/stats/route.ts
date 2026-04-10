import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";
import type { TimelineEntry, LeaderboardEntry, DistributionEntry, MonthlyStats, ChartGroupBy } from "@/types";

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

  interface GirlRow { id: string; name: string; origin: string | null; occupation: string | null; startDate: Date | null; endDate: Date | null; matchedDate: Date | null; ranking: number; status: string; matchedApp: string | null; }
  const girls = (await prisma.girl.findMany({ orderBy: { matchedDate: "asc" } })) as GirlRow[];

  function effectiveStart(g: GirlRow): Date {
    return g.startDate ?? g.matchedDate ?? new Date();
  }

  const timeline: TimelineEntry[] = girls.map((g) => ({
    id: g.id, name: g.name,
    startMs: effectiveStart(g).getTime(),
    endMs: (g.endDate ?? new Date()).getTime(),
    ranking: g.ranking, status: g.status as "ACTIVE" | "PAST",
  }));

  const leaderboard: LeaderboardEntry[] = [...girls]
    .sort((a, b) => b.ranking - a.ranking)
    .map((g) => ({
      id: g.id, name: g.name, origin: g.origin, occupation: g.occupation,
      ranking: g.ranking, durationDays: durationDays(g.startDate ?? g.matchedDate ?? new Date(), g.endDate),
      status: g.status as "ACTIVE" | "PAST",
    }));

  const distMap = new Map<string, { count: number; total: number }>();
  for (const g of girls) {
    const key = groupBy === "status" ? g.status : groupBy === "occupation" ? (g.occupation || "Unknown") : groupBy === "matchedApp" ? (g.matchedApp || "Unknown") : (g.origin || "Unknown");
    const e = distMap.get(key) ?? { count: 0, total: 0 };
    distMap.set(key, { count: e.count + 1, total: e.total + g.ranking });
  }
  const distribution: DistributionEntry[] = Array.from(distMap.entries())
    .map(([label, { count, total }]) => ({ label, count, avgRanking: Math.round((total / count) * 10) / 10 }))
    .sort((a, b) => b.count - a.count);

  const monthMap = new Map<string, { newEntries: number; totalRanking: number; girls: string[] }>();
  for (const g of girls) {
    const month = effectiveStart(g).toISOString().slice(0, 7);
    const e = monthMap.get(month) ?? { newEntries: 0, totalRanking: 0, girls: [] };
    monthMap.set(month, { newEntries: e.newEntries + 1, totalRanking: e.totalRanking + g.ranking, girls: [...e.girls, g.name] });
  }
  const monthly: MonthlyStats[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { newEntries, totalRanking, girls: mg }]) => ({
      month, newEntries, activeCount: girls.filter(g => g.status === "ACTIVE").length,
      avgRanking: Math.round((totalRanking / newEntries) * 10) / 10, topGirl: mg[0] ?? null,
    }));

  if (view === "monthly") return NextResponse.json({ monthly });
  return NextResponse.json({ timeline, leaderboard, distribution, monthly });
}
