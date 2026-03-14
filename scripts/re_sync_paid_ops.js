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
    throw new Error('OAuth 2.0 credentials not found');
}

function parseSpanishNumeric(val) {
    if (!val) return 0;
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

async function reSyncPaidOps() {
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

        const newTransactions = [];
        const timestamp = new Date().toISOString();

        data.slice(1).forEach((row, i) => {
            const carga = row[cargaIdx];
            if (!carga || carga === '-') return;

            const total = parseSpanishNumeric(row[totalIdx]);
            if (total === 0) return;

            const date = row[fechaPagoIdx] || row[etaIdx] || row[etdIdx] || timestamp.split('T')[0];
            const txId = Math.random().toString(36).substring(2, 10);

            // Expected headers in Master: ID, ID_Carga, Fecha, Tipo, Categoria, Descripcion, Monto, Estado, Timestamp, Fecha para agendar
            // We'll construct the row assuming 10 columns based on the read_cashflow output
            const newRow = [
                txId,
                carga,
                date,
                'INGRESO',
                'Venta',
                `Pago operación ${carga}`,
                total,
                'PAGADO',
                timestamp,
                date
            ];

            newTransactions.push(newRow);
            console.log(`Prepared: Carga ${carga} | Total ${total} | Date ${date}`);
        });

        if (newTransactions.length > 0) {
            console.log(`Updating Master Input starting at row 30...`);
            // Using update instead of append to be absolutely sure we start at 30
            await sheets.spreadsheets.values.update({
                spreadsheetId: masterId,
                range: `${cashFlowTab}!A30`,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values: newTransactions }
            });
            console.log('Sync completed successfully.');
        } else {
            console.log('No new transactions to sync.');
        }

    } catch (error) {
        console.error('Error during re-sync:', error);
    }
}

reSyncPaidOps();
