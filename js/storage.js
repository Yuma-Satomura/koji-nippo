// === デモモード ===
const DEMO = new URLSearchParams(location.search).has('demo');

// デモ用架空データ
const _demoDate = n => {
  const dt = new Date(); dt.setDate(dt.getDate() + n);
  return dt.toISOString().split('T')[0];
};
const DEMO_DATA = {
  sites: [{
    id: 'demo-site-001', number: 'DEMO-001', name: 'サンプルビル新築工事',
    client: '〇〇建設株式会社', company: '株式会社サンプル建設 中部支店',
    representative: '山田 太郎', staff: '佐藤 次郎', created_at: '2026-01-01T00:00:00Z'
  }],
  vendors: [
    { id: 'dv-01', name: '田中電業',  site_number: 'DEMO-001', created_at: '2026-01-01T00:00:00Z' },
    { id: 'dv-02', name: '鈴木内装',  site_number: 'DEMO-001', created_at: '2026-01-01T00:00:00Z' },
    { id: 'dv-03', name: '山本設備',  site_number: 'DEMO-001', created_at: '2026-01-01T00:00:00Z' }
  ],
  reports: [
    {
      id: 'demo-r1', siteNumber: 'DEMO-001', date: _demoDate(-14),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r1-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'4', actualWorkers:'4', prevTotal:'0',  vehicles:'2', workInstruction:'電気幹線配線工事',    safetyNotes:'高所作業注意',    fireCheck:false, signature:null, submittedByWorker:false, nextWorkDate:_demoDate(-11) },
        { id:'r1-2', vendorId:'dv-02', vendorName:'鈴木内装', plannedWorkers:'3', actualWorkers:'3', prevTotal:'0',  vehicles:'1', workInstruction:'LGS・ボード工事',     safetyNotes:'粉塵対策マスク着用', fireCheck:false, signature:null, submittedByWorker:false, nextWorkDate:_demoDate(-11) },
        { id:'r1-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'2', actualWorkers:'2', prevTotal:'0',  vehicles:'1', workInstruction:'給排水配管工事',      safetyNotes:'',               fireCheck:false, signature:null, submittedByWorker:false, nextWorkDate:_demoDate(-8)  }
      ],
      deliveryPlan:'鉄骨資材搬入 午前10時', overtimePlan:'', memo:'工程会議 14:00〜',
      createdAt:_demoDate(-14)+'T08:00:00Z', updatedAt:_demoDate(-14)+'T17:00:00Z'
    },
    {
      id: 'demo-r2', siteNumber: 'DEMO-001', date: _demoDate(-11),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r2-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'5', actualWorkers:'5', prevTotal:'4',  vehicles:'2', workInstruction:'電気配線・分電盤工事', safetyNotes:'高所・感電注意',   fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-8) },
        { id:'r2-2', vendorId:'dv-02', vendorName:'鈴木内装', plannedWorkers:'4', actualWorkers:'4', prevTotal:'3',  vehicles:'1', workInstruction:'クロス下地処理',      safetyNotes:'粉塵対策',       fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-8) },
        { id:'r2-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'0', actualWorkers:'0', prevTotal:'2',  vehicles:'0', workInstruction:'',                  safetyNotes:'',               fireCheck:false, signature:null, submittedByWorker:false }
      ],
      deliveryPlan:'', overtimePlan:'電気工事 〜20:00', memo:'',
      createdAt:_demoDate(-11)+'T08:00:00Z', updatedAt:_demoDate(-11)+'T17:00:00Z'
    },
    {
      id: 'demo-r3', siteNumber: 'DEMO-001', date: _demoDate(-8),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r3-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'4', actualWorkers:'4', prevTotal:'9',  vehicles:'2', workInstruction:'電気器具取付・確認',   safetyNotes:'感電注意',       fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-5) },
        { id:'r3-2', vendorId:'dv-02', vendorName:'鈴木内装', plannedWorkers:'5', actualWorkers:'5', prevTotal:'7',  vehicles:'2', workInstruction:'クロス・床材貼付',     safetyNotes:'換気徹底',       fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-5) },
        { id:'r3-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'3', actualWorkers:'3', prevTotal:'2',  vehicles:'1', workInstruction:'衛生設備取付工事',     safetyNotes:'',               fireCheck:true,  signature:null, submittedByWorker:false, nextWorkDate:_demoDate(-5) }
      ],
      deliveryPlan:'衛生設備搬入 午後2時', overtimePlan:'', memo:'',
      createdAt:_demoDate(-8)+'T08:00:00Z', updatedAt:_demoDate(-8)+'T17:00:00Z'
    },
    {
      id: 'demo-r4', siteNumber: 'DEMO-001', date: _demoDate(-5),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r4-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'6', actualWorkers:'6', prevTotal:'13', vehicles:'3', workInstruction:'電気最終チェック・器具取付', safetyNotes:'感電・高所注意', fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-2) },
        { id:'r4-2', vendorId:'dv-02', vendorName:'鈴木内装', plannedWorkers:'4', actualWorkers:'4', prevTotal:'12', vehicles:'1', workInstruction:'仕上げ・補修工事',       safetyNotes:'粉塵注意',       fireCheck:false, signature:null, submittedByWorker:true,  nextWorkDate:_demoDate(-2) },
        { id:'r4-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'2', actualWorkers:'2', prevTotal:'5',  vehicles:'1', workInstruction:'設備試運転調整',         safetyNotes:'',               fireCheck:false, signature:null, submittedByWorker:false, nextWorkDate:_demoDate(-2) }
      ],
      deliveryPlan:'', overtimePlan:'', memo:'施主立会検査 13:00〜',
      createdAt:_demoDate(-5)+'T08:00:00Z', updatedAt:_demoDate(-5)+'T17:00:00Z'
    },
    {
      id: 'demo-r5', siteNumber: 'DEMO-001', date: _demoDate(-2),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r5-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'5', actualWorkers:'5', prevTotal:'19', vehicles:'2', workInstruction:'電気最終確認・引渡し準備', safetyNotes:'', fireCheck:false, signature:null, submittedByWorker:true, nextWorkDate:_demoDate(1) },
        { id:'r5-2', vendorId:'dv-02', vendorName:'鈴木内装', plannedWorkers:'3', actualWorkers:'3', prevTotal:'16', vehicles:'1', workInstruction:'竣工清掃・片付け',         safetyNotes:'', fireCheck:false, signature:null, submittedByWorker:true },
        { id:'r5-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'2', actualWorkers:'2', prevTotal:'7',  vehicles:'1', workInstruction:'最終点検',               safetyNotes:'', fireCheck:false, signature:null, submittedByWorker:true, nextWorkDate:_demoDate(1) }
      ],
      deliveryPlan:'', overtimePlan:'', memo:'',
      createdAt:_demoDate(-2)+'T08:00:00Z', updatedAt:_demoDate(-2)+'T17:00:00Z'
    },
    {
      id: 'demo-r6', siteNumber: 'DEMO-001', date: _demoDate(1),
      siteName: 'サンプルビル新築工事', client: '〇〇建設株式会社',
      company: '株式会社サンプル建設 中部支店', representative: '山田 太郎', staff: '佐藤 次郎',
      rows: [
        { id:'r6-1', vendorId:'dv-01', vendorName:'田中電業', plannedWorkers:'4', actualWorkers:'', prevTotal:'24', vehicles:'2', workInstruction:'引渡し前最終確認',   safetyNotes:'', fireCheck:false, signature:null, submittedByWorker:false },
        { id:'r6-3', vendorId:'dv-03', vendorName:'山本設備', plannedWorkers:'2', actualWorkers:'', prevTotal:'9',  vehicles:'1', workInstruction:'最終検査立会い',     safetyNotes:'', fireCheck:false, signature:null, submittedByWorker:false }
      ],
      deliveryPlan:'', overtimePlan:'', memo:'引渡し検査 10:00〜',
      createdAt:_demoDate(1)+'T08:00:00Z', updatedAt:_demoDate(1)+'T08:00:00Z'
    }
  ]
};

