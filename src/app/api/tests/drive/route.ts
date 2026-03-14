import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/googleSheets'

export async function GET() {
    try {
        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        // Test 1: Check template access
        const TEMPLATE_ID = '1Wc8x_6so3zam5Soc9nKBDmTtRQqae3wpRHnm5RkYrmo'
        let templateAccess = null
        try {
            const template = await drive.files.get({
                fileId: TEMPLATE_ID,
                fields: 'id, name, mimeType, capabilities'
            })
            templateAccess = { success: true, data: template.data }
        } catch (e: any) {
            templateAccess = { success: false, error: e.message }
        }

        // Test 2: Check folder access
        const FOLDER_ID = '1gIVhf5UWYRRMaUOv4Xou4msSfA4-jAC2'
        let folderAccess = null
        try {
            const folder = await drive.files.get({
                fileId: FOLDER_ID,
                fields: 'id, name, mimeType, capabilities'
            })
            folderAccess = { success: true, data: folder.data }
        } catch (e: any) {
            folderAccess = { success: false, error: e.message }
        }

        return NextResponse.json({
            templateAccess,
            folderAccess
        })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
