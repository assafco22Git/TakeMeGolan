import { redirect } from "next/navigation";
import { getRole } from "@/lib/role";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatDate, durationInDays, rankingColor } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GirlsPage() {
  const role = await getRole();
  if (!role) redirect("/login");

  interface GirlRow { id: string; name: string; origin: string | null; occupation: string | null; startDate: Date; endDate: Date | null; ranking: number; status: string; }
  const girls = (await prisma.girl.findMany({ orderBy: { startDate: "desc" } })) as GirlRow[];

  const active = girls.filter((g) => g.status === "ACTIVE");
  const past = girls.filter((g) => g.status === "PAST");

  return (
    <div className="px-4 py-6 md:px-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Girls</h1>
          <p className="text-slate-400 text-sm mt-0.5">{girls.length} total</p>
        </div>
        {role === "OWNER" && (
          <Link href="/girls/new" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Girl
          </Link>
        )}
      </div>

      {girls.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-4">💙</p>
          <p className="text-lg">No entries yet</p>
          {role === "OWNER" && (
            <Link href="/girls/new" className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">
              Add the first one
            </Link>
          )}
        </div>
      )}

      {active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active</h2>
          <div className="space-y-3">
            {active.map((g) => <GirlCard key={g.id} girl={g} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Past</h2>
          <div className="space-y-3">
            {past.map((g) => <GirlCard key={g.id} girl={g} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function GirlCard({ girl }: { girl: { id: string; name: string; origin: string | null; occupation: string | null; startDate: Date; endDate: Date | null; ranking: number; status: string } }) {
  const days = durationInDays(girl.startDate, girl.endDate);
  const color = rankingColor(girl.ranking);

  return (
    <Link href={`/girls/${girl.id}`}>
      <div className="bg-[#111827] hover:bg-[#1a2436] border border-slate-800 rounded-2xl p-4 flex items-center gap-4 transition-colors cursor-pointer">
        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg" style={{ backgroundColor: color + "22", color }}>
          {girl.ranking}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white truncate">{girl.name}</p>
            {girl.status === "ACTIVE" && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-green-400" />}
          </div>
          <p className="text-slate-400 text-sm truncate">
            {[girl.origin, girl.occupation].filter(Boolean).join(" · ") || "No details"}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-slate-300 text-sm font-medium">{days}d</p>
          <p className="text-slate-500 text-xs">{formatDate(girl.startDate)}</p>
        </div>
      </div>
    </Link>
  );
}
