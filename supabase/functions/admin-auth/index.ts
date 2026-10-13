// admin-auth : ログイン社員(JWT)による書き込み。admin-write(PIN)の後継。
//
// 認可：
//   - Authorization: Bearer <JWT> を検証し、staff テーブルで社員か確認。
//   - role=admin は全操作可。role=member は担当現場(site_staff)のみ編集可。
//   - 現場マスタ管理(saveSite/deleteSite/importAll)は admin のみ。
// 書き込み自体は service_role で行う（RLSは素通り）。権限判定はこの関数が担う。
//
// 移行期間中、本番は従来の admin-write(PIN) を使い続ける。この関数は別slugなので
// 本番には影響しない。

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
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

  // --- JWT検証 ---
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'ログインが必要です' }, 401);

  const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
  if (userErr || !user) return json({ error: 'セッションが無効です。再度ログインしてください' }, 401);

  // --- 社員・役割の確認 ---
  const { data: staff } = await supabase
    .from('staff').select('role').eq('id', user.id).maybeSingle();
  if (!staff) return json({ error: 'このアカウントには利用権限がありません' }, 403);
  const role: string = staff.role;
  const isAdmin = role === 'admin';

  const canEditSite = async (sn: string): Promise<boolean> => {
    if (isAdmin) return true;
    if (!sn) return false;
    const { data } = await supabase
      .from('site_staff').select('site_number')
      .eq('staff_id', user.id).eq('site_number', sn).maybeSingle();
    return !!data;
  };

  let body: { action: string; data: Record<string, unknown> };
  try { body = await req.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }
  const { action, data } = body;

  const forbidden = () => json({ error: 'この操作の権限がありません' }, 403);

  try {
    switch (action) {
      case 'saveSite':
        if (!isAdmin) return forbidden();
        await supabase.from('nippo_sites').upsert(data);
        break;
      case 'deleteSite':
        if (!isAdmin) return forbidden();
        await supabase.from('nippo_sites').delete().eq('id', data.id);
        break;
      case 'saveVendor':
        if (!(await canEditSite(data.siteNumber as string))) return forbidden();
        await supabase.from('nippo_vendors').upsert({ ...(data.vendor as object), site_number: data.siteNumber });
        break;
      case 'saveVendors': {
        if (!(await canEditSite(data.siteNumber as string))) return forbidden();
        await supabase.from('nippo_vendors').delete().eq('site_number', data.siteNumber);
        const vendors = data.vendors as Record<string, unknown>[];
        if (vendors && vendors.length > 0)
          await supabase.from('nippo_vendors').upsert(vendors.map(v => ({ ...v, site_number: data.siteNumber })));
        break;
      }
      case 'deleteVendor':
        if (!(await canEditSite(data.siteNumber as string))) return forbidden();
        await supabase.from('nippo_vendors').delete().eq('id', data.id).eq('site_number', data.siteNumber);
        break;
      case 'saveReport': {
        const report = data.report as Record<string, unknown>;
        if (!(await canEditSite(report.siteNumber as string))) return forbidden();
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
        if (!(await canEditSite(data.siteNumber as string))) return forbidden();
        await supabase.from('nippo_reports').delete()
          .eq('site_number', data.siteNumber).eq('date', data.date);
        break;
      case 'importAll':
        if (!isAdmin) return forbidden();
        if (data.sites)   await supabase.from('nippo_sites').upsert(data.sites as object[]);
        if (data.vendors) await supabase.from('nippo_vendors').upsert(data.vendors as object[]);
        if (data.reports) await supabase.from('nippo_reports').upsert(data.reports as object[]);
        break;
      case 'saveEquipment':
        if (!isAdmin) return forbidden();
        await supabase.from('equipment').upsert(data);
        break;
      case 'deleteEquipment':
        if (!isAdmin) return forbidden();
        await supabase.from('equipment').delete().eq('id', data.id);
        break;
      default:
        return json({ error: 'Unknown action' }, 400);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
