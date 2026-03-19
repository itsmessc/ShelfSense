/**
 * Sustainability PDF Report — uses browser print-to-PDF.
 * Opens a styled window the user can print / Save as PDF via Ctrl+P.
 * Zero dependencies, works in all browsers.
 */
import type { DashboardData } from '../types/index.js';
import type { AnalyticsData } from '../api/analytics.js';

export function downloadSustainabilityReport(
  dashboard: DashboardData,
  analytics: AnalyticsData,
): void {
  const { sustainability_score: ss, totals, co2_saved_kg, waste_prevented_items } = dashboard;
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const gradeColor = ss.grade === 'A' ? '#16a34a' : ss.grade === 'B' ? '#65a30d' : ss.grade === 'C' ? '#d97706' : '#dc2626';

  const categoryRows = analytics.category_breakdown.slice(0, 8).map((c) => `
    <tr>
      <td>${c.category}</td>
      <td style="text-align:center">${c.count}</td>
      <td style="text-align:right">$${c.total_value.toFixed(2)}</td>
    </tr>`).join('');

  const topRows = analytics.top_consumed.slice(0, 6).map((t) => `
    <tr>
      <td>${t.name}</td>
      <td style="text-align:center">${t.category}</td>
      <td style="text-align:right">${t.total_used} ${t.unit}</td>
      <td style="text-align:right">${t.log_count}</td>
    </tr>`).join('');

  const expiringSoon = dashboard.expiring_soon.slice(0, 8).map((i) => `
    <tr>
      <td>${i.name}</td>
      <td>${i.expiry_date}</td>
      <td style="text-align:center">${i.days_until_expiry} day(s)</td>
      <td>${i.unit}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>ShelfSense Sustainability Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1f2937; padding: 40px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #15803d; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 800; color: #15803d; }
  .subtitle { font-size: 11px; color: #6b7280; margin-top: 2px; }
  .date { font-size: 11px; color: #6b7280; text-align: right; }
  h2 { font-size: 14px; font-weight: 700; color: #111827; border-left: 4px solid #15803d; padding-left: 8px; margin: 20px 0 10px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-val { font-size: 24px; font-weight: 800; color: #15803d; }
  .kpi-label { font-size: 10px; color: #6b7280; margin-top: 2px; }
  .score-box { display: flex; align-items: center; gap: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
  .grade { font-size: 48px; font-weight: 900; color: ${gradeColor}; }
  .breakdown { flex: 1; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .br-item { background: white; border-radius: 6px; padding: 8px; border: 1px solid #e5e7eb; }
  .br-bar { height: 6px; background: #d1fae5; border-radius: 3px; margin-top: 4px; }
  .br-fill { height: 6px; background: #15803d; border-radius: 3px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #f3f4f6; padding: 7px 10px; text-align: left; font-size: 10px; text-transform: uppercase; color: #6b7280; }
  td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">🌿 ShelfSense</div>
    <div class="subtitle">Sustainability &amp; Inventory Report</div>
  </div>
  <div class="date">Generated: ${date}</div>
</div>

<div class="kpis">
  <div class="kpi"><div class="kpi-val">${totals.item_count}</div><div class="kpi-label">Total Items</div></div>
  <div class="kpi"><div class="kpi-val">${co2_saved_kg}</div><div class="kpi-label">CO₂ Saved (kg)</div></div>
  <div class="kpi"><div class="kpi-val">${waste_prevented_items}</div><div class="kpi-label">Items Tracked</div></div>
  <div class="kpi"><div class="kpi-val">$${analytics.total_inventory_value.toFixed(0)}</div><div class="kpi-label">Inventory Value</div></div>
</div>

<h2>Sustainability Score</h2>
<div class="score-box">
  <div>
    <div class="grade">${ss.grade}</div>
    <div style="font-size:18px;font-weight:700;color:${gradeColor}">${ss.score}/100</div>
    <div style="font-size:11px;color:#6b7280">${ss.label}</div>
  </div>
  <div class="breakdown">
    ${Object.entries(ss.breakdown).map(([key, val]) => `
    <div class="br-item">
      <div style="font-size:10px;color:#6b7280;text-transform:capitalize">${key.replace(/_/g,' ')}</div>
      <div style="font-weight:700;font-size:13px">${val}%</div>
      <div class="br-bar"><div class="br-fill" style="width:${val}%"></div></div>
    </div>`).join('')}
  </div>
</div>

<h2>Inventory by Category</h2>
<table>
  <thead><tr><th>Category</th><th style="text-align:center">Items</th><th style="text-align:right">Value</th></tr></thead>
  <tbody>${categoryRows || '<tr><td colspan="3" style="color:#9ca3af;text-align:center">No data</td></tr>'}</tbody>
</table>

<h2>Top Consumed Items (30 days)</h2>
<table>
  <thead><tr><th>Item</th><th style="text-align:center">Category</th><th style="text-align:right">Total Used</th><th style="text-align:right">Logs</th></tr></thead>
  <tbody>${topRows || '<tr><td colspan="4" style="color:#9ca3af;text-align:center">No usage data</td></tr>'}</tbody>
</table>

${expiringSoon ? `<h2>Expiring Soon</h2>
<table>
  <thead><tr><th>Item</th><th>Expiry Date</th><th style="text-align:center">Days Left</th><th>Unit</th></tr></thead>
  <tbody>${expiringSoon}</tbody>
</table>` : ''}

<div class="footer">
  ShelfSense — Green-Tech Inventory Management &nbsp;|&nbsp; Powered by Gemini AI &nbsp;|&nbsp; ${date}
</div>
<script>window.onload=()=>{window.print();}</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { alert('Please allow popups to download the report.'); return; }
  win.document.write(html);
  win.document.close();
}
