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
    throw new Error('No refresh token found');
}

async function inspect() {
    try {
        const auth = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth });

        // Master Input
        const masterId = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';
        console.log(`\nInspecting Master Input (${masterId})...`);
        const masterMeta = await sheets.spreadsheets.get({ spreadsheetId: masterId });
        const masterTabs = masterMeta.data.sheets.map(s => s.properties.title);
        console.log('Tabs:', masterTabs.join(', '));

        // Read headers of first tab
        const masterData = await sheets.spreadsheets.values.get({
            spreadsheetId: masterId,
            range: `${masterTabs[0]}!A1:Z1`
        });
        console.log('Headers (Master Input):', masterData.data.values ? masterData.data.values[0] : 'EMPTY');

        // Products
        const prodId = '1ou2hHA5yB29fCF8smO0xC1PlboDlTgiBu3ryNrf1n8w';
        console.log(`\nInspecting Products (${prodId})...`);
        const prodMeta = await sheets.spreadsheets.get({ spreadsheetId: prodId });
        const prodTabs = prodMeta.data.sheets.map(s => s.properties.title);
        console.log('Tabs:', prodTabs.join(', '));

        const prodData = await sheets.spreadsheets.values.get({
            spreadsheetId: prodId,
            range: `${prodTabs[0]}!A1:Z1`
        });
        console.log('Headers (Products):', prodData.data.values ? prodData.data.values[0] : 'EMPTY');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

inspect();
