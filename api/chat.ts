// arriba del archivo, nada
async function callOpenAI(message: string) { /* ...tu mismo código... */ }

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || "");
    if (!message) return res.status(400).json({ error: "Missing 'message' in body" });

    const reply = await callOpenAI(message);

    // --- NUEVO: guardar en Supabase (server-to-server) ---
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_KEY!; // server key (ya la pusiste)
    const db = createClient(url, key, { auth: { persistSession: false } });

    await db.from("messages").insert([{ role: "user", content: message }]);
    await db.from("messages").insert([{ role: "assistant", content: reply }]);
    // -----------------------------------------------------

    return res.status(200).json({ reply });
  } catch (e: any) {
    return res.status(200).json({
      reply: "Sorry, something went wrong. Want the booking link?",
      error: String(e?.message || e)
    });
  }
}
