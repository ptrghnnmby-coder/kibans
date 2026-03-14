
import { GeneratedProformaData } from './proformaEngine';

export function getProformaHtml(data: GeneratedProformaData): string {
    const { replacements, products } = data;

    // Helper to handle newlines in blocks
    const formatBlock = (text: string) => text ? text.replace(/\n/g, '<br/>') : '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${replacements.proforma_n}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 40px;
        }
        .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #1a3b5c;
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .logo {
            font-size: 24pt;
            font-weight: bold;
            color: #1a3b5c;
            text-transform: uppercase;
        }
        .trading-address {
            font-size: 8pt;
            color: #666;
            text-align: right;
            max-width: 300px;
        }
        .title {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            margin-bottom: 20px;
            color: #1a3b5c;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .box {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 4px;
            border: 1px solid #eee;
        }
        .box h3 {
            margin: 0 0 10px 0;
            font-size: 8pt;
            text-transform: uppercase;
            color: #888;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .info-row {
            display: flex;
            margin-bottom: 4px;
        }
        .label {
            width: 120px;
            font-weight: bold;
            color: #555;
        }
        .value {
            flex: 1;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th {
            background: #1a3b5c;
            color: white;
            padding: 10px;
            text-align: left;
            font-size: 9pt;
            text-transform: uppercase;
        }
        td {
            padding: 10px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
        }
        tr:nth-child(even) {
            background: #fcfcfc;
        }
        .totals {
            margin-top: 20px;
            float: right;
            width: 300px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .total-row.final {
            border-top: 2px solid #1a3b5c;
            border-bottom: none;
            font-weight: bold;
            font-size: 12pt;
            color: #1a3b5c;
            margin-top: 10px;
            padding-top: 10px;
        }
        .footer {
            margin-top: 50px;
            font-size: 8pt;
            color: #888;
            text-align: center;
            border-top: 1px solid #eee;
            padding-top: 20px;
        }
        .notes {
            margin-top: 30px;
            font-size: 9pt;
            background: #fffbe6;
            padding: 15px;
            border: 1px solid #ffe58f;
            border-radius: 4px;
        }
    </style>
</head>
<body>

    <div class="header">
        <div class="logo">
            ${replacements.trading ? replacements.trading : 'PROFORMA INVOICE'}
        </div>
        <div class="trading-address">
            ${formatBlock(replacements.trading_address)}
        </div>
    </div>

    <div class="title">PROFORMA INVOICE: ${replacements.proforma_n}</div>

    <div class="meta-grid">
        <div class="box">
            <h3>Bill To (Importer)</h3>
            <div>${formatBlock(replacements.importer_block)}</div>
        </div>
        <div class="box">
            <h3>Shipment Details</h3>
            <div class="info-row"><span class="label">Date:</span><span class="value">${replacements.date}</span></div>
            <div class="info-row"><span class="label">Shipping Date:</span><span class="value">${replacements.shipping_date}</span></div>
            <div class="info-row"><span class="label">Port of Loading:</span><span class="value">${replacements.port_loading}</span></div>
            <div class="info-row"><span class="label">Port of Discharge:</span><span class="value">${replacements.port_destination}</span></div>
            <div class="info-row"><span class="label">Shipping Line:</span><span class="value">${replacements.shipping_line}</span></div>
        </div>
        
        <div class="box">
            <h3>Exporter</h3>
            <div>${formatBlock(replacements.exporter_block)}</div>
            ${replacements.producer_block ? `<h3 style="margin-top:15px">Producer</h3><div>${formatBlock(replacements.producer_block)}</div>` : ''}
        </div>
        
        <div class="box">
            <h3>Terms</h3>
            <div class="info-row"><span class="label">Incoterm:</span><span class="value">${replacements.incoterm_port}</span></div>
            <div class="info-row"><span class="label">Payment Terms:</span><span class="value">${replacements.payment_terms}</span></div>
            <div class="info-row"><span class="label">Origin:</span><span class="value">Uruguay / Argentina</span></div>
            <div class="info-row"><span class="label">Brand:</span><span class="value">${replacements.brand || '-'}</span></div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th style="width: 10%">Cartons</th>
                <th style="width: 50%">Description</th>
                <th style="width: 15%; text-align: right">Quantity (KGS)</th>
                <th style="width: 10%; text-align: right">Unit Price</th>
                <th style="width: 15%; text-align: right">Total</th>
            </tr>
        </thead>
        <tbody>
            ${products.map(p => `
            <tr>
                <td>${p.cartons || '-'}</td>
                <td>${formatBlock(p.description)}</td>
                <td style="text-align: right">${p.qty}</td>
                <td style="text-align: right">${p.unit_price}</td>
                <td style="text-align: right">${p.subtotal}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div style="clear: both; overflow: hidden;">
        <div class="totals">
            <div class="total-row">
                <span>Total Net Weight:</span>
                <span>${replacements.total_net_weight} KGS</span>
            </div>
            <div class="total-row">
                <span>Total Gross Weight:</span>
                <span>${replacements.total_gross_weight} KGS</span>
            </div>
            <div class="total-row">
                <span>Total Cartons:</span>
                <span>${replacements.total_cartons}</span>
            </div>
            <div class="total-row final">
                <span>TOTAL:</span>
                <span>${replacements.total_number} USD</span>
            </div>
            <div style="margin-top: 10px; font-style: italic; font-size: 9pt; text-align: right;">
                ${replacements.total_text}
            </div>
        </div>
    </div>

    ${replacements.notes && replacements.notes !== 'No additional notes' ? `
    <div class="notes">
        <strong>Notes / Special Instructions:</strong><br/>
        ${formatBlock(replacements.notes)}
    </div>
    ` : ''}

    <div class="footer">
        <p>This document was automatically generated by Tess.</p>
        <p>Thank you for your business.</p>
    </div>

</body>
</html>
    `;
}
