import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteFile } from '@/lib/googleDocs'

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { fileId } = await request.json()
        if (!fileId) {
            return NextResponse.json({ success: false, error: 'File ID is required' }, { status: 400 })
        }

        await deleteFile(fileId)

        return NextResponse.json({ success: true, message: 'File deleted from Drive' })
    } catch (error: any) {
        console.error('Error in /api/drive/delete:', error)
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to delete file from Drive'
        }, { status: 500 })
    }
}
