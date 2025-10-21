export default async function handler(req: any, res: any) {
  try {
    const url = new URL(req.url ?? `http://x`);
    const secret = (url.searchParams.get('secret') || req.query?.secret) as string;
    const clinicId = (url.searchParams.get('clinicId') || req.query?.clinicId || 'CLINIC_DEMO') as string;

    if (!process.env.REINDEX_SECRET) {
      return res.status(500).json({ ok:false, error:'REINDEX_SECRET missing' });
    }
    if (secret !== process.env.REINDEX_SECRET) {
      return res.status(401).json({ ok:false, error:'invalid secret' });
    }

    // Más adelante: refrescar embeddings. Por ahora “no-op” seguro.
    return res.status(200).json({ ok:true, clinicId, indexed:0 });
  } catch (e:any) {
    return res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
}
