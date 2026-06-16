// Supabase設定（読み取り専用・anonキーはSupabaseの設計上公開前提）
const SUPABASE_URL = 'https://paqqiuinklfsaeyqcfmm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXFpdWlua2xmc2FleXFjZm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDA2NDEsImV4cCI6MjA5NDgxNjY0MX0.R1x31j4hKxrREZwdgZs2q_rFn1uITPiNoareBIpEkKU';

// 書き込みはEdge Function経由（PINで認証）
const EDGE_BASE = 'https://paqqiuinklfsaeyqcfmm.supabase.co/functions/v1';

// Supabase REST APIヘルパー（読み取り専用）
const DB = {
  async get(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  }
};

// Edge Function APIヘルパー（書き込み用）
const API = {
  async admin(action, data) {
    const pin = Storage.getPin();
    const res = await fetch(`${EDGE_BASE}/admin-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-pin': pin },
      body: JSON.stringify({ action, data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },
  async worker(action, data) {
    const res = await fetch(`${EDGE_BASE}/worker-write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, data })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  }
};

const Storage = {
  uuid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // ---- PIN（ローカル保存のまま）----
  getPin()      { return localStorage.getItem('admin_pin') || ''; },
  setPin(pin)   { localStorage.setItem('admin_pin', pin); },

  // ---- アクティブ現場（ローカル保存のまま）----
  getActiveSiteId()   { return localStorage.getItem('active_genba') || ''; },
  setActiveSite(id)   { localStorage.setItem('active_genba', id); },

  // ---- 現場マスタ（読み取りは直接、書き込みはEdge Function）----
  async getSites() {
    return DB.get('nippo_sites', '?order=created_at.asc');
  },
  async getSite(id) {
    const rows = await DB.get('nippo_sites', `?id=eq.${encodeURIComponent(id)}`);
    return rows[0] || null;
  },
  async getActiveSite() {
    const id = this.getActiveSiteId();
    if (!id) return null;
    return this.getSite(id);
  },
  async saveSite(site) {
    await API.admin('saveSite', site);
  },
  async deleteSite(id) {
    await API.admin('deleteSite', { id });
  },

  // ---- 業者マスタ ----
  async getVendors(siteNumber) {
    return DB.get('nippo_vendors', `?site_number=eq.${encodeURIComponent(siteNumber)}&order=created_at.asc`);
  },
  async saveVendor(siteNumber, vendor) {
    await API.admin('saveVendor', { siteNumber, vendor });
  },
  async saveVendors(siteNumber, vendors) {
    await API.admin('saveVendors', { siteNumber, vendors });
  },
  async deleteVendor(siteNumber, id) {
    await API.admin('deleteVendor', { siteNumber, id });
  },

  // ---- 日報 ----
  async getReport(siteNumber, dateStr) {
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=eq.${encodeURIComponent(dateStr)}`);
    return rows[0] ? rows[0].data : null;
  },
  // source: 'admin'（管理者保存）or 'worker'（職人送信）
  async saveReport(report, source = 'admin') {
    if (source === 'worker') {
      await API.worker('saveReport', { report });
    } else {
      await API.admin('saveReport', { report });
    }
  },
  async deleteReport(siteNumber, dateStr) {
    await API.admin('deleteReport', { siteNumber, date: dateStr });
  },
  async getAllReports() {
    const rows = await DB.get('nippo_reports', '?order=date.desc');
    return rows.map(r => r.data);
  },
  async getPrevReport(siteNumber, dateStr) {
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=lt.${encodeURIComponent(dateStr)}&order=date.desc&limit=1`);
    return rows[0] ? rows[0].data : null;
  },

  // 業者ごとに「最後に入場した日報」を探す（休工日をまたいでも正確な前回累計を取得）
  async getPrevReportForVendor(siteNumber, vendorId, dateStr) {
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=lt.${encodeURIComponent(dateStr)}&order=date.desc&limit=60`);
    for (const r of rows) {
      const report = r.data;
      if (report && report.rows) {
        const row = report.rows.find(row => row.vendorId === vendorId);
        if (row) return report;
      }
    }
    return null;
  },

  // ---- 職人入力（一時データ・ローカル保存のまま）----
  getWorkerInputs(siteNumber, dateStr) {
    return JSON.parse(localStorage.getItem('worker_' + siteNumber + '_' + dateStr) || '[]');
  },
  saveWorkerInput(siteNumber, dateStr, input) {
    const inputs = this.getWorkerInputs(siteNumber, dateStr);
    const idx = inputs.findIndex(i => i.vendorId === input.vendorId);
    if (idx >= 0) inputs[idx] = input;
    else inputs.push(input);
    localStorage.setItem('worker_' + siteNumber + '_' + dateStr, JSON.stringify(inputs));
  },

  // ---- エクスポート / インポート ----
  async exportAll() {
    const [sites, vendors, reports] = await Promise.all([
      this.getSites(),
      DB.get('nippo_vendors', ''),
      DB.get('nippo_reports', '?order=date.desc')
    ]);
    return JSON.stringify({ sites, vendors, reports }, null, 2);
  },
  async importAll(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    await API.admin('importAll', parsed);
  }
};
