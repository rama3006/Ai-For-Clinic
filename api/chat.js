import { createClient } from "@supabase/supabase-js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_KEY;
const EMBED_MODEL    = "text-embedding-3-small"; // 1536 dims
const CHAT_MODEL     = "gpt-5";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

async function embed(text) {
  const r = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: text })
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "embed error");
  return j.data[0].embedding;
}

function sysGuardrail(client) {
  return `
You are the website assistant for ${client?.name || "the clinic"}.
ONLY answer using the snippets provided under <KB>. If it's not there, say you don't have that info and offer to book or connect with a human.
Be concise (2–5 sentences). No diagnoses or invented prices/schedules.
Calendar link: ${client?.calendar_link || "(not provided)"}.
`; }

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
    const { clinicId = "CLINIC_DEMO", message = "" } = req.body || {};
    if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) return res.status(500).json({ error: "Missing env vars" });

    // Client
    const { data: client } = await sb.from("clients").select("*").eq("clinic_id", clinicId).single();

    // Vector search
    const qEmb = await embed(String(message).slice(0, 2000));
    const { data: chunks } = await sb.rpc("match_kb_chunks", {
      p_clinic_id: clinicId, p_query_embedding: qEmb, p_match_threshold: 0.78, p_match_count: 12
    });

    // Fallback si aún no hay chunks
    let kbText = "";
    if (chunks?.length) {
      kbText = chunks.map(c => `• ${c.content}`).join("\n");
    } else {
      const [faqs, svcs] = await Promise.all([
        sb.from("faqs").select("question,answer").eq("clinic_id", clinicId).limit(10),
        sb.from("services").select("service,details").eq("clinic_id", clinicId).limit(10)
      ]);
      const f = (faqs.data || []).map(x => `Q: ${x.question}\nA: ${x.answer}`).join("\n");
      const s = (svcs.data || []).map(x => `• ${x.service}: ${x.details}`).join("\n");
      kbText = [f, s].filter(Boolean).join("\n");
    }

    const prompt = `${sysGuardrail(client)}\n\n<KB>\n${kbText}\n</KB>\n\nUser: ${message}\nAssistant:`;

    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CHAT_MODEL,
        input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
        max_output_tokens: 380,
        temperature: 0.3
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error?.message || "openai error");

    return res.status(200).json({ reply: (data.output_text || "").trim() });
  } catch (e) {
    return res.status(200).json({
      reply: "Sorry, I only answer with verified clinic info and something went wrong. Want the booking link?",
      error: String(e)
    });
  }
}

/* ⚠️ Ejecutá esta función SQL en Supabase una sola vez:
create or replace function match_kb_chunks(
  p_clinic_id text,
  p_query_embedding vector(1536),
  p_match_threshold float,
  p_match_count int
) returns table (content text, similarity float) language sql as $$
  select content,
         1 - (embedding <=> p_query_embedding) as similarity
  from kb_chunks
  where clinic_id = p_clinic_id
  order by embedding <=> p_query_embedding
  limit p_match_count
$$;
*/
