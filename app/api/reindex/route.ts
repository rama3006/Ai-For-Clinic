import { NextResponse } from "next/server";
export const runtime = "nodejs";

export function GET(req: Request) {
  const url = new URL(req.url);
  const secret = String(url.searchParams.get("secret") || "");
  const expected = process.env.REINDEX_SECRET || "";
  if (!expected) return NextResponse.json({ error: "Missing REINDEX_SECRET env var" }, { status: 500 });
  if (secret !== expected) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const clinicId = String(
    url.searchParams.get("clinicId") ||
    url.searchParams.get("clinicid") ||
    url.searchParams.get("cid") ||
    "CLINIC_DEMO"
  );

  return NextResponse.json({ ok: true, clinicId, indexed: 0, note: "Reindex placeholder" });
}
