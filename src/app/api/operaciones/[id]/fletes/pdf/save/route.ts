import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { exportDocToPdf, uploadFileToDrive, shareFile } from '@/lib/googleDocs'

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const operationId = params.id
        const body = await request.json()
        const { docId, forwarder: forwarderName, fileName } = body

        if (!docId || !forwarderName) {
            return NextResponse.json({ success: false, error: 'docId and forwarder name are required' }, { status: 400 })
        }

        // 1. Fetch Details to get folder ID
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        const folderId = op.idCarpeta
        if (!folderId) {
            throw new Error('Operation folder not found. Cannot save PDF.')
        }

        // 2. Export Google Doc to PDF
        const pdfBuffer = await exportDocToPdf(docId)

        // 3. Upload PDF to Drive
        const actualFileName = fileName || `Booking Instruction - ${forwarderName} - ${operationId}`

        const uploadResult = await uploadFileToDrive(
            Buffer.from(pdfBuffer),
            `${actualFileName}.pdf`,
            'application/pdf',
            folderId
        )

        // 4. Share if needed
        if (op.userId) {
            await shareFile(uploadResult.id, op.userId, 'reader')
        }

        return NextResponse.json({
            success: true,
            pdfId: uploadResult.id,
            webViewLink: uploadResult.webViewLink
        })

    } catch (error: any) {
        console.error('Error saving Booking PDF to Drive:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
