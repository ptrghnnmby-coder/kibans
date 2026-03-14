import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { type, concept, details, userEmail } = body

        console.log(`[SUGGESTION RECEIVED]`)
        console.log(`Type: ${type}`)
        console.log(`Concept: ${concept}`)
        console.log(`Details: ${details}`)
        console.log(`From: ${userEmail || 'anonymous'}`)
        console.log(`Intended Recipient: Marta System (natyzambonini@gmail.com)`)

        // In a real scenario, we would use a library like nodemailer or an external API (SendGrid, Postmark)
        // to send the email to hello@kibans.com.
        // For now, we simulate success.

        return NextResponse.json({ success: true, message: 'Sugerencia enviada correctamente' })
    } catch (error) {
        console.error('Error in suggestions API:', error)
        return NextResponse.json({ success: false, message: 'Error al enviar la sugerencia' }, { status: 500 })
    }
}
