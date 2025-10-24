import { NextResponse } from "next/server";
export const runtime = "nodejs";

async function callOpenAI(message: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");

  const payload = {
    model: "gpt-5-mini",
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

export async function POST(req: Request) {
  try {
    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: "Missing 'message' in body" }, { status: 400 });

    const reply = await callOpenAI(String(message));

    // guardar conversación en Supabase
    const { createClient } = await import("@supabase/supabase-js");
    const db = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!,
      { auth: { persistSession: false } }
    );
    await db.from("messages").insert([{ role: "user", content: String(message) }]);
    await db.from("messages").insert([{ role: "assistant", content: reply }]);

    return NextResponse.json({ reply });
  } catch (e: any) {
    return NextResponse.json(
      { reply: "Sorry, something went wrong. Want the booking link?", error: String(e?.message || e) },
      { status: 200 }
    );
  }
}
