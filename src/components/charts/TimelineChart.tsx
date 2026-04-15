"use client";

import { useMemo, useState, useCallback } from "react";
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
import { vibeColor, vibeEmoji, vibeLabel } from "@/lib/utils";

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "All";

const RANGES: RangeKey[] = ["1M", "3M", "6M", "1Y", "All"];

const RANGE_MS: Record<RangeKey, number | null> = {
  "1M": 30 * 86400000,
  "3M": 90 * 86400000,
  "6M": 180 * 86400000,
  "1Y": 365 * 86400000,
  All: null,
};

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
    month: "short", day: "numeric", year: "numeric",
  });
}

const CustomTooltip = ({
  active, payload, xMin,
}: {
  active?: boolean;
  payload?: { payload: { name: string; vibe: string; startMs: number; endMs: number; offset: number; duration: number; status: string; hasFirstDate: boolean } }[];
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
        {!d.hasFirstDate && <span title="No first date yet">🚩</span>}
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
      <p className="font-semibold" style={{ color: vibeColor(d.vibe) }}>{vibeEmoji(d.vibe)} {vibeLabel(d.vibe)}</p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

function CustomYTick({ x, y, payload, noFirstDateMap, isDark }: {
  x?: string | number; y?: string | number;
  payload?: { value: string };
  noFirstDateMap: Map<string, boolean>;
  isDark: boolean;
}) {
  const name = payload?.value ?? "";
  const noFirstDate = noFirstDateMap.get(name) ?? false;
  const textColor = noFirstDate ? "#f87171" : (isDark ? "#e2e8f0" : "#0f172a");
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={noFirstDate ? -16 : 0} dy={4} textAnchor="end" fill={textColor} fontSize={13} fontWeight={600}>
        {name}
      </text>
      {noFirstDate && (
        <text x={0} dy={4} textAnchor="end" fontSize={11}>🚩</text>
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
  const [panOffset, setPanOffset] = useState(0); // ms to shift left from the default right-anchored view
  const isDark = useDarkMode();
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
  const windowSize = rangeMs ?? (globalMax - globalMin + 2 * 86400000);

  // Default right edge: globalMax + small pad. Pan shifts both edges left.
  const pad = Math.max(windowSize * 0.04, 86400000);
  const defaultRight = globalMax + pad;
  const xMax = defaultRight - panOffset;
  const xMin = xMax - windowSize;

  // Clamp: can't pan right of default, can't pan so far left that xMin < globalMin - pad
  const canPanLeft = panOffset < (defaultRight - globalMin - windowSize + pad);
  const canPanRight = panOffset > 0;

  const panStep = windowSize * 0.5;

  const panLeft = useCallback(() => {
    setPanOffset((prev) => Math.min(prev + panStep, defaultRight - globalMin - windowSize + pad));
  }, [panStep, defaultRight, globalMin, windowSize, pad]);

  const panRight = useCallback(() => {
    setPanOffset((prev) => Math.max(prev - panStep, 0));
  }, [panStep]);

  // Reset pan when range changes
  const handleRangeChange = useCallback((r: RangeKey) => {
    setRange(r);
    setPanOffset(0);
  }, []);

  const chartData = useMemo(() => {
    return data
      .filter((d) => d.endMs >= xMin && d.startMs <= xMax)
      .map((d) => {
        const clampedStart = Math.max(d.startMs, xMin);
        const clampedEnd = Math.min(d.endMs, xMax);
        return {
          name: d.name,
          id: d.id,
          vibe: d.vibe,
          status: d.status,
          hasFirstDate: d.hasFirstDate,
          startMs: d.startMs,
          endMs: d.endMs,
          offset: clampedStart - xMin,
          duration: Math.max(clampedEnd - clampedStart, 86400000),
        };
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, range, panOffset]);

  const domainMax = windowSize + pad;
  const nowRelative = now - xMin;

  return (
    <div className="space-y-3">
      {/* Controls row */}
      <div className="flex items-center justify-between gap-2">
        {/* Range selector */}
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => handleRangeChange(r)}
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

        {/* Pan buttons */}
        {range !== "All" && (
          <div className="flex items-center gap-1">
            <button
              onClick={panLeft}
              disabled={!canPanLeft}
              title="Scroll left (older)"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={panRight}
              disabled={!canPanRight}
              title="Scroll right (newer)"
              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 40)}>
        <ComposedChart
          key={`${range}-${panOffset}`}
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
            tick={(props) => <CustomYTick {...props} noFirstDateMap={noFirstDateMap} isDark={isDark} />}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip content={<CustomTooltip xMin={xMin} />} />

          {/* Today reference line — only show if in visible window */}
          {nowRelative >= 0 && nowRelative <= domainMax && (
            <ReferenceLine
              x={nowRelative}
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="4 3"
              label={{ value: "Today", position: "insideTopRight", fill: "#f59e0b", fontSize: 10, fontWeight: 600 }}
            />
          )}

          <Bar dataKey="offset" stackId="timeline" fill="transparent" isAnimationActive={false} barSize={12} />
          <Bar
            dataKey="duration"
            stackId="timeline"
            radius={6}
            background={{ fill: isDark ? "#1e293b" : "#e2e8f0", radius: 6 }}
            isAnimationActive={false}
            barSize={12}
          >
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={vibeColor(entry.vibe)} fillOpacity={0.85} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
