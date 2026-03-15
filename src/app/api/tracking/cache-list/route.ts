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
            const MOCK_TRACKING = [
                { opId: '25-0001', cliente: 'GLOBAL FRUITS BV',    puertoDestino: 'ROTTERDAM',      booking: 'BK-MAERSK-001', container: 'MSKU1234567', etd: '2025-02-15', eta: '2025-03-10', status: 'ARRIVED',    location: 'Rotterdam, Netherlands', vessel: 'MAERSK STOCKHOLM', voyage: '513W', pol: 'Buenos Aires', pod: 'Rotterdam' },
                { opId: '25-0002', cliente: 'FRESH DIRECT LLC',    puertoDestino: 'PHILADELPHIA',   booking: 'BK-MSC-099',    container: 'MEDU9876543', etd: '2025-01-20', eta: '2025-02-12', status: 'ARRIVED',    location: 'Philadelphia, USA',      vessel: 'MSC VALENTINA',   voyage: '099E', pol: 'Buenos Aires', pod: 'Philadelphia' },
                { opId: '25-0005', cliente: 'HAMBURG FRUITS',      puertoDestino: 'HAMBURG',        booking: 'BK-HAPAG-005',  container: 'HLXU1122334', etd: '2025-03-20', eta: '2025-04-18', status: 'IN_TRANSIT', location: 'Atlántico Sur',          vessel: 'HAPAG EXPRESS',   voyage: '214N', pol: 'Buenos Aires', pod: 'Hamburg' },
                { opId: '25-0008', cliente: 'NY GROCERS',          puertoDestino: 'NEW YORK',       booking: 'BK-HAMBURG-008',container: 'SUDU5544332', etd: '2025-02-01', eta: '2025-02-25', status: 'ARRIVED',    location: 'New York, USA',          vessel: 'HAMBURG EXPRESS', voyage: '008W', pol: 'San Antonio', pod: 'New York' },
                { opId: '25-0010', cliente: 'TOKYO FRESH',         puertoDestino: 'YOKOHAMA',       booking: 'BK-ONE-010',    container: 'ONEU3322110', etd: '2025-03-01', eta: '2025-04-05', status: 'IN_TRANSIT', location: 'Océano Pacífico',        vessel: 'ONE OLYMPUS',     voyage: '010E', pol: 'Buenos Aires', pod: 'Yokohama' },
            ]
            return NextResponse.json({ success: true, data: MOCK_TRACKING.map(t => ({ ...t, userId: 'demo@southmarinetrading.com', updatedAt: new Date().toISOString() })) })
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
