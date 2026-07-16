import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, x-admin-pin',
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
  const pin = req.headers.get('x-admin-pin') ?? '';

  // --- PINが未設定の場合に初回セットアップする内部ヘルパー ---
  const validatePin = async (): Promise<boolean> => {
    const { data: row } = await supabase
      .from('nippo_settings').select('value').eq('key', 'admin_pin').maybeSingle();
    return !!row && pin === row.value;
  };

  // --- 認証アクション（初回セットアップ兼） ---
  if (action === 'auth') {
    const { data: row } = await supabase
      .from('nippo_settings').select('value').eq('key', 'admin_pin').maybeSingle();
    if (!row) {
      if (!pin) return json({ error: 'PIN required' }, 400);
      await supabase.from('nippo_settings').upsert({ key: 'admin_pin', value: pin });
      return json({ ok: true });
    }
    if (pin !== row.value) return json({ error: 'Invalid PIN' }, 401);
    return json({ ok: true });
  }

  // --- 全アクション共通：PIN検証 ---
  if (!(await validatePin())) return json({ error: 'Unauthorized' }, 401);

  // --- アクション処理 ---
  try {
    switch (action) {
      case 'saveSite':
        await supabase.from('nippo_sites').upsert(data);
        break;
      case 'deleteSite':
        await supabase.from('nippo_sites').delete().eq('id', data.id);
        break;
      case 'saveVendor':
        await supabase.from('nippo_vendors').upsert({ ...(data.vendor as object), site_number: data.siteNumber });
        break;
      case 'saveVendors': {
        await supabase.from('nippo_vendors').delete().eq('site_number', data.siteNumber);
        const vendors = data.vendors as Record<string, unknown>[];
        if (vendors && vendors.length > 0)
          await supabase.from('nippo_vendors').upsert(vendors.map(v => ({ ...v, site_number: data.siteNumber })));
        break;
      }
      case 'deleteVendor':
        await supabase.from('nippo_vendors').delete().eq('id', data.id).eq('site_number', data.siteNumber);
        break;
      case 'saveReport': {
        const report = data.report as Record<string, unknown>;
        report.updatedAt = new Date().toISOString();
        await supabase.from('nippo_reports').upsert({
          id: `${report.siteNumber}_${report.date}`,
          site_number: report.siteNumber,
          date: report.date,
          data: report,
          updated_at: new Date().toISOString()
        });
        break;
      }
      case 'deleteReport':
        await supabase.from('nippo_reports').delete()
          .eq('site_number', data.siteNumber).eq('date', data.date);
        break;
      case 'importAll':
        if (data.sites)   await supabase.from('nippo_sites').upsert(data.sites as object[]);
        if (data.vendors) await supabase.from('nippo_vendors').upsert(data.vendors as object[]);
        if (data.reports) await supabase.from('nippo_reports').upsert(data.reports as object[]);
        break;
      default:
        return json({ error: 'Unknown action' }, 400);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
