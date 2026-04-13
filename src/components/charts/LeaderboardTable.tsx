import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { cn } from "@/lib/utils";

interface Props {
  data: LeaderboardEntry[];
}

const medals = ["🥇", "🥈", "🥉"];
const medalStyles = [
  "bg-yellow-500/10 border-yellow-500/30",
  "bg-slate-400/10 border-slate-400/30",
  "bg-orange-700/10 border-orange-600/30",
];

export default function LeaderboardTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
        No data yet
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs uppercase tracking-wider">
            <th className="text-left py-2 px-3">#</th>
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">Origin</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">Job</th>
            <th className="text-right py-2 px-3">Rank</th>
            <th className="text-right py-2 px-3 hidden sm:table-cell">Days</th>
          </tr>
        </thead>
        <tbody className="space-y-1">
          {data.map((entry, i) => (
            <tr
              key={entry.id}
              className={cn(
                "border rounded-xl transition-colors",
                i < 3 ? medalStyles[i] : "border-transparent hover:bg-slate-800/50"
              )}
            >
              <td className="py-3 px-3 font-bold text-lg w-10">
                {i < 3 ? medals[i] : <span className="text-slate-500 text-sm">{i + 1}</span>}
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <Link href={`/girls/${entry.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                    {entry.name}
                  </Link>
                  {entry.status === "ACTIVE" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                  {!entry.hasFirstDate && (
                    <span title="No first date yet" className="flex-shrink-0">🫠</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-3 text-slate-400 hidden sm:table-cell">
                {entry.origin || "—"}
              </td>
              <td className="py-3 px-3 text-slate-400 hidden sm:table-cell">
                {entry.occupation || "—"}
              </td>
              <td className="py-3 px-3 text-right">
                <span
                  className="font-bold text-base"
                  style={{ color: entry.ranking >= 8 ? "#f59e0b" : entry.ranking >= 6 ? "#3b82f6" : "#94a3b8" }}
                >
                  {entry.ranking}
                </span>
              </td>
              <td className="py-3 px-3 text-right text-slate-400 hidden sm:table-cell">
                {entry.durationDays}d
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
