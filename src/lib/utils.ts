import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "Present";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function rankingColor(ranking: number): string {
  if (ranking >= 9) return "#f59e0b"; // gold
  if (ranking >= 7) return "#3b82f6"; // blue
  if (ranking >= 5) return "#6366f1"; // indigo
  return "#64748b"; // slate
}

export function durationInDays(start: Date | string, end?: Date | string | null): number {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
