"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import type { TimelineEntry, TimelinePeriod } from "@/types";
import { vibeColor, vibeEmoji, vibeLabel } from "@/lib/utils";

const LABEL_WIDTH = 82;
const MARGIN_TOP = 8;
const MARGIN_BOTTOM = 32;
const ROW_HEIGHT = 36;
const BAR_SIZE = 12;

function formatDay(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function formatDayFull(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

type ChartEntry = {
  name: string; id: string; vibe: string; status: string;
  hasFirstDate: boolean; startMs: number; endMs: number;
  periods: TimelinePeriod[];
  [key: string]: string | number | boolean | TimelinePeriod[];
};

const CustomTooltip = ({
  active, payload,
}: {
  active?: boolean;
  payload?: { payload: ChartEntry }[];
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isActive = d.status === "ACTIVE";
  const periods: TimelinePeriod[] = d.periods ?? [];

  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl max-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <p className="font-bold text-white">{d.name}</p>
        {!d.hasFirstDate && <span title="No first date yet">🚩</span>}
        {isActive && (
          <>
            <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
            <span className="text-green-400 text-xs font-medium">ongoing</span>
          </>
        )}
      </div>
      <div className="space-y-1 mb-2">
        {periods.map((p, i) => (
          <p key={i} className="text-slate-400 text-xs">
            {periods.length > 1 && (
              <span className="text-amber-400 mr-1">{i === 0 ? "▶" : "↩"}</span>
            )}
            {formatDayFull(p.startMs)} →{" "}
            {i === periods.length - 1 && isActive ? "Now" : formatDayFull(p.endMs)}
          </p>
        ))}
      </div>
      {periods.length > 1 && (
        <p className="text-xs text-amber-400 mb-1">☕ {periods.length - 1} break{periods.length > 2 ? "s" : ""}</p>
      )}
      <p className="font-semibold" style={{ color: vibeColor(d.vibe) }}>
        {vibeEmoji(d.vibe)} {vibeLabel(d.vibe)}
      </p>
    </div>
  );
};

function CustomYTick({
  x, y, payload, redMap, flagMap, isDark, nameToIdMap, onNavigate,
}: {
  x?: string | number; y?: string | number;
  payload?: { value: string };
  redMap: Map<string, boolean>;
  flagMap: Map<string, boolean>;
  isDark: boolean;
  nameToIdMap: Map<string, string>;
  onNavigate: (id: string) => void;
}) {
  const name = payload?.value ?? "";
  const isRed = redMap.get(name) ?? false;
  const hasFlag = flagMap.get(name) ?? false;
  const id = nameToIdMap.get(name);
  const textColor = isRed ? "#f87171" : isDark ? "#e2e8f0" : "#0f172a";
  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={id ? () => onNavigate(id) : undefined}
      style={{ cursor: id ? "pointer" : "default" }}
    >
      <text
        x={hasFlag ? -16 : 0}
        dy={4}
        textAnchor="end"
        fill={textColor}
        fontSize={13}
        fontWeight={600}
        textDecoration={id ? "underline" : undefined}
      >
        {name}
      </text>
      {hasFlag && (
        <text x={0} dy={4} textAnchor="end" fontSize={11}>🚩</text>
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
  const router = useRouter();
  const onNavigate = useCallback((id: string) => router.push(`/girls/${id}`), [router]);

  // Red = PAST girl who never had a first date
  const redMap = useMemo(
    () => new Map(data.map((d) => [d.name, !d.hasFirstDate && d.status === "PAST"])),
    [data]
  );
  // Flag (🚩) = any girl without a first date
  const flagMap = useMemo(
    () => new Map(data.map((d) => [d.name, !d.hasFirstDate])),
    [data]
  );
  const nameToIdMap = useMemo(
    () => new Map(data.map((d) => [d.name, d.id])),
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

  const chartWidth = Math.max(700, totalDays * 5);
  const chartHeight = Math.max(200, data.length * ROW_HEIGHT + MARGIN_TOP + MARGIN_BOTTOM + 24);

  const pad = Math.max(7 * 86400000, totalDays * 86400000 * 0.02);
  const xMin = globalMin - pad;
  const xMax = globalMax + pad;
  const domainSize = xMax - xMin;

  // Month boundary positions (reference lines + label ticks)
  const monthTicks = useMemo(() => {
    const start = new Date(globalMin);
    const end = new Date(globalMax);
    const ticks: number[] = [];
    const cur = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    while (cur <= end) {
      const x = cur.getTime() - xMin;
      if (x > 0 && x < domainSize) ticks.push(x);
      cur.setMonth(cur.getMonth() + 1);
    }
    return ticks;
  }, [globalMin, globalMax, xMin, domainSize]);

  // Labels centred in each month column
  const labelTicks = useMemo(() => {
    const boundaries = [0, ...monthTicks, domainSize];
    return boundaries.slice(0, -1).map((b, i) => (b + boundaries[i + 1]) / 2);
  }, [monthTicks, domainSize]);

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

  const yearXSet = useMemo(() => new Set(yearMarks.map((m) => m.x)), [yearMarks]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, []);

  // Flatten periods into stacked bar fields: seg_off, seg_d0, seg_g0, seg_d1, …
  const { chartData, maxPeriods } = useMemo(() => {
    const maxP = Math.max(1, ...data.map((d) => d.periods?.length ?? 1));
    const entries: ChartEntry[] = data.map((d) => {
      const periods: TimelinePeriod[] = d.periods?.length
        ? d.periods
        : [{ startMs: d.startMs, endMs: d.endMs }];

      const entry: ChartEntry = {
        name: d.name, id: d.id, vibe: d.vibe, status: d.status,
        hasFirstDate: d.hasFirstDate,
        startMs: periods[0].startMs,
        endMs: periods[periods.length - 1].endMs,
        periods,
        seg_off: periods[0].startMs - xMin,
      };
      for (let i = 0; i < maxP; i++) {
        const p = periods[i];
        entry[`seg_d${i}`] = p ? Math.max(p.endMs - p.startMs, 3600000) : 0;
        if (i < maxP - 1) {
          const next = periods[i + 1];
          entry[`seg_g${i}`] = p && next ? Math.max(next.startMs - p.endMs, 0) : 0;
        }
      }
      return entry;
    });
    return { chartData: entries, maxPeriods: maxP };
  }, [data, xMin]);

  const nowRelative = now - xMin;

  const xAxisBase = {
    type: "number" as const,
    domain: [0, domainSize] as [number, number],
    fontSize: 11,
  };

  // Build period bar sets for the right panel
  const periodBars = Array.from({ length: maxPeriods }, (_, i) => [
    <Bar
      key={`d${i}`}
      dataKey={`seg_d${i}`}
      stackId="timeline"
      barSize={BAR_SIZE}
      isAnimationActive={false}
      radius={4}
    >
      {chartData.map((e) => (
        <Cell
          key={String(e.id) + i}
          fill={Number(e[`seg_d${i}`]) > 0 ? vibeColor(String(e.vibe)) : "transparent"}
          fillOpacity={Number(e[`seg_d${i}`]) > 0 ? 0.85 : 0}
        />
      ))}
    </Bar>,
    i < maxPeriods - 1 ? (
      <Bar
        key={`g${i}`}
        dataKey={`seg_g${i}`}
        stackId="timeline"
        fill="transparent"
        isAnimationActive={false}
        barSize={BAR_SIZE}
      />
    ) : null,
  ]).flat();

  // Mirror bars for the label panel (all invisible, same structure)
  const mirrorBars = Array.from({ length: maxPeriods }, (_, i) => [
    <Bar key={`d${i}-m`} dataKey={`seg_d${i}`} stackId="timeline" fill="transparent" isAnimationActive={false} barSize={BAR_SIZE} opacity={0} />,
    i < maxPeriods - 1
      ? <Bar key={`g${i}-m`} dataKey={`seg_g${i}`} stackId="timeline" fill="transparent" isAnimationActive={false} barSize={BAR_SIZE} opacity={0} />
      : null,
  ]).flat();

  return (
    <div className="flex w-full">
      {/* ── Fixed label panel ── */}
      <div className="flex-shrink-0 z-10" style={{ width: LABEL_WIDTH }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            layout="vertical"
            data={chartData}
            margin={{ top: MARGIN_TOP, right: 0, bottom: MARGIN_BOTTOM, left: 8 }}
          >
            <XAxis
              {...xAxisBase}
              ticks={labelTicks}
              height={24}
              tick={{ fill: "transparent", fontSize: 11 }}
              axisLine={{ stroke: "transparent" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={(props) => (
                <CustomYTick {...props} redMap={redMap} flagMap={flagMap} isDark={isDark} nameToIdMap={nameToIdMap} onNavigate={onNavigate} />
              )}
              width={LABEL_WIDTH - 8}
              axisLine={false}
              tickLine={false}
            />
            <Bar key="off-m" dataKey="seg_off" stackId="timeline" fill="transparent" isAnimationActive={false} barSize={BAR_SIZE} opacity={0} />
            {mirrorBars}
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
                ticks={labelTicks}
                height={24}
                tickFormatter={(v) =>
                  new Date(xMin + v).toLocaleDateString("en-US", { month: "short" })
                }
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                axisLine={{ stroke: "#334155" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={0}
                tick={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Today */}
              {nowRelative >= 0 && nowRelative <= domainSize && (
                <ReferenceLine
                  x={nowRelative}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  label={{ value: "Today", position: "insideTopRight", fill: "#f59e0b", fontSize: 10, fontWeight: 600 }}
                />
              )}

              {/* Month lines */}
              {monthTicks.filter((x) => !yearXSet.has(x)).map((x) => (
                <ReferenceLine key={x} x={x} stroke="#334155" strokeWidth={1} strokeDasharray="3 4" />
              ))}

              {/* Year lines */}
              {yearMarks.map(({ year, x }) => (
                <ReferenceLine
                  key={year} x={x}
                  stroke="#475569" strokeWidth={1} strokeDasharray="3 5"
                  label={{ value: String(year), position: "insideTopLeft", fill: "#64748b", fontSize: 11, fontWeight: 700 }}
                />
              ))}

              {/* Row track background on the offset bar */}
              <Bar
                dataKey="seg_off"
                stackId="timeline"
                fill="transparent"
                isAnimationActive={false}
                barSize={BAR_SIZE}
                background={{ fill: isDark ? "#1e293b" : "#e2e8f0", radius: 6 }}
              />

              {/* Period and gap bars */}
              {periodBars}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
