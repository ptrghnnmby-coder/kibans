const { google } = require('googleapis');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables manually
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

async function getAuthClient() {
    const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
    let credentials;
    if (credentialsBase64) {
        credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString('utf-8'));
    } else {
        throw new Error('No credentials found');
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ],
    });
    return auth.getClient();
}

async function main() {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Master Input!A1:AZ1',
        });

        if (res.data.values && res.data.values.length > 0) {
            console.log('Headers in Master Input:');
            console.log(JSON.stringify(res.data.values[0], null, 2));
        } else {
            console.log('No headers found.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main();
