import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { exportDocToPdf } from '@/lib/googleDocs'
import { sendEmail, buildPremiumEmailHTML, getFriendlyErrorMessage } from '@/lib/emailService'
import { getAllContactos, getAllProductos } from '@/lib/googleSheets'

export async function POST(request: Request) {
    try {
        const { operationId, docUrl, signature } = await request.json()

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Operation ID is required' }, { status: 400 })
        }

        // 1. Fetch Operation
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)
        if (!op) return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })

        // 2. Determine Recipients (Internal)
        const toEmail = op.userId || 'info@southmarinetrading.com'
        const ccList = ['hm@southmarinetrading.com']

        // Remove from CC if they are the primary recipient
        const finalCc = ccList.filter(email => email.toLowerCase() !== toEmail.toLowerCase())

        // 3. Get Document ID from URL
        const docId = docUrl.split('/d/')[1]?.split('/')[0]
        if (!docId) return NextResponse.json({ success: false, error: 'Invalid Document URL' }, { status: 400 })

        // 4. Export to PDF
        const pdfBuffer = await exportDocToPdf(docId)

        // 5. Send Email using Premium HTML Template
        const catalogProducts = await getAllProductos()
        const piNumber = op.piNumber || `Pi ${op.id}`

        const contacts = await getAllContactos()
        const importer = contacts.find(c => c.empresa === op.cliente || c.id === op.cliente)

        const html = buildPremiumEmailHTML(op, importer, catalogProducts, signature)

        await sendEmail({
            to: toEmail,
            cc: finalCc,
            subject: `Proforma Invoice ${piNumber} - South Marine Trading`,
            html: html,
            attachments: [
                {
                    filename: `${piNumber}.pdf`,
                    content: pdfBuffer
                }
            ]
        })

        // Update status in Sheets to '2. Proforma Enviada'
        if (op.estado === '1. Operación Creada') {
            // dynamically import to avoid circular dep if needed, or just use the imported one if I find it.
            // I will assume updateMasterInput or similar exists and import it.
            // Wait, I haven't found the function name yet. I should wait for the grep result.
            // But I can write the code to use a hypothetical function and then correct the import.
            // Actually, better to wait for grep.
        }

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Error sending proforma:', error)
        const friendlyMessage = getFriendlyErrorMessage(error)
        return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 })
    }
}
