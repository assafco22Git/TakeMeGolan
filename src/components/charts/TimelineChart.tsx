"use client";

import { useMemo, useState, useRef, useEffect } from "react";
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
  const isDark = useDarkMode();
  const noFirstDateMap = useMemo(() => new Map(data.map((d) => [d.name, !d.hasFirstDate])), [data]);
  const scrollRef = useRef<HTMLDivElement>(null);

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
  const totalDays = Math.max(1, Math.ceil((globalMax - globalMin) / 86400000));

  // ~5px per day, minimum 800px — makes the chart horizontally scrollable
  const chartWidth = Math.max(800, totalDays * 5);

  const pad = Math.max(7 * 86400000, totalDays * 86400000 * 0.02);
  const xMin = globalMin - pad;
  const xMax = globalMax + pad;
  const domainSize = xMax - xMin;

  // Roughly one tick per month
  const tickCount = Math.max(6, Math.min(30, Math.ceil(totalDays / 30)));

  // Scroll to the right (most recent) on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const chartData = useMemo(() => {
    return data.map((d) => ({
      name: d.name,
      id: d.id,
      vibe: d.vibe,
      status: d.status,
      hasFirstDate: d.hasFirstDate,
      startMs: d.startMs,
      endMs: d.endMs,
      offset: d.startMs - xMin,
      duration: Math.max(d.endMs - d.startMs, 86400000),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const nowRelative = now - xMin;

  return (
    <div
      ref={scrollRef}
      className="w-full overflow-x-auto rounded-xl"
      style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
    >
      <div style={{ width: chartWidth, minWidth: "100%" }}>
        <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36 + 40)}>
          <ComposedChart
            layout="vertical"
            data={chartData}
            margin={{ top: 28, right: 24, bottom: 8, left: 60 }}
          >
            <XAxis
              type="number"
              domain={[0, domainSize]}
              tickFormatter={(v) => formatDay(xMin + v)}
              tickCount={tickCount}
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

            {/* Today reference line */}
            {nowRelative >= 0 && nowRelative <= domainSize && (
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
    </div>
  );
}
