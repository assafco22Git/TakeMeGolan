"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Bar,
} from "recharts";
import type { TimelineEntry } from "@/types";
import { rankingColor } from "@/lib/utils";

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "All";

const RANGES: RangeKey[] = ["1M", "3M", "6M", "1Y", "All"];

const RANGE_MS: Record<RangeKey, number | null> = {
  "1M": 30 * 86400000,
  "3M": 90 * 86400000,
  "6M": 180 * 86400000,
  "1Y": 365 * 86400000,
  "All": null,
};

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayYear(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: TimelineEntry & { x: number; width: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="font-bold text-white">{d.name}</p>
      <p className="text-slate-400">{formatDayYear(d.startMs)} → {d.endMs > Date.now() ? "Now" : formatDayYear(d.endMs)}</p>
      <p className="text-blue-400 font-semibold">Ranking: {d.ranking}/10</p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

export default function TimelineChart({ data }: { data: TimelineEntry[] }) {
  const [range, setRange] = useState<RangeKey>("All");

  const allChartData = useMemo(() => {
    return data.map((entry) => ({
      ...entry,
      x: entry.startMs,
      width: Math.max(entry.endMs - entry.startMs, 86400000), // min 1 day
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No data yet
      </div>
    );
  }

  const now = Date.now();
  const globalMin = Math.min(...data.map((d) => d.startMs));
  const globalMax = Math.max(...data.map((d) => d.endMs));

  const rangeMs = RANGE_MS[range];
  const domainMin = rangeMs ? Math.max(globalMin, now - rangeMs) : globalMin;
  const domainMax = globalMax;
  const padding = Math.max((domainMax - domainMin) * 0.03, 86400000);

  // Only show entries that overlap the visible range
  const visibleData = allChartData.filter(
    (d) => d.endMs >= domainMin && d.startMs <= domainMax
  );

  // Pick tick count based on range span in days
  const spanDays = (domainMax - domainMin) / 86400000;
  const tickCount = spanDays <= 31 ? Math.ceil(spanDays) : spanDays <= 180 ? 6 : 8;

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex gap-1.5 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === r
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, visibleData.length * 52 + 40)}>
        <ComposedChart
          layout="vertical"
          data={visibleData}
          margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={[domainMin - padding, domainMax + padding]}
            scale="time"
            tickFormatter={formatDay}
            tickCount={tickCount}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#e2e8f0", fontSize: 13 }}
            axisLine={false}
            tickLine={false}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="width" background={{ fill: "#1e293b", radius: 6 }} radius={6} minPointSize={8}>
            {visibleData.map((entry) => (
              <Cell key={entry.id} fill={rankingColor(entry.ranking)} fillOpacity={0.85} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
