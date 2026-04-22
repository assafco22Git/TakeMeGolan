import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; breakId: string }> }
) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { breakId } = await params;
  await prisma.relationshipBreak.delete({ where: { id: breakId } });
  return NextResponse.json({ ok: true });
}