// === Supabase設定（読み取り専用・anonキーはSupabaseの設計上公開前提）===
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

  // ---- アクティブ現場 ----
  getActiveSiteId() {
    if (DEMO) return 'demo-site-001';
    return localStorage.getItem('active_genba') || '';
  },
  setActiveSite(id) {
    if (DEMO) return;
    localStorage.setItem('active_genba', id);
  },

  // ---- 現場マスタ ----
  async getSites() {
    if (DEMO) return DEMO_DATA.sites;
    return DB.get('nippo_sites', '?order=created_at.asc');
  },
  async getSite(id) {
    if (DEMO) return DEMO_DATA.sites.find(s => s.id === id) || null;
    const rows = await DB.get('nippo_sites', `?id=eq.${encodeURIComponent(id)}`);
    return rows[0] || null;
  },
  async getActiveSite() {
    if (DEMO) return DEMO_DATA.sites[0];
    const id = this.getActiveSiteId();
    if (!id) return null;
    return this.getSite(id);
  },
  async saveSite(site) {
    if (DEMO) return;
    await API.admin('saveSite', site);
  },
  async deleteSite(id) {
    if (DEMO) return;
    await API.admin('deleteSite', { id });
  },

  // ---- 業者マスタ ----
  async getVendors(siteNumber) {
    if (DEMO) return DEMO_DATA.vendors.filter(v => v.site_number === siteNumber);
    return DB.get('nippo_vendors', `?site_number=eq.${encodeURIComponent(siteNumber)}&order=created_at.asc`);
  },
  async saveVendor(siteNumber, vendor) {
    if (DEMO) return;
    await API.admin('saveVendor', { siteNumber, vendor });
  },
  async saveVendors(siteNumber, vendors) {
    if (DEMO) return;
    await API.admin('saveVendors', { siteNumber, vendors });
  },
  async deleteVendor(siteNumber, id) {
    if (DEMO) return;
    await API.admin('deleteVendor', { siteNumber, id });
  },

  // ---- 日報 ----
  async getReport(siteNumber, dateStr) {
    if (DEMO) return DEMO_DATA.reports.find(r => r.siteNumber === siteNumber && r.date === dateStr) || null;
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=eq.${encodeURIComponent(dateStr)}`);
    return rows[0] ? rows[0].data : null;
  },
  async saveReport(report, source = 'admin') {
    if (DEMO) return;
    if (source === 'worker') {
      await API.worker('saveReport', { report });
    } else {
      await API.admin('saveReport', { report });
    }
  },
  async deleteReport(siteNumber, dateStr) {
    if (DEMO) return;
    await API.admin('deleteReport', { siteNumber, date: dateStr });
  },
  async getAllReports() {
    if (DEMO) return [...DEMO_DATA.reports].sort((a, b) => b.date.localeCompare(a.date));
    const rows = await DB.get('nippo_reports', '?order=date.desc');
    return rows.map(r => r.data);
  },
  async getPrevReport(siteNumber, dateStr) {
    if (DEMO) {
      const sorted = DEMO_DATA.reports
        .filter(r => r.siteNumber === siteNumber && r.date < dateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
      return sorted[0] || null;
    }
    const rows = await DB.get('nippo_reports',
      `?site_number=eq.${encodeURIComponent(siteNumber)}&date=lt.${encodeURIComponent(dateStr)}&order=date.desc&limit=1`);
    return rows[0] ? rows[0].data : null;
  },

  async getPrevReportForVendor(siteNumber, vendorId, dateStr) {
    if (DEMO) {
      const sorted = DEMO_DATA.reports
        .filter(r => r.siteNumber === siteNumber && r.date < dateStr)
        .sort((a, b) => b.date.localeCompare(a.date));
      for (const r of sorted) {
        if (r.rows && r.rows.find(row => row.vendorId === vendorId)) return r;
      }
      return null;
    }
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

  // ---- 職人入力（一時データ・ローカル保存）----
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
    if (DEMO) return JSON.stringify({ sites: DEMO_DATA.sites, vendors: DEMO_DATA.vendors, reports: DEMO_DATA.reports }, null, 2);
    const [sites, vendors, reports] = await Promise.all([
      this.getSites(),
      DB.get('nippo_vendors', ''),
      DB.get('nippo_reports', '?order=date.desc')
    ]);
    return JSON.stringify({ sites, vendors, reports }, null, 2);
  },
  async importAll(jsonStr) {
    if (DEMO) return;
    const parsed = JSON.parse(jsonStr);
    await API.admin('importAll', parsed);
  }
};
