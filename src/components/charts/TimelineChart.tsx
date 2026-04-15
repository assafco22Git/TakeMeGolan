"use client";

import { useMemo, useRef, useEffect, useState } from "react";
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

const LABEL_WIDTH = 120;
const MARGIN_TOP = 8;
const MARGIN_BOTTOM = 32;
const ROW_HEIGHT = 36;

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDayFull(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const CustomTooltip = ({
  active,
  payload,
  xMin,
}: {
  active?: boolean;
  payload?: { payload: { name: string; vibe: string; startMs: number; endMs: number; status: string; hasFirstDate: boolean } }[];
  xMin: number;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
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
      <p className="font-semibold" style={{ color: vibeColor(d.vibe) }}>
        {vibeEmoji(d.vibe)} {vibeLabel(d.vibe)}
      </p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

function CustomYTick({
  x,
  y,
  payload,
  noFirstDateMap,
  isDark,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value: string };
  noFirstDateMap: Map<string, boolean>;
  isDark: boolean;
}) {
  const name = payload?.value ?? "";
  const noFirstDate = noFirstDateMap.get(name) ?? false;
  const textColor = noFirstDate ? "#f87171" : isDark ? "#e2e8f0" : "#0f172a";
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={noFirstDate ? -16 : 0}
        dy={4}
        textAnchor="end"
        fill={textColor}
        fontSize={13}
        fontWeight={600}
      >
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
  useEffect(() => {
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
  const noFirstDateMap = useMemo(
    () => new Map(data.map((d) => [d.name, !d.hasFirstDate])),
    [data]
  );
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

  // ~5px per day, minimum 700px for the chart content (not counting the label panel)
  const chartWidth = Math.max(700, totalDays * 5);
  const chartHeight = Math.max(200, data.length * ROW_HEIGHT + MARGIN_TOP + MARGIN_BOTTOM + 24);

  const pad = Math.max(7 * 86400000, totalDays * 86400000 * 0.02);
  const xMin = globalMin - pad;
  const xMax = globalMax + pad;
  const domainSize = xMax - xMin;
  const tickCount = Math.max(6, Math.min(30, Math.ceil(totalDays / 30)));

  // Year boundary reference lines
  const yearMarks = useMemo(() => {
    const startYear = new Date(globalMin).getFullYear();
    const endYear = new Date(globalMax).getFullYear();
    const marks: { year: number; x: number }[] = [];
    for (let y = startYear + 1; y <= endYear + 1; y++) {
      const ms = new Date(`${y}-01-01T00:00:00`).getTime();
      const x = ms - xMin;
      if (x > 0 && x < domainSize) marks.push({ year: y, x });
    }
    return marks;
  }, [globalMin, globalMax, xMin, domainSize]);

  // Month boundary reference lines (skip Jan — already covered by year marks)
  const monthMarks = useMemo(() => {
    const start = new Date(globalMin);
    const end = new Date(globalMax);
    const marks: { key: string; x: number }[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (cur <= end) {
      if (cur.getMonth() !== 0) { // skip January (year line handles it)
        const x = cur.getTime() - xMin;
        if (x > 0 && x < domainSize) marks.push({ key: cur.toISOString(), x });
      }
      cur.setMonth(cur.getMonth() + 1);
    }
    return marks;
  }, [globalMin, globalMax, xMin, domainSize]);

  // Scroll to most-recent on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        name: d.name,
        id: d.id,
        vibe: d.vibe,
        status: d.status,
        hasFirstDate: d.hasFirstDate,
        startMs: d.startMs,
        endMs: d.endMs,
        offset: d.startMs - xMin,
        duration: Math.max(d.endMs - d.startMs, 86400000),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data]
  );

  const nowRelative = now - xMin;

  // Shared XAxis props ensure identical tick-label height in both panels
  const xAxisBase = {
    type: "number" as const,
    domain: [0, domainSize] as [number, number],
    fontSize: 11,
  };

  return (
    <div className="flex w-full">
      {/* ── Fixed label panel (does NOT scroll) ── */}
      <div className="flex-shrink-0 z-10" style={{ width: LABEL_WIDTH }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            layout="vertical"
            data={chartData}
            margin={{ top: MARGIN_TOP, right: 0, bottom: MARGIN_BOTTOM, left: 8 }}
          >
            {/* Hidden XAxis keeps the same bottom margin as the right panel */}
            <XAxis
              {...xAxisBase}
              tick={{ fill: "transparent", fontSize: 11 }}
              axisLine={{ stroke: "transparent" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={(props) => (
                <CustomYTick
                  {...props}
                  noFirstDateMap={noFirstDateMap}
                  isDark={isDark}
                />
              )}
              width={LABEL_WIDTH - 8}
              axisLine={false}
              tickLine={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Horizontally scrollable chart ── */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto">
        <div style={{ width: chartWidth, minWidth: "100%" }}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <ComposedChart
              layout="vertical"
              data={chartData}
              margin={{ top: MARGIN_TOP, right: 24, bottom: MARGIN_BOTTOM, left: 0 }}
            >
              <XAxis
                {...xAxisBase}
                tickFormatter={(v) => formatDay(xMin + v)}
                tickCount={tickCount}
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              {/* YAxis hidden — labels rendered in the left panel */}
              <YAxis
                type="category"
                dataKey="name"
                width={0}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip xMin={xMin} />} />

              {/* Today marker */}
              {nowRelative >= 0 && nowRelative <= domainSize && (
                <ReferenceLine
                  x={nowRelative}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  label={{
                    value: "Today",
                    position: "insideTopRight",
                    fill: "#f59e0b",
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Month boundary markers */}
              {monthMarks.map(({ key, x }) => (
                <ReferenceLine
                  key={key}
                  x={x}
                  stroke="#334155"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
              ))}

              {/* Year boundary markers */}
              {yearMarks.map(({ year, x }) => (
                <ReferenceLine
                  key={year}
                  x={x}
                  stroke="#475569"
                  strokeWidth={1}
                  strokeDasharray="3 5"
                  label={{
                    value: String(year),
                    position: "insideTopLeft",
                    fill: "#64748b",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
              ))}

              <Bar
                dataKey="offset"
                stackId="timeline"
                fill="transparent"
                isAnimationActive={false}
                barSize={12}
              />
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
    </div>
  );
}
