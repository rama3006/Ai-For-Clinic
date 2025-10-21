type Row = { question?: string; answer?: string; service?: string; details?: string };

async function fetchJson(url: string, headers: any) {
  const r = await fetch(url, { headers, cache: 'no-store' });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${await r.text()}`);
  return r.json();
}
function msgsToResponsesInput(messages: { role:'system'|'user'; content:string }[]) {
  return messages.map(m => ({ role: m.role, content: [{ type:'input_text', text: m.content }] }));
}
function systemPrompt({ clinicId, services, faqs }:{clinicId:string; services:Row[]; faqs:Row[]}) {
  const servicesText = (services||[])
    .map(s => `• ${String(s.service||'').trim()}: ${String(s.details||'').trim()}`)
    .filter(Boolean).join('\n');
  const faqText = (faqs||[])
    .map(f => `Q: ${String(f.question||'').trim()}\nA: ${String(f.answer||'').trim()}`)
    .filter(Boolean).join('\n');
  return `You are the website assistant for ${clinicId}.
Answer ONLY using the clinic info provided below. If something is not covered, say you don’t know and suggest booking. Be concise and friendly.

Services:
${servicesText || '(none)'}

Top FAQs:
${faqText || '(none)'}
`;
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error:'POST only' });

    const body = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body||{});
    const clinicId: string = body.clinicId || 'CLINIC_DEMO';
    const userMsg: string  = body.message  || '';

    const { SUPABASE_URL, SUPABASE_ANON_KEY, OPENAI_API_KEY } = process.env;
    if (!OPENAI_API_KEY) return res.status(500).json({ reply:'', error:'OPENAI_API_KEY missing' });
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ reply:'', error:'Supabase env vars missing' });

    const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` };
    const [services, faqs] = await Promise.all([
      fetchJson(`${SUPABASE_URL}/rest/v1/services?select=service,details&clinic_id=eq.${encodeURIComponent(clinicId)}`, headers),
      fetchJson(`${SUPABASE_URL}/rest/v1/faqs?select=question,answer&clinic_id=eq.${encodeURIComponent(clinicId)}`, headers),
    ]);

    const sys = systemPrompt({ clinicId, services, faqs });

    const payload = {
      model: 'gpt-5-mini',
      input: msgsToResponsesInput([
        { role: 'system', content: sys },
        { role: 'user',   content: String(userMsg) }
      ]),
      // max_output_tokens: 400, // opcional
    };

    const oai = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify(payload),
    });
    const data = await oai.json();
    const outputText =
      data?.output_text
      ?? (Array.isArray(data?.output) ? data.output.map((p:any)=>p?.content?.find((c:any)=>c.type==='output_text')?.text||'').join('\n') : '');

    const reply = outputText?.trim()
      || "Sorry, I only answer with verified clinic info and I couldn’t retrieve it right now. Want the booking link?";
    return res.status(200).json({ reply });
  } catch (e:any) {
    return res.status(200).json({
      reply:"Sorry, I only answer with verified clinic info and something went wrong. Want the booking link?",
      error:String(e?.message||e)
    });
  }
}
