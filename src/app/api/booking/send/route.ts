import { NextResponse } from 'next/server'
import { searchMasterInput } from '@/lib/googleSheets'
import { exportDocToPdf } from '@/lib/googleDocs'
import { sendEmail, buildBookingEmailHTML, getFriendlyErrorMessage } from '@/lib/emailService'
import { getAllContactos } from '@/lib/googleSheets'

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

        // 2. Find forwarder contact
        const contacts = await getAllContactos()
        const forwarder = contacts.find(c => c.empresa === op.forwarder || c.id === op.forwarder)

        // Forwarder email is primary recipient; internal user gets CC
        const toEmail = forwarder?.email
        if (!toEmail) return NextResponse.json({ success: false, error: 'No se encontró el email del forwarder. Verifique que el forwarder tenga email registrado.' }, { status: 400 })

        // 3. Get Document ID from URL
        const docId = docUrl.split('/d/')[1]?.split('/')[0]
        if (!docId) return NextResponse.json({ success: false, error: 'Invalid Document URL' }, { status: 400 })

        // 4. Export to PDF
        const pdfBuffer = await exportDocToPdf(docId)

        // 5. Build email HTML
        const html = buildBookingEmailHTML(op, forwarder)

        // 6. Build CC list (internal user + HM if different)
        const ccList: string[] = []
        if (op.userId) ccList.push(op.userId)
        if (op.userId !== 'hm@southmarinetrading.com') {
            ccList.push('hm@southmarinetrading.com')
        }
        const finalCc = ccList.filter(e => e.toLowerCase() !== toEmail.toLowerCase())

        const bookingRef = `Booking ${op.id}`

        await sendEmail({
            to: toEmail,
            cc: finalCc,
            subject: `Instrucción de Booking - ${bookingRef} - South Marine Trading`,
            html: html,
            attachments: [
                {
                    filename: `${bookingRef}.pdf`,
                    content: pdfBuffer
                }
            ]
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Error sending booking instruction:', error)
        const friendlyMessage = getFriendlyErrorMessage(error)
        return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 })
    }
}
