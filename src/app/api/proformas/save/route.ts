import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { exportDocToPdf, uploadFileToDrive, shareFile } from '@/lib/googleDocs'

export async function POST(request: Request) {
    try {
        const { docId, operationId, fileName } = await request.json()

        if (!docId || !operationId) {
            return NextResponse.json({ success: false, error: 'Doc ID and Operation ID required' }, { status: 400 })
        }

        // 1. Fetch Operation to get folder ID
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        const folderId = op.idCarpeta

        // 2. Export Doc to PDF Buffer
        console.log(`[PDF] Exporting doc ${docId} to PDF...`)
        const pdfBuffer = await exportDocToPdf(docId)

        // 3. Upload PDF to Drive
        const pdfName = (fileName || `Proforma ${operationId}`) + '.pdf'
        console.log(`[PDF] Uploading ${pdfName} to folder ${folderId}...`)
        const uploadResult = await uploadFileToDrive(
            pdfBuffer,
            pdfName,
            'application/pdf',
            folderId
        )

        // 4. Share PDF
        if (op.userId) {
            await shareFile(uploadResult.id, op.userId, 'reader')
        }

        return NextResponse.json({
            success: true,
            pdfId: uploadResult.id,
            webViewLink: uploadResult.webViewLink
        })

    } catch (error: any) {
        console.error('Error saving PDF:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
