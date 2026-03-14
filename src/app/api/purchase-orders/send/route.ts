import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { exportDocToPdf } from '@/lib/googleDocs'
import { sendEmail, buildPremiumPOEmailHTML, getFriendlyErrorMessage } from '@/lib/emailService'
import { getAllContactos, getAllProductos } from '@/lib/googleSheets'

export async function POST(request: Request) {
    try {
        const { operationId, docUrl } = await request.json()

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Operation ID is required' }, { status: 400 })
        }

        // 1. Fetch Operation
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)
        if (!op) return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })

        // 2. Determine Recipient (Internals only for now)
        const contacts = await getAllContactos()
        const targetId = op.productor || op.exportador || ""
        const supplier = contacts.find(c => c.empresa === targetId || c.id === targetId)

        const toEmail = op.userId
        if (!toEmail) return NextResponse.json({ success: false, error: 'Operation has no user assigned for email' }, { status: 400 })

        // 3. Get Document ID from URL
        const docId = docUrl.split('/d/')[1]?.split('/')[0]
        if (!docId) return NextResponse.json({ success: false, error: 'Invalid Document URL' }, { status: 400 })

        // 4. Export to PDF
        const pdfBuffer = await exportDocToPdf(docId)

        // 5. Send Email using Premium HTML Template
        const catalogProducts = await getAllProductos()
        const poNumber = op.ocId || op.id ? `Po ${op.id}` : `Po-Draft`

        const html = buildPremiumPOEmailHTML(op, supplier, catalogProducts)

        // Calculate CCs
        const ccList = []
        if (op.userId !== 'hm@southmarinetrading.com') {
            ccList.push('hm@southmarinetrading.com')
        }

        await sendEmail({
            to: toEmail,
            cc: ccList,
            subject: `Purchase Order ${poNumber} - South Marine Trading`,
            html: html,
            attachments: [
                {
                    filename: `${poNumber}.pdf`,
                    content: pdfBuffer
                }
            ]
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Error sending Purchase Order:', error)
        const friendlyMessage = getFriendlyErrorMessage(error)
        return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 })
    }
}
