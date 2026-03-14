import { NextResponse } from 'next/server'
import { getProspectos, createContacto } from '@/lib/googleSheets'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_LEADS } = await import('@/lib/mockData')
            return NextResponse.json({ success: true, data: MOCK_LEADS })
        }

        const prospects = await getProspectos()
        return NextResponse.json({ success: true, data: prospects })
    } catch (error) {
        console.error('Error in GET /api/dashboard/prospects:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch prospects' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo
        const body = await req.json()

        if (isDemo) {
            if (Array.isArray(body.items)) {
                return NextResponse.json({ success: true, data: body.items })
            }
            return NextResponse.json({ success: true, data: body })
        }

        // Multi-create support for "Keep Paste"
        if (Array.isArray(body.items)) {
            const results = []
            for (const item of body.items) {
                const prospect = await createContacto({
                    ...item,
                    isProspecto: true
                })
                results.push(prospect)
            }
            return NextResponse.json({ success: true, data: results })
        }

        const prospect = await createContacto({
            ...body,
            isProspecto: true
        })

        return NextResponse.json({ success: true, data: prospect })
    } catch (error) {
        console.error('Error in POST /api/dashboard/prospects:', error)
        return NextResponse.json({ success: false, error: 'Failed to save prospect' }, { status: 500 })
    }
}
