import Link from "next/link";
import type { LeaderboardEntry } from "@/types";
import { cn, vibeColor, vibeEmoji, vibeLabel } from "@/lib/utils";

interface Props {
  data: LeaderboardEntry[];
}

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
            <th className="text-right py-2 px-3">Vibe</th>
            <th className="text-right py-2 px-3 hidden sm:table-cell">Days</th>
          </tr>
        </thead>
        <tbody className="space-y-1">
          {data.map((entry, i) => (
            <tr
              key={entry.id}
              className={cn(
                "border rounded-xl transition-colors",
                "border-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50"
              )}
            >
              <td className="py-3 px-3 text-slate-500 text-sm w-10">{i + 1}</td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <Link href={`/girls/${entry.id}`} className={`font-semibold hover:text-blue-500 dark:hover:text-blue-400 transition-colors ${!entry.hasFirstDate && entry.status === "PAST" ? "text-red-500 dark:text-red-400" : "text-slate-900 dark:text-white"}`}>
                    {entry.name}
                  </Link>
                  {entry.status === "ACTIVE" && (
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                  )}
                  {!entry.hasFirstDate && (
                    <span title="No first date yet" className="flex-shrink-0">🚩</span>
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
                  className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ backgroundColor: vibeColor(entry.vibe) + "22", color: vibeColor(entry.vibe) }}
                >
                  {vibeEmoji(entry.vibe)} {vibeLabel(entry.vibe)}
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
