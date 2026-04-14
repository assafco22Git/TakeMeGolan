import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { rankingColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface GirlRow { id: string; name: string; startDate: Date | null; matchedDate: Date | null; ranking: number; }

async function getMonthlyData() {
  try {
    const girls = (await prisma.girl.findMany({ orderBy: { matchedDate: "asc" } })) as GirlRow[];
    const monthMap = new Map<string, { month: string; label: string; newGirls: { id: string; name: string; ranking: number; hasFirstDate: boolean }[]; totalRanking: number }>();

    for (const g of girls) {
      const ref = g.startDate ?? g.matchedDate;
      if (!ref) continue;
      const month = ref.toISOString().slice(0, 7);
      const label = new Date(ref).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const existing = monthMap.get(month) ?? { month, label, newGirls: [], totalRanking: 0 };
      existing.newGirls.push({ id: g.id, name: g.name, ranking: g.ranking, hasFirstDate: !!g.startDate });
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
  } catch {
    return [];
  }
}

async function getActiveCount() {
  try {
    return await prisma.girl.count({ where: { status: "ACTIVE" } });
  } catch {
    return 0;
  }
}

export default async function MonthlyPage() {
  const role = await getRole();
  if (!role) redirect("/login");

  const [months, currentlyActive] = await Promise.all([getMonthlyData(), getActiveCount()]);

  return (
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Monthly Summary</h1>
        <p className="text-slate-500 text-sm mt-0.5">
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
          <div key={m.month} className="bg-white dark:bg-[#111827] rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-slate-900 dark:text-white font-semibold text-lg">{m.label}</h2>
                <p className="text-slate-500 text-xs">
                  {m.newGirls.length} new entr{m.newGirls.length === 1 ? "y" : "ies"} · avg {m.avgRanking}/10
                </p>
              </div>
              {m.topGirl && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Top this month</p>
                  <Link href={`/girls/${m.topGirl.id}`} className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 justify-end">
                    {m.topGirl.name}
                    {!m.topGirl.hasFirstDate && <span>🚩</span>}
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {m.newGirls.map((g) => (
                <Link key={g.id} href={`/girls/${g.id}`} className="flex items-center gap-2 bg-slate-100 dark:bg-[#0a0f1e] border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 hover:border-slate-400 dark:hover:border-slate-600 transition-colors">
                  <span className="text-xs font-bold" style={{ color: rankingColor(g.ranking) }}>{g.ranking}</span>
                  <span className={`text-sm ${!g.hasFirstDate ? "text-red-500 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>{g.name}</span>
                  {!g.hasFirstDate && <span className="text-xs">🚩</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
