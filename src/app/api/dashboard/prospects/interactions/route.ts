import { NextResponse } from 'next/server'
import { getCRMInteractions, addCRMInteraction } from '@/lib/googleSheets'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const prospectId = searchParams.get('prospectId')

        if (!prospectId) {
            return NextResponse.json({ success: false, error: 'Missing prospect ID' }, { status: 400 })
        }

        const interactions = await getCRMInteractions(prospectId)
        return NextResponse.json({ success: true, data: interactions })
    } catch (error) {
        console.error('Error in GET /api/dashboard/prospects/interactions:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch interactions' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { prospectId, author, message } = body

        if (!prospectId || !author || !message) {
            return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
        }

        const interaction = await addCRMInteraction({
            contactId: prospectId,
            author,
            message
        })

        return NextResponse.json({ success: true, data: interaction })
    } catch (error) {
        console.error('Error in POST /api/dashboard/prospects/interactions:', error)
        return NextResponse.json({ success: false, error: 'Failed to save interaction' }, { status: 500 })
    }
}
