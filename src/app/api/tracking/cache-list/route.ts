import { NextResponse } from 'next/server'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const dynamic = 'force-dynamic'

/**
 * GET /api/tracking/cache-list
 * Returns ALL operations that have a BOOKING number (as that's our primary tracking anchor).
 * Uses Tracking_Cache for real status data when available.
 * Falls back to an UNKNOWN stub so they still appear in the tracking dashboard.
 *
 * Key fix: We key everything by opId (not container number) so that when a container
 * is reused on a different voyage, we never bleed stale data into the wrong operation.
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
            const merged = MOCK_OPERACIONES.filter(op => op.containerNumber).map(op => ({
                opId: op.id!,
                userId: '',
                cliente: op.cliente || '',
                puertoDestino: op.puertoDestino || '',
                booking: (op as any).booking || `BKG-${op.id}`,
                container: op.containerNumber?.trim().toUpperCase() || '',
                etd: (op as any).fechaEmbarque || op.etd || '2025-03-01',
                eta: (op as any).arrivalDate || op.eta || '2025-04-10',
                status: 'IN_TRANSIT',
                location: 'En altamar',
                vessel: 'MSC SINFONIA',
                voyage: '921N',
                updatedAt: new Date().toISOString()
            }))
            return NextResponse.json({ success: true, data: merged })
        }

        const { getTrackingCache, getAllOperations } = await import('@/lib/googleSheets')

        const [cached, allOps] = await Promise.all([
            getTrackingCache(),
            getAllOperations(),
        ])

        // Build lookup map by opId from the Sheets cache
        const cacheMap = new Map(cached.map(r => [r.opId, r]))

        // All active (non-archived) ops that have a booking/BL number
        const trackableOps = allOps.filter(
            op => !op.isArchived && (op.booking && op.booking.trim() !== '')
        )

        // Merge: use cached tracking data if available, else create enriched stub
        const merged = trackableOps.map(op => {
            const cachedRow = cacheMap.get(op.id!)
            const baseFields = {
                opId: op.id!,
                userId: (op as any).userId || '',
                cliente: op.cliente || '',
                puertoDestino: op.puertoDestino || '',
                booking: (op as any).booking || '',
                container: op.containerNumber?.trim().toUpperCase() || '',
                // ETD/ETA from operation data as fallback, overridden by live tracking if available
                etd: (op as any).fechaEmbarque || op.etd || '',
                eta: (op as any).arrivalDate || op.eta || '',
            }

            if (cachedRow) {
                return {
                    ...baseFields,
                    status: cachedRow.status || 'UNKNOWN',
                    location: cachedRow.location || '',
                    vessel: cachedRow.vessel || '',
                    voyage: cachedRow.voyage || '',
                    // Prefer live tracking ETD/ETA when available
                    etd: cachedRow.etd || baseFields.etd,
                    eta: cachedRow.eta || baseFields.eta,
                    updatedAt: cachedRow.updatedAt || '',
                }
            }

            return {
                ...baseFields,
                status: 'UNKNOWN',
                location: '',
                vessel: '',
                voyage: '',
                updatedAt: '',
            }
        })

        return NextResponse.json({ success: true, data: merged })
    } catch (error: any) {
        console.error('[cache-list] Error:', error)
        return NextResponse.json({ success: false, error: error.message, data: [] }, { status: 500 })
    }
}
