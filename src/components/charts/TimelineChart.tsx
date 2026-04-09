"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
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
  All: null,
};

// How many ticks to show per range
const RANGE_TICKS: Record<RangeKey, number> = {
  "1M": 10,
  "3M": 12,
  "6M": 12,
  "1Y": 13,
  All: 8,
};

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayFull(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const CustomTooltip = ({
  active,
  payload,
  xMin,
}: {
  active?: boolean;
  payload?: { payload: { name: string; ranking: number; startMs: number; endMs: number; offset: number; duration: number } }[];
  xMin: number;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.duration === 0) return null;
  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="font-bold text-white">{d.name}</p>
      <p className="text-slate-400">
        {formatDayFull(d.startMs)} → {d.endMs > Date.now() ? "Now" : formatDayFull(d.endMs)}
      </p>
      <p className="text-blue-400 font-semibold">Ranking: {d.ranking}/10</p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

export default function TimelineChart({ data }: { data: TimelineEntry[] }) {
  const [range, setRange] = useState<RangeKey>("All");

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
  // xMin: left edge of the visible window
  const xMin = rangeMs ? Math.max(globalMin, now - rangeMs) : globalMin;
  const xMax = globalMax;
  const pad = Math.max((xMax - xMin) * 0.04, 86400000); // at least 1 day padding

  // Build relative chart data: offset (invisible lead) + duration (visible bar)
  // Both values are in ms, relative to xMin so the domain is [0, xMax-xMin+pad]
  const chartData = useMemo(() => {
    return data
      .filter((d) => d.endMs >= xMin && d.startMs <= xMax)
      .map((d) => {
        const clampedStart = Math.max(d.startMs, xMin);
        const clampedEnd = Math.min(d.endMs, xMax);
        return {
          name: d.name,
          id: d.id,
          ranking: d.ranking,
          status: d.status,
          startMs: d.startMs,
          endMs: d.endMs,
          offset: clampedStart - xMin,
          duration: Math.max(clampedEnd - clampedStart, 86400000), // min 1 day
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, range]);

  const domainMax = xMax - xMin + pad;

  return (
    <div className="space-y-3">
      {/* Range selector */}
      <div className="flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              range === r
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 40)}>
        <ComposedChart
          layout="vertical"
          data={chartData}
          margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
        >
          <XAxis
            type="number"
            domain={[0, domainMax]}
            tickFormatter={(v) => formatDay(xMin + v)}
            tickCount={RANGE_TICKS[range]}
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
          <Tooltip content={<CustomTooltip xMin={xMin} />} />

          {/* Today reference line */}
          <ReferenceLine
            x={now - xMin}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{ value: "Today", position: "top", fill: "#f59e0b", fontSize: 10, fontWeight: 600 }}
          />

          {/* Invisible offset bar — pushes the visible bar to the right start position */}
          <Bar dataKey="offset" stackId="timeline" fill="transparent" isAnimationActive={false} barSize={12} />

          {/* Visible duration bar */}
          <Bar
            dataKey="duration"
            stackId="timeline"
            radius={6}
            background={{ fill: "#1e293b", radius: 6 }}
            isAnimationActive={false}
            barSize={12}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={rankingColor(entry.ranking)} fillOpacity={0.85} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
