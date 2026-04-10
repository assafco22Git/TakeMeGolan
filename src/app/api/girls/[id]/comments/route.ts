import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const comments = await prisma.comment.findMany({
    where: { girlId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(comments);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { text, authorName } = await req.json();
  if (!text?.trim()) return NextResponse.json({ error: "Empty comment" }, { status: 400 });

  const comment = await prisma.comment.create({
    data: { girlId: id, role, text: text.trim(), authorName: authorName?.trim() || null },
  });
  return NextResponse.json(comment);
}
