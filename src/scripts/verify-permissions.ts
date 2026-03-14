
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyPermissions() {
    console.log('--- Verifying Google Service Account Permissions ---');

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
        console.error('❌ Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY in .env.local');
        return;
    }

    console.log(`🔹 Checking Service Account: ${clientEmail}`);

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey,
        },
        scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive',
        ],
    });

    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client as any });
    const drive = google.drive({ version: 'v3', auth: client as any });

    // Test Sheets Access
    const sheetId = process.env.SHEET_MASTER_ID;
    if (sheetId) {
        console.log(`🔹 Attempting to read Master Sheet ID: ${sheetId}`);
        try {
            const res = await sheets.spreadsheets.get({
                spreadsheetId: sheetId,
            });
            console.log(`✅ SUCCESS: Connected to Sheet "${res.data.properties?.title}"`);
        } catch (error: any) {
            console.error(`❌ FAILED to read Sheet: ${error.message}`);
            if (error.code === 403) {
                console.error(`   👉 ACTION REQUIRED: Share the sheet with ${clientEmail}`);
            }
        }
    } else {
        console.warn('⚠️ SHEET_MASTER_ID not found in .env.local');
    }

    // Test Drive Access (Operations Folder)
    // We don't have a direct env var for ROOT folder in .env.local usually, but let's check if we can list files
    try {
        console.log('🔹 Attempting to list files in Drive (Authentication Check)...');
        const res = await drive.files.list({
            pageSize: 1,
            fields: 'files(id, name)',
        });
        console.log('✅ SUCCESS: Authenticated with Drive API');
    } catch (error: any) {
        console.error(`❌ FAILED to access Drive API: ${error.message}`);
    }
}

verifyPermissions();
