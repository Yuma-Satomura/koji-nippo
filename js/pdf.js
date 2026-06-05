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
