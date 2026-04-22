import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";
import { z } from "zod/v4";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

const BreakSchema = z.object({
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const breaks = await prisma.relationshipBreak.findMany({
    where: { girlId: id },
    orderBy: { startDate: "asc" },
  });
  return NextResponse.json(
    breaks.map((b) => ({
      ...b,
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      createdAt: b.createdAt.toISOString(),
    }))
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = BreakSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { startDate, endDate } = body.data;
  if (new Date(startDate) >= new Date(endDate)) {
    return NextResponse.json({ error: "Break end must be after start" }, { status: 400 });
  }

  const brk = await prisma.relationshipBreak.create({
    data: { girlId: id, startDate: new Date(startDate), endDate: new Date(endDate) },
  });

  return NextResponse.json({
    ...brk,
    startDate: brk.startDate.toISOString(),
    endDate: brk.endDate.toISOString(),
    createdAt: brk.createdAt.toISOString(),
  });
}
