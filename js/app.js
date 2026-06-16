const App = {
  // ---- 日付 ----
  today() {
    return this.offsetDate(0);
  },

  offsetDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  addDays(dateStr, days) {
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return this.toWareki(parseInt(y)) + String(parseInt(m)) + '月' + String(parseInt(d)) + '日';
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

  // ---- UI ----
  escHtml(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  loading(show) {
    const el = document.getElementById('page-loading');
    if (!el) return;
    // カウンター方式：複数の非同期処理が並列実行されても正しく表示/非表示を管理
    el._count = Math.max(0, (el._count || 0) + (show ? 1 : -1));
    el.style.display = el._count > 0 ? '' : 'none';
  },

  toast(msg, type = 'success') {
    const el = document.createElement('div');
    el.className = 'toast toast-' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2500);
  },

  // ---- ナビゲーション（デモモード対応）----
  nav(url) {
    if (DEMO) {
      location.href = url + (url.includes('?') ? '&' : '?') + 'demo=1';
    } else {
      location.href = url;
    }
  },

  // ログアウト（デモモードではトップに戻るだけ）
  logout() {
    if (DEMO) {
      App.nav('list.html');
      return;
    }
    Auth.logout();
    location.href = 'admin.html';
  },

  // ---- データモデル ----
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
      signature: null,
      submittedByWorker: false
    };
  },

  // ---- エラーハンドリング ----
  handleError(err, msg = 'エラーが発生しました') {
    console.error(err);
    this.toast(msg + '（' + (err.message || err) + '）', 'danger');
  }
};

// デモモードバナーとリンクパッチ
if (typeof DEMO !== 'undefined' && DEMO) {
  document.addEventListener('DOMContentLoaded', () => {
    // バナー表示
    const banner = document.createElement('div');
    banner.style.cssText = 'background:#f59e0b;color:white;text-align:center;padding:10px 16px;font-size:14px;font-weight:700;position:sticky;top:0;z-index:9999;letter-spacing:.03em;';
    banner.textContent = '📋 デモモード — 表示はサンプルデータです。変更は保存されません。';
    document.body.insertBefore(banner, document.body.firstChild);

    // 内部リンクに ?demo=1 を付与
    document.querySelectorAll('a[href]').forEach(el => {
      const href = el.getAttribute('href');
      if (href && !href.startsWith('http') && !href.startsWith('//') && !href.startsWith('#') && !href.startsWith('mailto')) {
        el.setAttribute('href', href + (href.includes('?') ? '&' : '?') + 'demo=1');
      }
    });
  });
}

// 未処理のPromiseエラーをキャッチ
window.addEventListener('unhandledrejection', e => {
  App.handleError(e.reason, '通信エラー');
});
