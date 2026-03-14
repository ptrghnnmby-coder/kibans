import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/googleSheets'

export async function GET() {
    try {
        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        // List all folders accessible to the authenticated user
        const response = await drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
            fields: 'files(id, name, parents, webViewLink)',
            pageSize: 100,
            orderBy: 'modifiedTime desc'
        })

        return NextResponse.json({
            success: true,
            folders: response.data.files,
            count: response.data.files?.length || 0
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
