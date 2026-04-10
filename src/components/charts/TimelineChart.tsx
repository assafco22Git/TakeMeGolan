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
  payload?: { payload: { name: string; ranking: number; startMs: number; endMs: number; offset: number; duration: number; status: string } }[];
  xMin: number;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d || d.duration === 0) return null;
  const isActive = d.status === "ACTIVE";
  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <div className="flex items-center gap-2 mb-1">
        <p className="font-bold text-white">{d.name}</p>
        {isActive && (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-green-400 text-xs font-medium">ongoing</span>
          </>
        )}
      </div>
      <p className="text-slate-400">
        {formatDayFull(d.startMs)} → {isActive ? "Now" : formatDayFull(d.endMs)}
      </p>
      <p className="text-blue-400 font-semibold">Ranking: {d.ranking}/10</p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

function CustomYTick({ x, y, payload, statusMap, noFirstDateMap, isDark }: { x?: string | number; y?: string | number; payload?: { value: string }; statusMap: Map<string, string>; noFirstDateMap: Map<string, boolean>; isDark: boolean }) {
  const name = payload?.value ?? "";
  const textColor = isDark ? "#e2e8f0" : "#0f172a";
  const noFirstDate = noFirstDateMap.get(name) ?? false;
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={noFirstDate ? -16 : 0} dy={4} textAnchor="end" fill={textColor} fontSize={13} fontWeight={600}>
        {name}
      </text>
      {noFirstDate && (
        <text x={0} dy={4} textAnchor="end" fontSize={11}>
          🚩
        </text>
      )}
    </g>
  );
}

function useDarkMode() {
  const [isDark, setIsDark] = useState(true);
  useMemo(() => {
    if (typeof document === "undefined") return;
    setIsDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

export default function TimelineChart({ data }: { data: TimelineEntry[] }) {
  const [range, setRange] = useState<RangeKey>("All");
  const isDark = useDarkMode();
  const statusMap = useMemo(() => new Map(data.map((d) => [d.name, d.status])), [data]);
  const noFirstDateMap = useMemo(() => new Map(data.map((d) => [d.name, !d.hasFirstDate])), [data]);

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
          key={range}
          layout="vertical"
          data={chartData}
          margin={{ top: 28, right: 24, bottom: 8, left: 60 }}
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
            tick={(props) => <CustomYTick {...props} statusMap={statusMap} noFirstDateMap={noFirstDateMap} isDark={isDark} />}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip xMin={xMin} />} />

          {/* Today reference line */}
          <ReferenceLine
            x={now - xMin}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 3"
            label={{ value: "Today", position: "insideTopRight", fill: "#f59e0b", fontSize: 10, fontWeight: 600 }}
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
