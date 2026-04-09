import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { TimelineEntry, LeaderboardEntry, DistributionEntry, MonthlyStats, ChartGroupBy } from "@/types";

function durationDays(start: Date, end?: Date | null): number {
  const endDate = end ?? new Date();
  return Math.max(1, Math.floor((endDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "all";
  const groupBy = (searchParams.get("groupBy") || "origin") as ChartGroupBy;

  const girls = await prisma.girl.findMany({ orderBy: { startDate: "asc" } });

  // Timeline data
  const timeline: TimelineEntry[] = girls.map((g) => ({
    id: g.id,
    name: g.name,
    startMs: g.startDate.getTime(),
    endMs: (g.endDate ?? new Date()).getTime(),
    ranking: g.ranking,
    status: g.status as "ACTIVE" | "PAST",
  }));

  // Leaderboard data
  const leaderboard: LeaderboardEntry[] = girls
    .sort((a, b) => b.ranking - a.ranking)
    .map((g) => ({
      id: g.id,
      name: g.name,
      origin: g.origin,
      occupation: g.occupation,
      ranking: g.ranking,
      durationDays: durationDays(g.startDate, g.endDate),
      status: g.status as "ACTIVE" | "PAST",
    }));

  // Distribution data
  const distributionMap = new Map<string, { count: number; totalRanking: number }>();
  for (const g of girls) {
    const key = (() => {
      if (groupBy === "status") return g.status;
      if (groupBy === "occupation") return g.occupation || "Unknown";
      return g.origin || "Unknown";
    })();
    const existing = distributionMap.get(key) ?? { count: 0, totalRanking: 0 };
    distributionMap.set(key, {
      count: existing.count + 1,
      totalRanking: existing.totalRanking + g.ranking,
    });
  }
  const distribution: DistributionEntry[] = Array.from(distributionMap.entries())
    .map(([label, { count, totalRanking }]) => ({
      label,
      count,
      avgRanking: Math.round((totalRanking / count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);

  // Monthly data
  const monthlyMap = new Map<string, { newEntries: number; totalRanking: number; girls: string[] }>();
  for (const g of girls) {
    const month = g.startDate.toISOString().slice(0, 7);
    const existing = monthlyMap.get(month) ?? { newEntries: 0, totalRanking: 0, girls: [] };
    monthlyMap.set(month, {
      newEntries: existing.newEntries + 1,
      totalRanking: existing.totalRanking + g.ranking,
      girls: [...existing.girls, g.name],
    });
  }
  const activeNow = girls.filter((g) => g.status === "ACTIVE").length;
  const monthly: MonthlyStats[] = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { newEntries, totalRanking, girls: monthGirls }]) => ({
      month,
      newEntries,
      activeCount: activeNow,
      avgRanking: Math.round((totalRanking / newEntries) * 10) / 10,
      topGirl: monthGirls[0] ?? null,
    }));

  if (view === "monthly") {
    return NextResponse.json({ monthly });
  }

  return NextResponse.json({ timeline, leaderboard, distribution, monthly });
}
