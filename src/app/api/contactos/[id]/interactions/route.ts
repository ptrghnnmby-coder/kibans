import { NextResponse } from 'next/server'
import { getCRMInteractions, addCRMInteraction } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const interactions = await getCRMInteractions(params.id)
        return NextResponse.json({ success: true, data: interactions })
    } catch (error) {
        console.error('Error fetching contact interactions:', error)
        return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 })
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession()
        const body = await req.json()

        if (!body.message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 })
        }

        const newInteraction = await addCRMInteraction({
            contactId: params.id,
            author: session?.user?.name || session?.user?.email || 'Sistema',
            message: body.message
        })

        return NextResponse.json({ success: true, data: newInteraction })
    } catch (error) {
        console.error('API Error in contact interactions POST:', error)
        return NextResponse.json({ error: 'Failed to save interaction' }, { status: 500 })
    }
}
