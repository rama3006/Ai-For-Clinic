// api/health.ts  (Node.js Serverless)
export default function handler(req: any, res: any) {
  try {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(200).end(
      JSON.stringify({ ok: true, route: "/api/health", now: new Date().toISOString() })
    );
  } catch (e: any) {
    console.error("health error:", e);
    res.status(500).end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
  }
}
