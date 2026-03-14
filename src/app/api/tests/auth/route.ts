
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/googleSheets'

export async function GET() {
    try {
        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        const about = await drive.about.get({
            fields: 'user'
        })

        return NextResponse.json({
            success: true,
            user: about.data.user,
            mode: process.env.GOOGLE_REFRESH_TOKEN ? 'OAuth2 (User Token)' : 'Service Account'
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
