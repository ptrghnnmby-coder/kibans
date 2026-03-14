import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/googleSheets'

export async function GET() {
    try {
        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        // List Shared Drives
        const sharedDrives = await drive.drives.list({
            fields: 'drives(id, name)'
        })

        // Now search for the folder in shared drives
        const FOLDER_ID = '1gIVhf5UWYRRMaUOv4Xou4msSfA4-jAC2'
        let folderAccess = null
        try {
            const folder = await drive.files.get({
                fileId: FOLDER_ID,
                fields: 'id, name, mimeType, driveId, capabilities',
                supportsAllDrives: true
            })
            folderAccess = { success: true, data: folder.data }
        } catch (e: any) {
            folderAccess = { success: false, error: e.message }
        }

        return NextResponse.json({
            sharedDrives: sharedDrives.data.drives,
            folderAccess
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
