// @ts-nocheck
import { google } from 'googleapis';

async function main() {
    const auth = await getAuthClient();
    const sheets = google.sheets({ version: 'v4', auth: auth as any });
    const spreadsheetId = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Master Input!A1:AZ1',
        });

        if (res.data.values && res.data.values.length > 0) {
            console.log('Headers in Master Input:');
            console.log(res.data.values[0]);
        } else {
            console.log('No headers found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
