import { google } from 'googleapis'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const MASTER_SPREADSHEET_ID = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro';

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---')
    console.log('Master Spreadsheet ID:', MASTER_SPREADSHEET_ID)

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/^"|"$/g, ''),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })

    const sheets = google.sheets({ version: 'v4', auth })

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: MASTER_SPREADSHEET_ID,
            range: 'Master Imput!A:AZ',
        })

        const rows = response.data.values || []
        console.log('Total rows found in "Master Imput":', rows.length)

        if (rows.length > 0) {
            console.log('Headers:', rows[0])
            console.log('\nLast 5 rows:')
            rows.slice(-5).forEach((row, i) => {
                console.log(`Row ${rows.length - 5 + i + 1}:`, row[0], row[1], row[3], row[14], row[15])
            })
        } else {
            console.log('NO DATA FOUND in "Master Imput"')
        }

    } catch (error) {
        console.error('DIAGNOSTIC FAILED:', error)
    }
}

diagnose()
