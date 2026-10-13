// equipment-inspect : 機械・重機のQR点検記録（匿名入力）。
// worker-write と同じ姿勢で、匿名から saveInspection のみを許可する。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let body: { action: string; data: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const { action, data } = body;
  if (action !== 'saveInspection') return json({ error: 'Not allowed' }, 403);

  try {
    const insp = data.inspection as Record<string, unknown>;
    if (!insp || !insp.equipmentId || !insp.date) return json({ error: 'Invalid inspection' }, 400);

    // 機械が存在するか確認（不正なQRで架空の記録を作らせない）
    const { data: eq } = await supabase
      .from('equipment').select('id').eq('id', insp.equipmentId).maybeSingle();
    if (!eq) return json({ error: 'Unknown equipment' }, 404);

    await supabase.from('equipment_inspections').upsert({
      id: `${insp.equipmentId}_${insp.date}`,
      equipment_id: insp.equipmentId,
      date: insp.date,
      inspector: insp.inspector ?? '',
      data: insp,
      updated_at: new Date().toISOString()
    });
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
