
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { getAuthClient } from '@/lib/googleSheets'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        // 1. Get or create a "Bot Feedback Screenshots" folder
        // For simplicity, we'll just upload to the root or a known folder if specified
        // Let's try to find/create a "Tess Feedback" folder
        let folderId = ''
        const folderSearch = await drive.files.list({
            q: "name = 'Tess Feedback' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields: 'files(id)'
        })

        if (folderSearch.data.files && folderSearch.data.files.length > 0) {
            folderId = folderSearch.data.files[0].id!
        } else {
            const folderMetadata = {
                name: 'Tess Feedback',
                mimeType: 'application/vnd.google-apps.folder'
            }
            const folder = await drive.files.create({
                requestBody: folderMetadata,
                fields: 'id'
            })
            folderId = folder.data.id!
        }

        // 2. Upload the file
        const buffer = Buffer.from(await file.arrayBuffer())
        const fileMetadata = {
            name: `${Date.now()}_${file.name}`,
            parents: [folderId]
        }
        const media = {
            mimeType: file.type,
            body: require('stream').Readable.from(buffer)
        }

        const uploadedFile = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink'
        })

        // 3. Set permissions to anyone with link (optional, but good for viewing in sheets later)
        try {
            await drive.permissions.create({
                fileId: uploadedFile.data.id!,
                requestBody: {
                    role: 'reader',
                    type: 'anyone'
                }
            })
        } catch (permError) {
            console.warn('Could not set public permissions on feedback image:', permError)
        }

        return NextResponse.json({
            success: true,
            fileId: uploadedFile.data.id,
            viewLink: uploadedFile.data.webViewLink,
            contentLink: uploadedFile.data.webContentLink
        })

    } catch (error) {
        console.error('Error uploading to Drive:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
