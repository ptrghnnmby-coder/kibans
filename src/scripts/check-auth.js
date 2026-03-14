
const { google } = require('googleapis');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkAuth() {
    console.log('--- Checking Service Account Auth ---');
    try {
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            },
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        const client = await auth.getClient();
        console.log('✅ Authentication Successful! Credentials are valid.');

        // Try to list 1 file to see if API uses proper project
        const drive = google.drive({ version: 'v3', auth: client });
        try {
            await drive.files.list({ pageSize: 1 });
            console.log('✅ API Connection Successful!');
        } catch (e) {
            console.log('⚠️ API Error (Access/Enabled?):', e.message);
        }

    } catch (error) {
        console.error('❌ Authentication Failed:', error.message);
    }
}

checkAuth();
