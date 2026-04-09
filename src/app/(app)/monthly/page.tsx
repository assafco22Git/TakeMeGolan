import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, rankingColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GirlRow { id: string; name: string; startDate: Date; ranking: number; }

async function getMonthlyData() {
  const girls = (await prisma.girl.findMany({ orderBy: { startDate: "asc" } })) as GirlRow[];

  const monthMap = new Map<
    string,
    {
      month: string;
      label: string;
      newGirls: { id: string; name: string; ranking: number }[];
      totalRanking: number;
    }
  >();

  for (const g of girls) {
    const month = g.startDate.toISOString().slice(0, 7);
    const label = new Date(g.startDate).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    const existing = monthMap.get(month) ?? { month, label, newGirls: [], totalRanking: 0 };
    existing.newGirls.push({ id: g.id, name: g.name, ranking: g.ranking });
    existing.totalRanking += g.ranking;
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((m) => ({
      ...m,
      avgRanking: Math.round((m.totalRanking / m.newGirls.length) * 10) / 10,
      topGirl: [...m.newGirls].sort((a, b) => b.ranking - a.ranking)[0] ?? null,
    }));
}

export default async function MonthlyPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const months = await getMonthlyData();
  const currentlyActive = await prisma.girl.count({ where: { status: "ACTIVE" } });

  return (
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Monthly Summary</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {currentlyActive} active · {months.length} months tracked
        </p>
      </div>

      {months.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-4">📅</p>
          <p>No data yet</p>
        </div>
      )}

      <div className="space-y-4">
        {months.map((m) => (
          <div key={m.month} className="bg-[#111827] rounded-2xl p-5 border border-slate-800">
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-semibold text-lg">{m.label}</h2>
                <p className="text-slate-400 text-xs">
                  {m.newGirls.length} new entr{m.newGirls.length === 1 ? "y" : "ies"} · avg {m.avgRanking}/10
                </p>
              </div>
              {m.topGirl && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Top this month</p>
                  <Link href={`/girls/${m.topGirl.id}`} className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                    {m.topGirl.name}
                  </Link>
                </div>
              )}
            </div>

            {/* Girls this month */}
            <div className="flex flex-wrap gap-2">
              {m.newGirls.map((g) => (
                <Link
                  key={g.id}
                  href={`/girls/${g.id}`}
                  className="flex items-center gap-2 bg-[#0a0f1e] border border-slate-800 rounded-xl px-3 py-1.5 hover:border-slate-600 transition-colors"
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: rankingColor(g.ranking) }}
                  >
                    {g.ranking}
                  </span>
                  <span className="text-sm text-slate-300">{g.name}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
