const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

async function run() {
    try {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:3000'
        );
        auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

        const sheets = google.sheets({ version: 'v4', auth });
        const meta = await sheets.spreadsheets.get({
            spreadsheetId: '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ'
        });

        for (const s of meta.data.sheets) {
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId: '136QW5v7Q6BV-pz6ki768MGgY5aW1xdXU5fDWo3Wv_bQ',
                range: `${s.properties.title}!A1:AZ2`
            });
            console.log(`Tab: ${s.properties.title} (GID: ${s.properties.sheetId})`);
            if (res.data.values && res.data.values[0]) {
                console.log(`  Row 1: ${res.data.values[0].join(' | ')}`);
            }
            if (res.data.values && res.data.values[1]) {
                console.log(`  Row 2: ${res.data.values[1].join(' | ')}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}
run();
