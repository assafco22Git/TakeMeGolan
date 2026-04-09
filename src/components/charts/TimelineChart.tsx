"use client";

import { useMemo } from "react";
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

interface Props {
  data: TimelineEntry[];
}

function formatMs(ms: number) {
  return new Date(ms).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: TimelineEntry & { x: number; width: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-[#1e2a3a] border border-slate-700 rounded-xl px-4 py-3 text-sm shadow-xl">
      <p className="font-bold text-white">{d.name}</p>
      <p className="text-slate-400">{formatMs(d.startMs)} → {d.endMs > Date.now() ? "Now" : formatMs(d.endMs)}</p>
      <p className="text-blue-400 font-semibold">Ranking: {d.ranking}/10</p>
      <p className="text-slate-400">{Math.floor((d.endMs - d.startMs) / 86400000)} days</p>
    </div>
  );
};

export default function TimelineChart({ data }: Props) {
  const chartData = useMemo(() => {
    return data.map((entry) => ({
      ...entry,
      x: entry.startMs,
      width: Math.max(entry.endMs - entry.startMs, 7 * 24 * 3600 * 1000), // min 7 days width
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 text-sm">
        No data yet
      </div>
    );
  }

  const minMs = Math.min(...data.map((d) => d.startMs));
  const maxMs = Math.max(...data.map((d) => d.endMs));
  const padding = (maxMs - minMs) * 0.05;

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 52 + 40)}>
      <ComposedChart
        layout="vertical"
        data={chartData}
        margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
      >
        <XAxis
          type="number"
          dataKey="x"
          domain={[minMs - padding, maxMs + padding]}
          scale="time"
          tickFormatter={formatMs}
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
          {chartData.map((entry) => (
            <Cell key={entry.id} fill={rankingColor(entry.ranking)} fillOpacity={0.85} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
