"use client";

import dynamic from "next/dynamic";
import type { TimelineEntry, DistributionEntry } from "@/types";

const TimelineChart = dynamic(() => import("./TimelineChart"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
      Loading chart...
    </div>
  ),
});

const CustomChart = dynamic(() => import("./CustomChart"), {
  ssr: false,
  loading: () => (
    <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
      Loading chart...
    </div>
  ),
});

export function DashboardTimelineChart({ data }: { data: TimelineEntry[] }) {
  return <TimelineChart data={data} />;
}

export function DashboardCustomChart({
  initialData,
  initialGroupBy,
}: {
  initialData: DistributionEntry[];
  initialGroupBy: "origin" | "occupation" | "status";
}) {
  return <CustomChart initialData={initialData} initialGroupBy={initialGroupBy} />;
}
