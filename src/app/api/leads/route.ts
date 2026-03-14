import { NextResponse } from 'next/server'
import { getAllLeads, createLead, updateLead } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ADMIN_EMAILS = ['hm@southmarinetrading.com', 'admin@southmarinetrading.com', 'demo@southmarinetrading.com']

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const userEmail = session?.user?.email?.toLowerCase() || null
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_LEADS } = await import('@/lib/mockData')
            return NextResponse.json({ data: MOCK_LEADS })
        }

        const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false

        const allLeads = await getAllLeads()

        // Admins see all leads; regular users only see their own
        const leads = isAdmin
            ? allLeads
            : allLeads.filter(l => l.responsable?.toLowerCase() === userEmail)

        return NextResponse.json({ data: leads })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const userEmail = session?.user?.email || null
        const isDemo = (session?.user as any)?.isDemo

        const body = await req.json()

        if (isDemo) {
            return NextResponse.json({ ...body, id: `L-DEMO-${Date.now()}`, estado: body.estado || 'Nuevo', fechaCreacion: new Date().toISOString() })
        }

        // Auto-inject the creator's email as responsable if not already set
        if (!body.responsable && userEmail) {
            body.responsable = userEmail
        }

        const newLead = await createLead(body)
        return NextResponse.json(newLead)
    } catch (error) {
        console.error('API Error in leads POST:', error)
        return NextResponse.json({ error: 'Failed to create lead', details: error instanceof Error ? error.message : String(error) }, { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        const body = await req.json()

        if (isDemo) {
            return NextResponse.json({ success: true })
        }

        const { id, ...updates } = body
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

        await updateLead(id, updates)
        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
}

