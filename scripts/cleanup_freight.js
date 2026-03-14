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

async function cleanupFreight() {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        const masterId = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';
        const cashFlowTab = 'CashFlow';

        console.log('Fetching cash flow data for cleanup...');
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: masterId,
            range: `${cashFlowTab}!A:Z`
        });

        if (!res.data.values) return;

        const headers = res.data.values[0].map(h => h.trim().toLowerCase());
        const categoriaIdx = headers.indexOf('categoria');
        const descriptionIdx = headers.indexOf('descripcion');

        if (categoriaIdx === -1) return;

        const meta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
        const sheetId = meta.data.sheets?.find(s => s.properties?.title === cashFlowTab)?.properties?.sheetId;

        // Find row indices to delete (in reverse order to avoid shifting issues)
        const rowsToDelete = [];
        res.data.values.slice(1).forEach((row, i) => {
            if (row[categoriaIdx] === 'Flete' && row[descriptionIdx]?.startsWith('Flete carga')) {
                rowsToDelete.push(i + 1); // 0-based row + 1 for header offset
            }
        });

        if (rowsToDelete.length === 0) {
            console.log('No rows to delete.');
            return;
        }

        console.log(`Deleting ${rowsToDelete.length} rows...`);

        // Sort rows to delete in descending order
        rowsToDelete.sort((a, b) => b - a);

        const requests = rowsToDelete.map(rowIndex => ({
            deleteDimension: {
                range: {
                    sheetId,
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1
                }
            }
        }));

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: masterId,
            requestBody: {
                requests
            }
        });

        console.log('Cleanup completed.');

    } catch (error) {
        console.error('Error during cleanup:', error);
    }
}

cleanupFreight();
