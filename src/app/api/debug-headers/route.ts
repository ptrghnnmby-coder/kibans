import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
    try {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )
        auth.setCredentials({
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
        })

        const sheets = google.sheets({ version: 'v4', auth })
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId: '1TmEDhSznW0XgUUETm2aP_0g_rDopW7ZVTbxm3QavDro',
            range: 'Master Imput!1:1',
        })

        return NextResponse.json({
            success: true,
            headers: res.data.values?.[0] || []
        })

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message })
    }
}
