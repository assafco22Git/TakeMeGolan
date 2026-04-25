import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";
import { z } from "zod";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

const updateGirlSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  origin: z.string().max(100).optional().nullable(),
  hometown: z.string().max(100).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  vibe: z.enum(["good", "bad", "neutral"]).optional(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "PAST"]).optional(),
  matchedDate: z.string().datetime().optional(),
  matchedApp: z.string().max(50).optional().nullable(),
  firstWhatsapp: z.string().datetime().optional().nullable(),
  endReason: z.string().max(500).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const girl = await prisma.girl.findUnique({ where: { id } });
  if (!girl) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(girl);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const parsed = updateGirlSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await prisma.girl.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate !== undefined) data.startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  if (parsed.data.endDate !== undefined) data.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  if (parsed.data.matchedDate !== undefined) data.matchedDate = parsed.data.matchedDate ? new Date(parsed.data.matchedDate) : null;
  if (parsed.data.firstWhatsapp !== undefined) data.firstWhatsapp = parsed.data.firstWhatsapp ? new Date(parsed.data.firstWhatsapp) : null;

  try {
    const girl = await prisma.girl.update({ where: { id }, data });
    return NextResponse.json(girl);
  } catch (err) {
    console.error("DB error updating girl:", err);
    return NextResponse.json({ error: "Database error: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.girl.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.girl.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
