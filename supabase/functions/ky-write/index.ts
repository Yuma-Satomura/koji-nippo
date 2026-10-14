// ky-write : KY（危険予知活動表）の匿名入力。現場QRから職人が使う。
//   - saveKy : 職長/現場責任者が記入・登録（業者ごと・1日1件、upsert）
//   - signKy : 作業員が内容確認のうえ署名を追加（サーバ側で追記し、同時署名でも消えない）
// worker-write と同じ匿名の姿勢。許可アクションのみ受け付ける。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const kyId = (site: string, vendor: string, date: string) => `${site}_${vendor}_${date}`;

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

  // 現場・業者の実在チェック（不正なQRで架空データを作らせない）
  const verifyVendor = async (siteNumber: string, vendorId: string): Promise<boolean> => {
    if (!siteNumber || !vendorId) return false;
    const { data: v } = await supabase
      .from('nippo_vendors').select('id').eq('id', vendorId).eq('site_number', siteNumber).maybeSingle();
    return !!v;
  };

  try {
    if (action === 'saveKy') {
      const ky = data.ky as Record<string, unknown>;
      const site = ky.siteNumber as string, vendor = ky.vendorId as string, date = ky.date as string;
      if (!(await verifyVendor(site, vendor))) return json({ error: 'Unknown site/vendor' }, 404);
      if (!date) return json({ error: 'date required' }, 400);
      const id = kyId(site, vendor, date);
      ky.id = id;
      // 既存の署名(workers)は保持：職長の再編集で署名が消えないようにマージ
      const { data: existing } = await supabase
        .from('ky_records').select('data').eq('id', id).maybeSingle();
      if (existing && existing.data && Array.isArray(existing.data.workers) && !Array.isArray(ky.workers)) {
        ky.workers = existing.data.workers;
      }
      await supabase.from('ky_records').upsert({
        id, site_number: site, vendor_id: vendor, date, data: ky, updated_at: new Date().toISOString()
      });
      return json({ ok: true, id });
    }

    if (action === 'signKy') {
      const { siteNumber, vendorId, date, worker } = data as {
        siteNumber: string; vendorId: string; date: string; worker: { name: string; signature: string };
      };
      if (!worker || !worker.name) return json({ error: '氏名が必要です' }, 400);
      const id = kyId(siteNumber, vendorId, date);
      const { data: row } = await supabase.from('ky_records').select('data').eq('id', id).maybeSingle();
      if (!row) return json({ error: 'KYが登録されていません' }, 404);
      const kyData = row.data as Record<string, unknown>;
      const workers = Array.isArray(kyData.workers) ? kyData.workers as Record<string, unknown>[] : [];
      // 同名があれば上書き、無ければ追加
      const idx = workers.findIndex(w => w.name === worker.name);
      if (idx >= 0) workers[idx] = worker; else workers.push(worker);
      kyData.workers = workers;
      await supabase.from('ky_records').update({ data: kyData, updated_at: new Date().toISOString() }).eq('id', id);
      return json({ ok: true });
    }

    return json({ error: 'Not allowed' }, 403);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
