"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { DistributionEntry, ChartGroupBy } from "@/types";

interface Props {
  initialData: DistributionEntry[];
  initialGroupBy: ChartGroupBy;
}

const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DistributionEntry }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="font-bold text-white">{d.label}</p>
      <p className="text-slate-300">{d.count} girl{d.count !== 1 ? "s" : ""}</p>
      <p className="text-blue-400">Avg ranking: {d.avgRanking}/10</p>
    </div>
  );
};

export default function CustomChart({ initialData, initialGroupBy }: Props) {
  const [groupBy, setGroupBy] = useState<ChartGroupBy>(initialGroupBy);
  const [data, setData] = useState<DistributionEntry[]>(initialData);
  const [loading, setLoading] = useState(false);

  async function changeGroupBy(next: ChartGroupBy) {
    setGroupBy(next);
    setLoading(true);
    try {
      const res = await fetch(`/api/stats?groupBy=${next}`);
      const json = await res.json();
      setData(json.distribution || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  const options: { value: ChartGroupBy; label: string }[] = [
    { value: "origin", label: "By Origin" },
    { value: "occupation", label: "By Occupation" },
    { value: "status", label: "By Status" },
    { value: "matchedApp", label: "By App" },
  ];

  return (
    <div className="space-y-4">
      {/* Dimension selector */}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => changeGroupBy(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              groupBy === opt.value
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
          No data yet
        </div>
      ) : (
        <div className={loading ? "opacity-50 pointer-events-none" : ""}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
