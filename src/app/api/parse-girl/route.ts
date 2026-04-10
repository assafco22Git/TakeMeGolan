import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { cookies } from "next/headers";
import { ROLE_COOKIE } from "@/lib/role";

async function getRole() {
  const store = await cookies();
  const val = store.get(ROLE_COOKIE)?.value;
  return val === "OWNER" || val === "ADMIN" ? val : null;
}

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const role = await getRole();
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "OWNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { transcript } = await req.json();
  if (!transcript || typeof transcript !== "string") {
    return NextResponse.json({ error: "Missing transcript" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `You are helping fill in a dating tracker form. Extract the following fields from this spoken description and return ONLY a valid JSON object. Today's date is ${today}.

Fields to extract:
- name (string, required) — her first name
- origin (string or null) — where she's originally from (city/country)
- hometown (string or null) — the city she currently lives in
- occupation (string or null) — her job/profession
- ranking (number 0-10, default 5) — how attractive/interesting she is
- matchedApp (string or null) — one of: Hinge, Tinder, OKCupid, Bumble, Matchmaking, "Met her on my own", or null
- matchedDate (string or null) — date they matched, as YYYY-MM-DD
- startDate (string or null) — date of their first date, as YYYY-MM-DD
- endDate (string or null) — date they stopped seeing each other, as YYYY-MM-DD, null if still ongoing
- firstWhatsapp (string or null) — date of first WhatsApp conversation, as YYYY-MM-DD
- notes (string or null) — any extra notes or description

Return ONLY the JSON object, no explanation. If a field is not mentioned, use null (or 5 for ranking).

Spoken description: "${transcript}"`,
      },
    ],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";

  // Strip markdown code fences if present
  const json = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  try {
    const parsed = JSON.parse(json);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response", raw }, { status: 500 });
  }
}
