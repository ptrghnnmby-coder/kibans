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

function parseSpanishNumeric(val) {
    if (!val) return 0;
    // Spanish/European format: $4.500,00 or 4.500,00
    let cleanValue = val.replace(/[^0-9.,]/g, '');
    const lastComma = cleanValue.lastIndexOf(',');
    const lastDot = cleanValue.lastIndexOf('.');

    if (lastComma > lastDot) {
        cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (lastDot > lastComma) {
        cleanValue = cleanValue.replace(/,/g, '');
    }
    return parseFloat(cleanValue) || 0;
}

async function syncPaidOps() {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        const trackingId = '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ';
        const masterId = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';
        const trackingRange = 'Hoja 7!A1:E200';
        const cashFlowTab = 'CashFlow';

        console.log('Fetching Hoja 7 data...');
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: trackingId,
            range: trackingRange
        });

        const data = res.data.values;
        if (!data || data.length < 2) {
            console.log('No data found in Hoja 7.');
            return;
        }

        const headers = data[0].map(h => h.trim());
        const cargaIdx = headers.indexOf('N Carga');
        const totalIdx = headers.indexOf('Total');
        const fechaPagoIdx = headers.indexOf('Fecha de pago');
        const etaIdx = headers.indexOf('ETA');
        const etdIdx = headers.indexOf('ETD');

        console.log('Fetching existing cash flow data to avoid duplicates...');
        const cfRes = await sheets.spreadsheets.values.get({
            spreadsheetId: masterId,
            range: `${cashFlowTab}!A:Z`
        });

        const cfHeaders = cfRes.data.values ? cfRes.data.values[0].map(h => h.trim().toLowerCase()) : [];
        const existingEntries = new Set();
        if (cfRes.data.values) {
            const idCargaCol = cfHeaders.indexOf('id_carga');
            const categoriaCol = cfHeaders.indexOf('categoria');
            cfRes.data.values.slice(1).forEach(row => {
                if (row[categoriaCol] === 'Venta') {
                    existingEntries.add(row[idCargaCol]);
                }
            });
        }

        const newTransactions = [];
        const timestamp = new Date().toISOString();

        data.slice(1).forEach((row, i) => {
            const carga = row[cargaIdx];
            if (!carga || carga === '-' || existingEntries.has(carga)) return;

            const total = parseSpanishNumeric(row[totalIdx]);
            if (total === 0) return;

            // Date logic: Fecha de pago || ETA || ETD
            const date = row[fechaPagoIdx] || row[etaIdx] || row[etdIdx] || timestamp.split('T')[0];

            const txId = Math.random().toString(36).substring(2, 10);
            const newRow = new Array(cfHeaders.length).fill('');
            const setVal = (col, val) => {
                const idx = cfHeaders.indexOf(col.toLowerCase());
                if (idx !== -1) newRow[idx] = String(val);
            };

            setVal('id', txId);
            setVal('id_carga', carga);
            setVal('fecha', date);
            setVal('tipo', 'INGRESO');
            setVal('categoria', 'Venta');
            setVal('descripcion', `Pago operación ${carga}`);
            setVal('monto', total);
            setVal('estado', 'PAGADO');
            setVal('timestamp', timestamp);
            setVal('fecha para agendar', date);

            newTransactions.push(newRow);
            console.log(`Prepared: Carga ${carga} | Total ${total} | Date ${date}`);
        });

        if (newTransactions.length > 0) {
            console.log(`Appending ${newTransactions.length} new transactions...`);
            await sheets.spreadsheets.values.append({
                spreadsheetId: masterId,
                range: `${cashFlowTab}!A:Z`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: newTransactions }
            });
            console.log('Sync completed successfully.');
        } else {
            console.log('No new transactions to sync.');
        }

    } catch (error) {
        console.error('Error during sync:', error);
    }
}

syncPaidOps();
