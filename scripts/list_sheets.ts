import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { google } from 'googleapis'
import { getAuthClient } from '../src/lib/googleSheets'

const MASTER_SPREADSHEET_ID = '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'

async function listSheets() {
    try {
        const authClient = await getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth: authClient as any })

        const response = await sheets.spreadsheets.get({
            spreadsheetId: MASTER_SPREADSHEET_ID
        })

        console.log('Sheets in Spreadsheet:')
        response.data.sheets?.forEach(s => {
            console.log(`- ${s.properties?.title} (ID: ${s.properties?.sheetId})`)
        })
    } catch (err) {
        console.error('Error listing sheets:', err)
    }
}

listSheets()
