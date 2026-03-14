const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function getAuthClient() {
    if (process.env.GOOGLE_REFRESH_TOKEN && process.env.GOOGLE_CLIENT_ID) {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:3000'
        );
        oauth2Client.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        });
        return oauth2Client;
    }
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    return await auth.getClient();
}

async function syncFreightData() {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        const trackingId = '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ';
        const masterId = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';
        const trackingRange = 'Pendientes de Carga!A1:Z100'; // Adjust range as needed
        const cashFlowTab = 'CashFlow';

        console.log('Fetching tracking data with colors...');
        const trackingResponse = await sheets.spreadsheets.get({
            spreadsheetId: trackingId,
            ranges: [trackingRange],
            includeGridData: true
        });

        const sheet = trackingResponse.data.sheets[0];
        const rowData = sheet.data[0].rowData;

        if (!rowData) {
            console.log('No row data found in tracking sheet.');
            return;
        }

        const headers = rowData[0].values.map(v => v.formattedValue);
        const fleteIdx = headers.indexOf('Flete');
        const cargaIdx = headers.indexOf('N Carga');
        const fechaPagoIdx = headers.indexOf('Fecha de Pago');

        if (fleteIdx === -1 || cargaIdx === -1) {
            console.error('Required columns (Flete, N Carga) not found.');
            return;
        }

        console.log('Fetching existing cash flow data to avoid duplicates...');
        const cashFlowDataRes = await sheets.spreadsheets.values.get({
            spreadsheetId: masterId,
            range: `${cashFlowTab}!A:Z`
        });

        const cashFlowHeaders = (cashFlowDataRes.data.values && cashFlowDataRes.data.values[0])
            ? cashFlowDataRes.data.values[0].map(h => h.trim().toLowerCase())
            : [];

        const existingEntries = new Set();
        if (cashFlowDataRes.data.values) {
            const idCargaCol = cashFlowHeaders.indexOf('id_carga');
            const categoriaCol = cashFlowHeaders.indexOf('categoria');

            cashFlowDataRes.data.values.slice(1).forEach(row => {
                if (row[categoriaCol] === 'Flete') {
                    existingEntries.add(row[idCargaCol]);
                }
            });
        }

        const newTransactions = [];
        const timestamp = new Date().toISOString();

        rowData.slice(1).forEach((row, i) => {
            const carga = row.values[cargaIdx]?.formattedValue;
            if (!carga || carga === '-' || existingEntries.has(carga)) return;

            const fleteCell = row.values[fleteIdx];
            const fleteValueRaw = fleteCell?.formattedValue || '';

            // Spanish/European format: $4.500,00 or 4.500,00
            // 1. Remove everything except numbers, dots and commas
            let cleanValue = fleteValueRaw.replace(/[^0-9.,]/g, '');
            // 2. Identify separators
            const lastComma = cleanValue.lastIndexOf(',');
            const lastDot = cleanValue.lastIndexOf('.');

            if (lastComma > lastDot) {
                // Formatting like 4.500,00
                cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
            } else if (lastDot > lastComma) {
                // Formatting like 4,500.00
                cleanValue = cleanValue.replace(/,/g, '');
            }

            const fleteAmount = parseFloat(cleanValue);

            if (isNaN(fleteAmount) || fleteAmount === 0) return;

            const fechaPago = row.values[fechaPagoIdx]?.formattedValue || '';

            const textFormat = fleteCell?.effectiveFormat?.textFormat || {};
            const color = textFormat.foregroundColor || { red: 0, green: 0, blue: 0 };
            const r = color.red || 0;
            const g = color.green || 0;
            const b = color.blue || 0;

            // Logic: Red (R>0.5) is PENDIENTE, otherwise PAGADO
            const status = (r > 0.5 && g < 0.5 && b < 0.5) ? 'PENDIENTE' : 'PAGADO';

            const txId = Math.random().toString(36).substring(2, 10);

            // Map to CashFlow headers: ID, ID_Carga, Fecha, Tipo, Categoria, Descripcion, Monto, Estado, Timestamp, Fecha para agendar
            const newRow = new Array(cashFlowHeaders.length).fill('');
            const setVal = (col, val) => {
                const idx = cashFlowHeaders.indexOf(col.toLowerCase());
                if (idx !== -1) newRow[idx] = String(val);
            };

            setVal('id', txId);
            setVal('id_carga', carga);
            setVal('fecha', fechaPago || new Date().toISOString().split('T')[0]);
            setVal('tipo', 'EGRESO');
            setVal('categoria', 'Flete');
            setVal('descripcion', `Flete carga ${carga}`);
            setVal('monto', fleteAmount);
            setVal('estado', status);
            setVal('timestamp', timestamp);
            setVal('fecha para agendar', fechaPago || '');

            newTransactions.push(newRow);
            console.log(`Prepared: Carga ${carga} | Monto ${fleteAmount} | Status ${status}`);
        });

        if (newTransactions.length > 0) {
            console.log(`Appending ${newTransactions.length} new transactions...`);
            await sheets.spreadsheets.values.append({
                spreadsheetId: masterId,
                range: `${cashFlowTab}!A:Z`,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: newTransactions
                }
            });
            console.log('Sync completed successfully.');
        } else {
            console.log('No new transactions to sync.');
        }

    } catch (error) {
        console.error('Error during sync:', error);
    }
}

syncFreightData();
