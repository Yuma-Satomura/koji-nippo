const Storage = {
  uuid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  },

  // PIN
  getPin() { return localStorage.getItem('admin_pin') || ''; },
  setPin(pin) { localStorage.setItem('admin_pin', pin); },

  // Sites (現場)
  getSites() {
    return JSON.parse(localStorage.getItem('genba_master') || '[]');
  },
  saveSites(sites) {
    localStorage.setItem('genba_master', JSON.stringify(sites));
  },
  getSite(id) {
    return this.getSites().find(s => s.id === id) || null;
  },
  saveSite(site) {
    const sites = this.getSites();
    const idx = sites.findIndex(s => s.id === site.id);
    if (idx >= 0) sites[idx] = site;
    else sites.push(site);
    this.saveSites(sites);
  },
  deleteSite(id) {
    this.saveSites(this.getSites().filter(s => s.id !== id));
  },
  getActiveSite() {
    const id = localStorage.getItem('active_genba');
    return id ? this.getSite(id) : null;
  },
  setActiveSite(id) {
    localStorage.setItem('active_genba', id);
  },

  // Vendors (業者マスタ)
  getVendors(siteNumber) {
    return JSON.parse(localStorage.getItem('gyosha_' + siteNumber) || '[]');
  },
  saveVendors(siteNumber, vendors) {
    localStorage.setItem('gyosha_' + siteNumber, JSON.stringify(vendors));
  },
  saveVendor(siteNumber, vendor) {
    const vendors = this.getVendors(siteNumber);
    const idx = vendors.findIndex(v => v.id === vendor.id);
    if (idx >= 0) vendors[idx] = vendor;
    else vendors.push(vendor);
    this.saveVendors(siteNumber, vendors);
  },
  deleteVendor(siteNumber, id) {
    this.saveVendors(siteNumber, this.getVendors(siteNumber).filter(v => v.id !== id));
  },

  // Worker pending inputs
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

  // Reports (日報)
  _nippoKey(siteNumber, dateStr) {
    return 'nippo_' + siteNumber + '_' + dateStr.replace(/-/g, '');
  },
  getReport(siteNumber, dateStr) {
    return JSON.parse(localStorage.getItem(this._nippoKey(siteNumber, dateStr)) || 'null');
  },
  saveReport(report) {
    const key = this._nippoKey(report.siteNumber, report.date);
    report.updatedAt = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(report));
  },
  deleteReport(siteNumber, dateStr) {
    localStorage.removeItem(this._nippoKey(siteNumber, dateStr));
  },
  getAllReports() {
    const reports = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nippo_')) {
        try {
          const r = JSON.parse(localStorage.getItem(key));
          if (r) reports.push(r);
        } catch (e) { /* skip */ }
      }
    }
    return reports.sort((a, b) => b.date.localeCompare(a.date));
  },
  getPrevReport(siteNumber, dateStr) {
    const all = this.getAllReports()
      .filter(r => r.siteNumber === siteNumber && r.date < dateStr)
      .sort((a, b) => b.date.localeCompare(a.date));
    return all[0] || null;
  },

  // Export / Import
  exportAll() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      data[key] = localStorage.getItem(key);
    }
    return JSON.stringify(data, null, 2);
  },
  importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    for (const [k, v] of Object.entries(data)) {
      localStorage.setItem(k, v);
    }
  }
};
