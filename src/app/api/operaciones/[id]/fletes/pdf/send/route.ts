import { NextResponse } from 'next/server'
import { searchMasterInput, getAllContactos } from '@/lib/googleSheets'
import { exportDocToPdf } from '@/lib/googleDocs'
import { sendEmail, buildBookingEmailHTML, getFriendlyErrorMessage } from '@/lib/emailService'

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const operationId = params.id
        const { forwarder: forwarderName, docId } = await request.json()

        if (!forwarderName || !docId) {
            return NextResponse.json({ success: false, error: 'Forwarder name and docId are required' }, { status: 400 })
        }

        // 1. Fetch Details
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)
        if (!op) return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })

        const contacts = await getAllContactos()

        // 2. Determine Recipient (Internals only for now)
        const forwarderContact = contacts.find(c => c.empresa === forwarderName || c.id === forwarderName)
        const toEmail = op.userId
        if (!toEmail) return NextResponse.json({ success: false, error: 'Operation has no user assigned for email' }, { status: 400 })

        // 3. Export PDF from Google Docs
        const pdfBuffer = await exportDocToPdf(docId)

        // 4. Send Email
        const emailHtml = buildBookingEmailHTML(op, forwarderContact)
        const fileName = `Booking Instruction - ${operationId}.pdf`

        const ccList = []
        if (op.userId !== 'hm@southmarinetrading.com') {
            ccList.push('hm@southmarinetrading.com')
        }

        await sendEmail({
            to: toEmail,
            cc: ccList,
            subject: `Booking Instruction: ${operationId} - ${forwarderName}`,
            html: emailHtml,
            attachments: [
                {
                    filename: fileName,
                    content: Buffer.from(pdfBuffer)
                }
            ]
        })

        return NextResponse.json({ success: true })

    } catch (error: any) {
        console.error('Error sending Booking PDF email:', error)
        const friendlyMessage = getFriendlyErrorMessage(error)
        return NextResponse.json({ success: false, error: friendlyMessage }, { status: 500 })
    }
}
