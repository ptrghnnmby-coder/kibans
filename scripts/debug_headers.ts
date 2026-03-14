import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { google } from 'googleapis'
import { getAuthClient, TABS } from '../src/lib/googleSheets'

const MASTER_SPREADSHEET_ID = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'

async function debugHeaders() {
    try {
        const authClient = await getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient as any })

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: `${TABS.cashFlow}!A1:Z1`
        })

        const headers = response.data.values ? response.data.values[0] : []
        console.log('Raw Headers:', JSON.stringify(headers))
        console.log('Processed Headers:', JSON.stringify(headers.map(h => h.trim().toLowerCase())))
    } catch (err) {
        console.error('Error debugging headers:', err)
    }
}

debugHeaders()
