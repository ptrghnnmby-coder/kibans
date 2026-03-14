import { NextResponse } from 'next/server'
import { updateLead, deleteLead, getAllLeads } from '@/lib/googleSheets'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        let lead;

        if (isDemo) {
            const { MOCK_LEADS } = await import('@/lib/mockData')
            lead = MOCK_LEADS.find(l => l.id === params.id)
        } else {
            const leads = await getAllLeads()
            lead = leads.find(l => l.id === params.id)
        }

        if (!lead) {
            return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
        }

        return NextResponse.json({ data: lead })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch lead' }, { status: 500 })
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true, demo: true })
        }

        const body = await req.json()
        await updateLead(params.id, body)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true, demo: true })
        }

        await deleteLead(params.id)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
    }
}
