const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

async function fixHeaders() {
    // Read .env.local manually
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const env = fs.readFileSync(envPath, 'utf8');
        env.split('\n').forEach(line => {
            const [key, ...rest] = line.split('=');
            if (key && rest.length > 0) process.env[key.trim()] = rest.join('=').trim();
        });
    }

    const spreadsheetId = process.env.SHEET_NOTES_ID || '18ozoqFzOXa56OdTqVE8t42A3i3c1tQ6Gr7SZH5ua3qk';
    const tabName = 'Hoja 1';

    let authClient;
    try {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: refreshToken });
        authClient = oauth2Client;
    } catch (e) {
        console.error("Auth failed", e);
        return;
    }

    const sheets = google.sheets({ version: 'v4', auth: authClient });
    try {
        const newHeaders = ['id', 'content', 'author', 'timestamp', 'type', 'mentions', 'operationId'];
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1:G1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [newHeaders] }
        });
        console.log("Headers updated successfully to:", newHeaders.join(' | '));
    } catch (e) {
        console.error("Update failed:", e.message);
    }
}

fixHeaders();
