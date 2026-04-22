export type Role = "OWNER" | "ADMIN";
export type Status = "ACTIVE" | "PAST";
export type Vibe = "good" | "bad" | "neutral";

export interface Girl {
  id: string;
  name: string;
  origin: string | null;
  hometown: string | null;
  occupation: string | null;
  startDate: string | null;
  endDate: string | null;
  vibe: Vibe;
  notes: string | null;
  status: Status;
  matchedDate: string | null;
  matchedApp: string | null;
  firstWhatsapp: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
  role: Role;
}

export interface TimelinePeriod {
  startMs: number;
  endMs: number;
}

export interface TimelineEntry {
  id: string;
  name: string;
  startMs: number;   // first period start
  endMs: number;     // last period end
  periods: TimelinePeriod[];
  vibe: Vibe;
  status: Status;
  hasFirstDate: boolean;
}

export interface RelationshipBreak {
  id: string;
  girlId: string;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  origin: string | null;
  occupation: string | null;
  vibe: Vibe;
  durationDays: number;
  status: Status;
  hasFirstDate: boolean;
}

export interface DistributionEntry {
  label: string;
  count: number;
}

export interface MonthlyStats {
  month: string;
  newEntries: number;
  activeCount: number;
  topGirl: string | null;
}

export type ChartGroupBy = "origin" | "occupation" | "status" | "matchedApp";
