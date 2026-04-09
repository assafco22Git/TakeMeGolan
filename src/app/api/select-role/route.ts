import { NextRequest, NextResponse } from "next/server";
import { ROLE_COOKIE } from "@/lib/role";

export async function POST(req: NextRequest) {
  const { role } = await req.json();

  if (role !== "OWNER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ROLE_COOKIE);
  return res;
}
