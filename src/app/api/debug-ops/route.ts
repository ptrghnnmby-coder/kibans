import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { TABS, getAuthClient } from '@/lib/googleSheets'

export async function GET() {
    try {
        const auth = await getAuthClient()
        const sheets = google.sheets({ version: 'v4', auth: auth as any })
        const spreadsheetId = process.env.SHEET_MASTER_ID || '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro'

        const resMaster = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${TABS.masterInput}!A1:AZ2`,
        })

        const resCash = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${TABS.cashFlow}!A1:AZ2`,
        })

        return NextResponse.json({
            master: {
                headers: resMaster.data.values?.[0] || [],
                sampleRow: resMaster.data.values?.[1] || [],
                tabName: TABS.masterInput
            },
            cashFlow: {
                headers: resCash.data.values?.[0] || [],
                sampleRow: resCash.data.values?.[1] || [],
                tabName: TABS.cashFlow
            }
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
