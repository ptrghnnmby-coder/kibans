
// Script to test listing folders in the Operations Root Folder
// Run with: npx tsx src/scripts/test-drive.ts

import { google } from 'googleapis'
import { getAuthClient } from '../lib/googleSheets'

const OPERATIONS_ROOT_FOLDER_ID = '1gIVhf5UWYRRMaUOv4Xou4msSfA4-jAC2'

async function listFolderContents() {
    try {
        console.log('Authenticating...')
        const auth = await getAuthClient()
        const drive = google.drive({ version: 'v3', auth: auth as any })

        console.log(`Listing contents of folder: ${OPERATIONS_ROOT_FOLDER_ID}`)

        const res = await drive.files.list({
            q: `'${OPERATIONS_ROOT_FOLDER_ID}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true
        })

        const files = res.data.files
        if (files && files.length > 0) {
            console.log('Files found:')
            files.forEach((file) => {
                console.log(`${file.name} (${file.id}) - ${file.mimeType}`)
            })
        } else {
            console.log('No files found.')
        }

        // Try creating a test folder
        console.log('Attempting to create a test folder...')
        const fileMetadata = {
            name: 'Test Folder Antigravity',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [OPERATIONS_ROOT_FOLDER_ID]
        }

        const folder = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true
        })

        console.log('Test folder created with ID:', folder.data.id)

    } catch (error: any) {
        console.error('Error:', error.message)
        if (error.response) {
            console.error('Response data:', error.response.data)
        }
    }
}

listFolderContents()
