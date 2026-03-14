import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * GET /api/tracking/cached?opId=XXX
 * Returns the cached tracking row for a specific operation from Tracking_Cache sheet.
 * Fast — no external API call. Used by ContainerTrackingWidget on initial load.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const opId = searchParams.get('opId')
        if (!opId) {
            return NextResponse.json({ success: false, error: 'opId required' }, { status: 400 })
        }

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({
                success: true, data: {
                    opId,
                    containerNumber: 'MSCU1234567',
                    carrier: 'MSC',
                    status: 'IN_TRANSIT',
                    location: 'En altamar',
                    vessel: 'MSC SINFONIA',
                    voyage: '921N',
                    etd: '2025-03-01',
                    eta: '2025-04-10',
                    updatedAt: new Date().toISOString()
                }
            })
        }

        const { getCachedTrackingByOp } = await import('@/lib/googleSheets')
        const cached = await getCachedTrackingByOp(opId)

        if (!cached) {
            return NextResponse.json({ success: false, error: 'No cached data' })
        }

        return NextResponse.json({ success: true, data: cached })
    } catch (error: any) {
        console.error('[tracking/cached] Error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
