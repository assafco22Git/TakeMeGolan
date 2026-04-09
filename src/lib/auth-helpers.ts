import { auth } from "@/auth";
import type { Session } from "next-auth";
import type { Role } from "@/types";

type SessionWithRole = Session & {
  user: Session["user"] & { role: Role; username: string };
};

export async function getSession(): Promise<SessionWithRole | null> {
  const session = await auth();
  return session as SessionWithRole | null;
}

export async function requireAuth(): Promise<SessionWithRole> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireOwner(): Promise<SessionWithRole> {
  const session = await requireAuth();
  if (session.user.role !== "OWNER") {
    throw new Error("Forbidden: OWNER role required");
  }
  return session;
}

export function isOwner(session: SessionWithRole | null): boolean {
  return session?.user?.role === "OWNER";
}
