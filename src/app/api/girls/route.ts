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

const createGirlSchema = z.object({
  name: z.string().min(1).max(100),
  origin: z.string().max(100).optional().nullable(),
  occupation: z.string().max(100).optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  ranking: z.number().min(1).max(10),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "PAST"]).default("ACTIVE"),
});

export async function GET() {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const girls = await prisma.girl.findMany({ orderBy: { startDate: "desc" } });
  return NextResponse.json(girls);
}

export async function POST(req: NextRequest) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createGirlSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const girl = await prisma.girl.create({
      data: {
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });
    return NextResponse.json(girl, { status: 201 });
  } catch (err) {
    console.error("DB error creating girl:", err);
    return NextResponse.json({ error: "Database error: " + (err instanceof Error ? err.message : String(err)) }, { status: 500 });
  }
}
