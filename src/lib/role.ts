import { cookies } from "next/headers";

export type Role = "OWNER" | "ADMIN";

export const ROLE_COOKIE = "tmg-role";

export async function getRole(): Promise<Role | null> {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  if (val === "OWNER" || val === "ADMIN") return val;
  return null;
}

export async function requireRole(): Promise<Role> {
  const role = await getRole();
  if (!role) throw new Error("No role selected");
  return role;
}

export function isOwner(role: Role | null): boolean {
  return role === "OWNER";
}
