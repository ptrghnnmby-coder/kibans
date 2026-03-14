import { NextResponse } from 'next/server'
import { getCRMInteractions, addCRMInteraction } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const interactions = await getCRMInteractions(undefined, params.id)
        return NextResponse.json({ data: interactions })
    } catch (error) {
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

        const newInteraction = await addCRMInteraction({
            leadId: params.id,
            contactId: params.id,
            author: session?.user?.name || session?.user?.email || 'Sistema',
            message: body.message
        })

        return NextResponse.json({ success: true, data: newInteraction })
    } catch (error) {
        console.error('API Error in lead interactions POST:', error)
        return NextResponse.json({ error: 'Failed to save interaction' }, { status: 500 })
    }
}
