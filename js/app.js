const App = {
  // Date utilities
  today() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    const wareki = this.toWareki(parseInt(y));
    return wareki + String(parseInt(m)) + '月' + String(parseInt(d)) + '日';
  },

  toWareki(year) {
    if (year >= 2019) return '令和' + (year === 2019 ? '元' : (year - 2018)) + '年';
    if (year >= 1989) return '平成' + (year === 1989 ? '元' : (year - 1988)) + '年';
    if (year >= 1926) return '昭和' + (year === 1926 ? '元' : (year - 1925)) + '年';
    return year + '年';
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return y + '/' + m + '/' + d;
  },

  // Show toast notification
  toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2500);
  },

  // Confirm dialog
  confirm(msg) {
    return window.confirm(msg);
  },

  // Empty report template
  newReport(site, dateStr) {
    return {
      id: Storage.uuid(),
      date: dateStr,
      siteNumber: site.number,
      siteName: site.name,
      client: site.client || '',
      representative: '',
      company: '',
      staff: '',
      rows: [],
      deliveryPlan: '',
      overtimePlan: '',
      memo: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },

  // New report row
  newRow(vendor) {
    return {
      id: Storage.uuid(),
      vendorId: vendor ? vendor.id : '',
      vendorName: vendor ? vendor.name : '',
      plannedWorkers: '',
      actualWorkers: '',
      prevTotal: '',
      vehicles: '',
      workInstruction: '',
      fireCheck: false,
      safetyNotes: '',
      checker: '',
      signature: null,
      submittedByWorker: false
    };
  }
};
