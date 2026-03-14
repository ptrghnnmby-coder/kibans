
export interface BookingInstructionData {
    id: string
    date: string
    shipper: { name: string, address: string, taxId: string }
    consignee: { name: string, address: string, taxId: string }
    notify: { name: string, address: string, taxId: string }
    portLoad: string
    portDest: string
    commodity: string
    weight: string
    quantity: string
    containerType: string
    temperature: string
    ventilation: string
    remarks: string
}

export function getBookingInstructionHtml(data: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Booking Instruction ${data.id}</title>
    <style>
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 8pt;
            line-height: 1.3;
            color: #000;
            margin: 0;
            padding: 20px;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
            table-layout: fixed;
        }
        
        th, td {
            border: 1px solid #000;
            padding: 6px;
            text-align: left;
            vertical-align: top;
            word-wrap: break-word;
        }
        
        /* The specific gold color from the template */
        th, .section-header {
            background-color: #dcb360; 
            font-weight: bold;
            font-size: 8pt;
            text-transform: uppercase;
        }

        td {
            background-color: #fff;
        }

        /* Specific formatting for the values */
        .value {
            white-space: pre-wrap;
        }

        .header-trading {
            font-weight: bold;
            font-size: 14pt;
        }
        
        .header-address {
            font-size: 9pt;
            margin-bottom: 20px;
        }

    </style>
</head>
<body>

    <div class="header-trading">${data.trading || 'SOUTH MARINE TRADING'}</div>
    <div class="header-address">${data.trading_address || 'Shipping Order / International Logistics'}</div>

    <table>
        <tr>
            <th style="width: 50%;">BOOKING NUMBER</th>
            <th style="width: 50%;">DATE (dd/mm/yyyy)</th>
        </tr>
        <tr>
            <td><div class="value">${data.proforma_n || data.id}</div></td>
            <td><div class="value">${data.date}</div></td>
        </tr>
    </table>

    <table>
        <tr>
            <th style="width: 33%">SHIPPER</th>
            <th style="width: 33%">CONSIGNEE</th>
            <th style="width: 34%">NOTIFY PARTY</th>
        </tr>
        <tr>
            <td>
                <div class="value">${data.shipper?.name || ''}</div>
                <div class="value">${data.shipper?.address || ''}</div>
                <div class="value">${data.shipper?.taxId ? `Tax ID: ${data.shipper.taxId}` : ''}</div>
            </td>
            <td>
                <div class="value">${data.consignee?.name || ''}</div>
                <div class="value">${data.consignee?.address || ''}</div>
                <div class="value">${data.consignee?.taxId ? `Tax ID: ${data.consignee.taxId}` : ''}</div>
            </td>
            <td>
                <div class="value">${data.notify?.name || ''}</div>
                <div class="value">${data.notify?.address || ''}</div>
                <div class="value">${data.notify?.taxId ? `Tax ID: ${data.notify.taxId}` : ''}</div>
            </td>
        </tr>
    </table>

    <table>
        <tr>
            <th colspan="4" class="section-header">SHIPPING DETAILS</th>
        </tr>
        <tr>
            <td style="width: 20%; font-weight: bold;">PORT OF LOADING</td>
            <td style="width: 30%;"><div class="value">${data.portLoad || ''}</div></td>
            <td style="width: 20%; font-weight: bold;">ORIGIN</td>
            <td style="width: 30%;"><div class="value">${data.origin || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">PORT OF DESTINATION</td>
            <td><div class="value">${data.portDest || ''}</div></td>
            <td style="font-weight: bold;">CONTAINER TYPE</td>
            <td><div class="value">${data.containerType || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">FREIGHT TERMS</td>
            <td><div class="value">${data.freightTerm || ''}</div></td>
            <td style="font-weight: bold;">INCOTERM</td>
            <td><div class="value">${data.incoterm || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">TEMPERATURE</td>
            <td><div class="value">${data.temperature || ''}</div></td>
            <td style="font-weight: bold;">VENTILATION</td>
            <td><div class="value">${data.ventilation || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">HUMIDITY</td>
            <td><div class="value">${data.humidity || ''}</div></td>
            <td style="font-weight: bold;">DRAINS</td>
            <td><div class="value">${data.drains || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">NOTES</td>
            <td colspan="3"><div class="value">${data.remarks || ''}</div></td>
        </tr>
        <tr>
            <td style="font-weight: bold;">COMMODITY</td>
            <td colspan="3"><div class="value">${data.commodity || ''}</div></td>
        </tr>
    </table>

    <table>
        <tr>
            <th colspan="4" class="section-header">
                PRODUCT DETAILS <span style="float: right; font-style: italic; font-weight: normal; font-size: 7pt;">(EXPRESSED IN KGS)</span>
            </th>
        </tr>
        <tr style="background-color: #f2f2f2;">
            <td style="width: 20%; font-weight: bold; background-color: #e5e7eb;">QUANTITY</td>
            <td style="width: 15%; font-weight: bold; background-color: #e5e7eb;">CTNS</td>
            <td style="width: 45%; font-weight: bold; background-color: #e5e7eb;">PRODUCT DETAIL</td>
            <td style="width: 20%; font-weight: bold; background-color: #e5e7eb;">GROSS</td>
        </tr>
        ${Array.from({ length: 10 }).map((_, i) => {
        const index = i + 1;
        const qty = data[`product_qty_${index}`];
        if (!qty) return '';

        return `
            <tr>
                <td><div class="value">${data[`product_qty_${index}`]}</div></td>
                <td><div class="value">${data[`product_cartons_${index}`]}</div></td>
                <td><div class="value">${data[`product_desc_${index}`]}</div></td>
                <td><div class="value">${data[`product_gross_${index}`]}</div></td>
            </tr>`;
    }).join('')}
        <tr>
            <td colspan="2" style="font-weight: bold; background-color: #f2f2f2; text-align: right;">TOTAL</td>
            <td style="background-color: #f2f2f2;"><div class="value" style="font-weight: bold;">${data.total_cartons || ''}</div></td>
            <td style="background-color: #f2f2f2;"><div class="value" style="font-weight: bold;">${data.total_gross || ''}</div></td>
        </tr>
    </table>

</body>
</html>
    `;
}

