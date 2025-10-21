// Chat súper simple usando OpenAI Responses API, sin 'temperature' ni tipos de Vercel.
async function callOpenAI(message: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const payload = {
    model: "gpt-5-mini",               // podés cambiar por el que uses
    input: [
      { role: "system", content: [{ type: "input_text", text: "You are a concise clinic assistant. Answer in 2–5 sentences. No medical diagnosis." }]},
      { role: "user",   content: [{ type: "input_text", text: String(message || "") }]}
    ],
    max_output_tokens: 300
  };

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload)
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || "OpenAI error");

  // Responses API suele traer 'output_text'; si no, unimos los fragmentos.
  let txt = data.output_text;
  if (!txt && Array.isArray(data.output)) {
    txt = data.output
      .flatMap((p: any) => Array.isArray(p.content) ? p.content : [])
      .filter((c: any) => c?.type === "output_text" && typeof c.text === "string")
      .map((c: any) => c.text)
      .join("\n");
  }
  return txt || "Sorry, I couldn't generate an answer.";
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || "");
    if (!message) return res.status(400).json({ error: "Missing 'message' in body" });

    // (Opcional) podés leer body.clinicId si querés rutear por clínica
    const reply = await callOpenAI(message);
    return res.status(200).json({ reply });
  } catch (e: any) {
    return res.status(200).json({
      reply: "Sorry, something went wrong. Want the booking link?",
      error: String(e?.message || e)
    });
  }
}
