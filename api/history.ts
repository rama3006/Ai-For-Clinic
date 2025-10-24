export default async function handler(req: any, res: any) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, { auth: { persistSession: false } });
    const { data, error } = await db
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    res.status(200).json({ data });
  } catch (e: any) {
    res.status(500).json({ error: String(e?.message || e) });
  }
}
