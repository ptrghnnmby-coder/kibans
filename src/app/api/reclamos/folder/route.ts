import { NextResponse } from 'next/server'
import { createDriveSubfolder, getOperationById } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { operationId } = body

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Missing operationId' }, { status: 400 })
        }

        const operation = await getOperationById(operationId)
        if (!operation || !operation.idCarpeta) {
            return NextResponse.json({ success: false, error: 'Operation has no base folder' }, { status: 400 })
        }

        // Create the subfolder "Op# - claim"
        const folderName = `${operationId} - claim`
        const newFolderId = await createDriveSubfolder(operation.idCarpeta, folderName)

        return NextResponse.json({
            success: true,
            folderId: newFolderId,
            folderUrl: `https://drive.google.com/drive/folders/${newFolderId}`
        })
    } catch (error: any) {
        console.error('Error creating claim folder:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create folder' },
            { status: 500 }
        )
    }
}
