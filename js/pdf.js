const PdfExport = {
  async generateReportPDF(report) {
    const html = this._buildPrintHtml([report]);
    await this._renderAndDownload(html, 'report_' + report.siteNumber + '_' + report.date.replace(/-/g, '') + '.pdf', [report]);
  },

  async generateBulkPDF(reports, rangeLabel, siteNumber) {
    const sorted = [...reports].sort((a, b) => a.date.localeCompare(b.date));
    const html = this._buildPrintHtml(sorted);
    const filename = '工事日報_' + rangeLabel + '_' + siteNumber + '.pdf';
    await this._renderAndDownload(html, filename, sorted);
  },

  _buildPrintHtml(reports) {
    const pages = reports.map(r => this._reportPage(r)).join('');
    return `<!DOCTYPE html><html lang="ja"><head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Meiryo', 'MS Gothic', sans-serif; font-size: 9pt; background: white; }
.page { width: 210mm; min-height: 297mm; padding: 8mm; page-break-after: always; }
.page:last-child { page-break-after: auto; }
h1 { font-size: 14pt; text-align: center; margin-bottom: 4mm; }
.header-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1mm; margin-bottom: 3mm; }
.header-grid .field { border: 1px solid #333; padding: 1mm 2mm; }
.header-grid .field label { font-size: 7pt; color: #555; display: block; }
.header-grid .field span { font-size: 9pt; font-weight: bold; }
.header-wide { grid-column: span 2; }
table { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
th { background: #1e40af; color: white; padding: 1.5mm 1mm; font-size: 7.5pt; text-align: center; border: 1px solid #999; }
td { border: 1px solid #bbb; padding: 1mm; font-size: 8pt; vertical-align: top; }
td.center { text-align: center; }
td.num { text-align: center; }
.sig-cell { width: 22mm; height: 14mm; }
.sig-cell img { max-width: 100%; max-height: 100%; }
.worker-total { text-align: right; font-weight: bold; margin-bottom: 2mm; }
.footer-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1mm; }
.footer-field { border: 1px solid #333; padding: 1mm 2mm; min-height: 12mm; }
.footer-field label { font-size: 7pt; color: #555; }
.fire-yes { color: red; font-weight: bold; }
.work-text { white-space: pre-wrap; font-size: 7.5pt; }
</style>
</head><body>${pages}</body></html>`;
  },

  _reportPage(r) {
    const rows = (r.rows || []).map(row => {
      const prevTotal = parseInt(row.prevTotal) || 0;
      const actual = parseInt(row.actualWorkers) || 0;
      const total = prevTotal + actual;
      const sig = row.signature
        ? `<img src="${row.signature}" />`
        : '';
      return `<tr>
<td>${this._esc(row.vendorName)}</td>
<td class="num">${row.plannedWorkers !== '' ? row.plannedWorkers : ''}</td>
<td class="num">${row.actualWorkers !== '' ? row.actualWorkers : ''}</td>
<td class="num">${row.prevTotal !== '' ? row.prevTotal : ''}</td>
<td class="num">${total || ''}</td>
<td class="num">${row.vehicles !== '' ? row.vehicles : ''}</td>
<td class="work-text">${this._esc(row.workInstruction)}</td>
<td class="center">${row.fireCheck ? '<span class="fire-yes">有</span>' : '無'}</td>
<td class="work-text">${this._esc(row.safetyNotes)}</td>
<td class="sig-cell">${sig}</td>
</tr>`;
    }).join('');

    const totalWorkers = (r.rows || []).reduce((s, row) => s + (parseInt(row.actualWorkers) || 0), 0);
    const totalVehicles = (r.rows || []).reduce((s, row) => s + (parseInt(row.vehicles) || 0), 0);

    return `<div class="page">
<h1>工事日報</h1>
<div class="header-grid">
  <div class="field"><label>工事日</label><span>${App.formatDate(r.date)}</span></div>
  <div class="field"><label>顧客名</label><span>${this._esc(r.client)}</span></div>
  <div class="field"><label>工事番号</label><span>${this._esc(r.siteNumber)}</span></div>
  <div class="field header-wide"><label>工事件名</label><span>${this._esc(r.siteName)}</span></div>
  <div class="field"><label>現場代理人</label><span>${this._esc(r.representative)}</span></div>
  <div class="field header-wide"><label>会社名</label><span>${this._esc(r.company)}</span></div>
  <div class="field"><label>係員</label><span>${this._esc(r.staff)}</span></div>
</div>
<table>
<thead>
<tr>
<th>業者名</th><th>予定<br>人数</th><th>本日<br>人数</th><th>前回<br>累計</th><th>累計</th><th>車</th>
<th>作業指示内容</th><th>火気</th><th>安全注意事項</th><th>署名</th>
</tr>
</thead>
<tbody>${rows}</tbody>
<tfoot>
<tr>
<td><strong>合計</strong></td>
<td></td>
<td class="num"><strong>${totalWorkers}</strong></td>
<td></td><td></td>
<td class="num"><strong>${totalVehicles}</strong></td>
<td colspan="5"></td>
</tr>
</tfoot>
</table>
<div class="footer-grid">
  <div class="footer-field"><label>搬入予定</label><div>${this._esc(r.deliveryPlan)}</div></div>
  <div class="footer-field"><label>本日の残業予定</label><div>${this._esc(r.overtimePlan)}</div></div>
  <div class="footer-field"><label>行番等・メモ</label><div>${this._esc(r.memo)}</div></div>
</div>
</div>`;
  },

  _esc(str) {
    return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  },

  // ---- 機械点検表 PDF ----
  async generateInspectionPDF(insp, equipment) {
    const html = this._buildInspectionHtml(insp, equipment || {});
    const fn = '点検表_' + (insp.equipmentName || '機械') + '_' + (insp.date || '').replace(/-/g, '') + '.pdf';
    await this._renderAndDownload(html, fn, null);
  },

  _buildInspectionHtml(insp, eq) {
    const resClass = v => v === '不良' ? 'r-bad' : v === '要修理' ? 'r-warn' : v === '異常なし' ? 'r-ok' : '';
    // sections があればグループ表示、無ければ items からフラット表示
    let bodyRows = '';
    if (insp.sections && insp.sections.length) {
      bodyRows = insp.sections.map(sec => {
        const items = (sec.items || []).map(it =>
          `<tr><td class="it">${this._esc(it.label)}</td><td class="rs ${resClass(it.result)}">${this._esc(it.result || '')}</td></tr>`
        ).join('');
        return `<tr><td class="grp" colspan="2">${this._esc(sec.group)}</td></tr>${items}`;
      }).join('');
    } else {
      bodyRows = Object.entries(insp.items || {}).map(([label, v]) =>
        `<tr><td class="it">${this._esc(label)}</td><td class="rs ${resClass(v)}">${this._esc(v)}</td></tr>`
      ).join('');
    }

    const overallClass = insp.overall === '使用可' ? 'ov-ok' : 'ov-ng';

    return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Meiryo','MS Gothic',sans-serif; font-size: 10pt; background: white; }
.page { width: 210mm; min-height: 297mm; padding: 14mm; }
h1 { font-size: 15pt; text-align: center; margin-bottom: 5mm; }
.hgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm; margin-bottom: 4mm; }
.field { border: 1px solid #333; padding: 2mm 3mm; }
.field label { font-size: 8pt; color: #555; display: block; }
.field span { font-size: 11pt; font-weight: bold; }
.wide { grid-column: span 2; }
table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
th { background: #1e40af; color: white; padding: 2mm; font-size: 9pt; border: 1px solid #999; }
td { border: 1px solid #bbb; padding: 1.8mm 3mm; font-size: 9.5pt; }
td.grp { background: #e8eefb; font-weight: bold; color: #1e40af; }
td.it { width: 78%; }
td.rs { text-align: center; font-weight: bold; }
.r-ok { color: #15803d; } .r-warn { color: #a16207; } .r-bad { color: #b91c1c; }
.overall-box { border: 2px solid #333; padding: 3mm; text-align: center; font-size: 13pt; font-weight: bold; margin-bottom: 4mm; }
.ov-ok { color: #15803d; } .ov-ng { color: #b91c1c; }
.memo { border: 1px solid #333; padding: 3mm; min-height: 18mm; }
.memo label { font-size: 8pt; color: #555; display: block; margin-bottom: 1mm; }
.legend { font-size: 8pt; color: #666; margin-top: 3mm; }
</style></head><body>
<div class="page">
<h1>${this._esc(insp.title || '作業開始前点検表')}</h1>
<div class="hgrid">
  <div class="field wide"><label>機械・名称</label><span>${this._esc(insp.equipmentName || eq.name || '')}</span></div>
  <div class="field"><label>種別</label><span>${this._esc(eq.kind || '')}</span></div>
  <div class="field"><label>配置現場</label><span>${this._esc(eq.site_number || '')}</span></div>
  <div class="field"><label>点検日</label><span>${App.formatDate(insp.date)}</span></div>
  <div class="field"><label>点検者</label><span>${this._esc(insp.inspector || '')}</span></div>
</div>
<div class="overall-box ${overallClass}">総合判定：${this._esc(insp.overall || '—')}</div>
<table>
<thead><tr><th>点検項目</th><th style="width:22%">結果</th></tr></thead>
<tbody>${bodyRows}</tbody>
</table>
<div class="memo"><label>特記事項</label>${this._esc(insp.memo || '')}</div>
<div class="legend">○ 異常なし ／ △ 要修理 ／ × 不良</div>
</div>
</body></html>`;
  },

  // ---- KY（危険予知活動表 RKY）PDF ----
  async generateKyPDF(ky) {
    const html = this._buildKyHtml(ky);
    const fn = 'KY_' + (ky.siteNumber || '') + '_' + (ky.date || '').replace(/-/g, '') + '.pdf';
    await this._renderAndDownload(html, fn, null);
  },

  _buildKyHtml(ky) {
    const hz = (ky.hazards || []);
    const hazardRows = hz.map((h, i) => `<tr>
<td class="c">${i + 1}</td>
<td>${this._esc(h.hazard)}</td>
<td class="c">${this._esc(h.possibility)}</td>
<td class="c">${this._esc(h.severity)}</td>
<td class="c lv${h.level || 0}">${h.level || ''}</td>
<td class="c sm">${this._esc(h.judge || '')}</td>
</tr>`).join('');

    const measureRows = hz.map((h, i) => `<tr>
<td class="c">${i + 1}</td>
<td>${this._esc(h.measure)}</td>
<td class="c lv${h.levelAfter || 0}">${h.levelAfter || ''}</td>
</tr>`).join('');

    const qualRows = (ky.quals || []).filter(q => q.qual || q.worker).map(q =>
      `<tr><td>${this._esc(q.qual)}</td><td>${this._esc(q.worker)}</td></tr>`).join('');

    const workers = (ky.workers || []).map(w =>
      `<div class="wk"><div class="wk-name">${this._esc(w.name)}</div>
       ${w.signature ? `<img src="${w.signature}" class="wk-sig"/>` : '<div class="wk-sig"></div>'}</div>`).join('');

    return `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Meiryo','MS Gothic',sans-serif; font-size: 9pt; background: white; }
.page { width: 210mm; min-height: 297mm; padding: 10mm; }
h1 { font-size: 14pt; text-align: center; margin-bottom: 3mm; }
.top { display:flex; justify-content:space-between; font-size:9pt; margin-bottom:3mm; }
.box { border:1px solid #333; padding:2mm 3mm; margin-bottom:2mm; }
.box label { font-size:7.5pt; color:#555; display:block; }
.box .v { font-size:9.5pt; white-space:pre-wrap; min-height:5mm; }
.sect { font-weight:bold; color:#1e40af; font-size:9.5pt; margin:3mm 0 1mm; }
table { width:100%; border-collapse:collapse; margin-bottom:2mm; }
th { background:#1e40af; color:#fff; padding:1.3mm; font-size:8pt; border:1px solid #999; }
td { border:1px solid #bbb; padding:1.3mm 2mm; font-size:8.5pt; vertical-align:top; }
td.c { text-align:center; } td.sm { font-size:7.5pt; }
.lv1,.lv2 { background:#dcfce7; } .lv3 { background:#fef9c3; } .lv4,.lv5 { background:#fee2e2; font-weight:bold; }
.half { display:flex; gap:3mm; }
.half > div { flex:1; }
.wkwrap { display:grid; grid-template-columns: repeat(4,1fr); gap:2mm; }
.wk { border:1px solid #bbb; border-radius:3px; padding:1.5mm; text-align:center; }
.wk-name { font-size:8pt; margin-bottom:1mm; }
.wk-sig { width:100%; height:12mm; object-fit:contain; border-top:1px solid #eee; }
.legend { font-size:7pt; color:#555; border:1px solid #ccc; padding:2mm; margin-top:2mm; }
.foot { display:flex; justify-content:flex-end; margin-top:3mm; }
.foot .box { width:60mm; }
</style></head><body>
<div class="page">
<h1>危険予知活動表（ＲＫＹ）</h1>
<div class="top">
  <div>${App.formatDate(ky.date)}</div>
  <div>工事名：${this._esc(ky.siteName || '')}（${this._esc(ky.siteNumber || '')}）</div>
  <div>業者：${this._esc(ky.vendorName || '')}</div>
</div>
<div class="box"><label>作業内容</label><div class="v">${this._esc(ky.workContent)}</div></div>
<div class="box"><label>大西熱学からの指示事項（安全・作業）</label><div class="v">${this._esc(ky.instructions)}</div></div>
<div class="box"><label>本日の行動目標</label><div class="v">${this._esc(ky.actionGoal)}</div></div>

<div class="sect">危険性の評価</div>
<table><thead><tr><th style="width:7%">No</th><th>予測される危険性・有害性</th><th style="width:10%">可能性</th><th style="width:10%">重大性</th><th style="width:10%">危険度</th><th style="width:18%">判定</th></tr></thead>
<tbody>${hazardRows}</tbody></table>

<div class="sect">対策</div>
<table><thead><tr><th style="width:7%">No</th><th>危険性・有害性の対策</th><th style="width:18%">対策後危険度</th></tr></thead>
<tbody>${measureRows}</tbody></table>

<div class="half">
  <div>
    <div class="sect">本日の有資格作業及び作業者</div>
    <table><thead><tr><th>資格作業</th><th>作業者</th></tr></thead><tbody>${qualRows}</tbody></table>
  </div>
  <div>
    <div class="sect">確認欄</div>
    <div class="box" style="min-height:14mm;"><label>確認者</label><div class="v">${this._esc(ky.confirmer)}</div></div>
    <div class="box"><label>会社名（グループ名）</label><div class="v">${this._esc(ky.companyName)}</div></div>
  </div>
</div>

<div class="sect">作業員（サイン）</div>
<div class="wkwrap">${workers}</div>

<div class="legend">リスク判定基準：危険度 5＝即座に対策／4＝抜本的対策／3＝何らかの対策／2＝注意を要する／1＝現時点では対策不要　｜　可能性・重大性：○軽微/殆ど起らない　△重大/たまに　×極めて重大/かなり</div>
</div>
</body></html>`;
  },

  async _renderAndDownload(html, filename, reports) {
    // Use iframe approach
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:none;';
    document.body.appendChild(iframe);

    await new Promise(resolve => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });

    // Wait for images (signatures) to load
    const imgs = iframe.contentDocument.querySelectorAll('img');
    await Promise.all([...imgs].map(img => new Promise(r => {
      if (img.complete) r();
      else { img.onload = r; img.onerror = r; }
    })));

    await new Promise(r => setTimeout(r, 300));

    try {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pages = iframe.contentDocument.querySelectorAll('.page');
      for (let i = 0; i < pages.length; i++) {
        if (i > 0) pdf.addPage();
        const canvas = await html2canvas(pages[i], {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: pages[i].offsetWidth,
          height: pages[i].offsetHeight
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(filename);
    } finally {
      document.body.removeChild(iframe);
    }
  }
};
