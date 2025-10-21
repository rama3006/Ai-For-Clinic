export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const secret = String(req.query.secret || "");
  const expected = process.env.REINDEX_SECRET || "";
  if (!expected) return res.status(500).json({ error: "Missing REINDEX_SECRET env var" });
  if (secret !== expected) return res.status(401).json({ error: "Unauthorized" });

  const clinicId = String(req.query.clinicId || req.query.clinicid || req.query.cid || "CLINIC_DEMO");

  // 👉 Acá iría tu lógica real de indexación (leer Supabase/Sheets y poblar el índice).
  // De momento, devolvemos OK para probar el endpoint.
  return res.status(200).json({ ok: true, clinicId, indexed: 0, note: "Reindex placeholder" });
}
