export type Role = "OWNER" | "ADMIN";
export type Status = "ACTIVE" | "PAST";

export interface Girl {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  startDate: string;
  endDate: string | null;
  ranking: number;
  notes: string | null;
  status: Status;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface TimelineEntry {
  id: string;
  name: string;
  startMs: number;
  endMs: number;
  ranking: number;
  status: Status;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  ranking: number;
  durationDays: number;
  status: Status;
}

export interface DistributionEntry {
  label: string;
  count: number;
  avgRanking: number;
}

export interface MonthlyStats {
  month: string; // "2024-01"
  newEntries: number;
  activeCount: number;
  avgRanking: number;
  topGirl: string | null;
}

export type ChartGroupBy = "origin" | "occupation" | "status";
