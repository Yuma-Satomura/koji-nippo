// Supabase設定
const SUPABASE_URL = 'https://paqqiuinklfsaeyqcfmm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXFpdWlua2xmc2FleXFjZm1tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNDA2NDEsImV4cCI6MjA5NDgxNjY0MX0.R1x31j4hKxrREZwdgZs2q_rFn1uITPiNoareBIpEkKU';

// Supabase REST APIヘルパー
const DB = {
  async get(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  async upsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
  },
  async delete(table, query) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error(await res.text());
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

  // ---- 現場マスタ ----
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
    await DB.upsert('nippo_sites', site);
  },
  async deleteSite(id) {
    await DB.delete('nippo_sites', `?id=eq.${encodeURIComponent(id)}`);
  },

  // ---- 業者マスタ ----
  async getVendors(siteNumber) {
    return DB.get('nippo_vendors', `?site_number=eq.${encodeURIComponent(siteNumber)}&order=created_at.asc`);
  },
  async saveVendor(siteNumber, vendor) {
    await DB.upsert('nippo_vendors', { ...vendor, site_number: siteNumber });
  },
  async saveVendors(siteNumber, vendors) {
    // 既存を全削除してから一括挿入
    await DB.delete('nippo_vendors', `?site_number=eq.${encodeURIComponent(siteNumber)}`);
    if (vendors.length > 0) {
      await DB.upsert('nippo_vendors', vendors.map(v => ({ ...v, site_number: siteNumber })));
    }
  },
  async deleteVendor(siteNumber, id) {
    await DB.delete('nippo_vendors', `?id=eq.${encodeURIComponent(id)}&site_number=eq.${encodeURIComponent(siteNumber)}`);
  },

  // ---- 日報 ----
  async getReport(siteNumber, dateStr) {
    const date = dateStr.replace(/-/g, '-'); // YYYY-MM-DD形式
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=eq.${encodeURIComponent(date)}`);
    return rows[0] ? rows[0].data : null;
  },
  async saveReport(report) {
    const date = report.date;
    report.updatedAt = new Date().toISOString();
    await DB.upsert('nippo_reports', {
      id: `${report.siteNumber}_${date}`,
      site_number: report.siteNumber,
      date: date,
      data: report,
      updated_at: new Date().toISOString()
    });
  },
  async deleteReport(siteNumber, dateStr) {
    await DB.delete('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=eq.${encodeURIComponent(dateStr)}`);
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
    const { sites, vendors, reports } = JSON.parse(jsonStr);
    if (sites)   await DB.upsert('nippo_sites', sites);
    if (vendors) await DB.upsert('nippo_vendors', vendors);
    if (reports) await DB.upsert('nippo_reports', reports);
  }
};
