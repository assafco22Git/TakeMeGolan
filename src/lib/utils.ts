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

export type Vibe = "good" | "bad" | "neutral";

export function vibeColor(vibe: Vibe | string): string {
  if (vibe === "good") return "#f472b6";    // pink
  if (vibe === "bad") return "#1e40af";     // dark blue
  return "#f59e0b";                         // yellow (neutral)
}

export function vibeEmoji(vibe: Vibe | string): string {
  if (vibe === "good") return "💗";
  if (vibe === "bad") return "😞";
  return "🫠";
}

export function vibeLabel(vibe: Vibe | string): string {
  if (vibe === "good") return "Good vibes";
  if (vibe === "bad") return "Bad vibes";
  return "Neutral";
}

export function vibeOrder(vibe: Vibe | string): number {
  if (vibe === "good") return 0;
  if (vibe === "neutral") return 1;
  return 2;
}

export function durationInDays(start: Date | string, end?: Date | string | null): number {
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : new Date();
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
}
