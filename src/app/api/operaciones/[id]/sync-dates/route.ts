import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/operaciones/[id]/sync-dates
 * Updates fechaEmbarque (ETD) and arrivalDate (ETA) in Master Input from real tracking data.
 * Called automatically by ContainerTrackingWidget when it gets fresh (non-cached) tracking info.
 */
export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params
        const body = await request.json()
        const { etd, eta } = body

        if (!id || (!etd && !eta)) {
            return NextResponse.json({ success: false, error: 'Missing id or dates' }, { status: 400 })
        }

        const { updateOperation } = await import('@/lib/googleSheets')

        const updatePayload: Partial<Record<string, string>> = {}
        if (etd) updatePayload.fechaEmbarque = etd
        if (eta) updatePayload.arrivalDate = eta

        await updateOperation(id, updatePayload)

        return NextResponse.json({ success: true, updated: updatePayload })

    } catch (error) {
        console.error('[sync-dates] Error:', error)
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
    }
}
