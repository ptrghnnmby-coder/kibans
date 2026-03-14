import { NextResponse } from 'next/server'
import { getTrackingInfo, detectCarrier, getCarrierTrackingURL, clearTrackingCache } from '@/lib/containerTracking'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { upsertTrackingCache, getTrackingCache, searchMasterInput } from '@/lib/googleSheets'

export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * GET /api/tracking/[identifier]
 * 1. Checks Tracking_Cache in Sheets (if < 24h, returns cached)
 * 2. If stale or missing, calls findTEU, saves to Sheets cache, returns fresh data
 */
export async function GET(
    request: Request,
    { params }: { params: { identifier: string } }
) {
    try {
        const { identifier } = params
        if (!identifier) {
            return NextResponse.json(
                { success: false, error: 'Container number required' },
                { status: 400 }
            )
        }

        const upper = identifier.toUpperCase()
        const carrier = detectCarrier(upper)

        // 1. Look for opId in query string (passed from OperationDetailView)
        const url = new URL(request.url)
        const opId = url.searchParams.get('opId') || ''

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({
                success: true,
                fromCache: true,
                data: {
                    containerNumber: identifier,
                    carrier,
                    status: 'IN_TRANSIT',
                    currentLocation: 'AT SEA',
                    eta: '2025-04-10T14:00:00Z',
                    etd: '2025-03-01T10:00:00Z',
                    portOfLoading: 'BUENOS AIRES',
                    portOfDischarge: 'ROTTERDAM',
                    vessel: 'MSC LUCIANA',
                    voyage: '921N',
                    events: [
                        { status: 'DEPARTED', date: '2025-03-01T10:00:00Z', location: 'BUENOS AIRES', description: 'Vessel departed from Port of Loading' },
                        { status: 'LOADED', date: '2025-02-28T14:30:00Z', location: 'BUENOS AIRES', description: 'Container loaded on vessel' },
                        { status: 'GATE_IN', date: '2025-02-26T09:15:00Z', location: 'BUENOS AIRES', description: 'Container received at terminal' }
                    ],
                    lastUpdated: new Date().toISOString(),
                },
                manualTrackingURL: getCarrierTrackingURL(upper, carrier)
            })
        }

        // 2. Check Sheets cache
        try {
            const allCache = await getTrackingCache()
            const cached = allCache.find(r =>
                r.container.toUpperCase() === upper || (opId && r.opId === opId)
            )

            if (cached && cached.updatedAt) {
                const age = Date.now() - new Date(cached.updatedAt).getTime()
                if (age < CACHE_TTL_MS) {
                    // Cache is fresh — return it as TrackingData shape
                    return NextResponse.json({
                        success: true,
                        fromCache: true,
                        cachedAt: cached.updatedAt,
                        data: {
                            containerNumber: cached.container,
                            carrier,
                            status: cached.status || 'UNKNOWN',
                            currentLocation: cached.location,
                            eta: cached.eta || undefined,
                            etd: cached.etd || undefined,
                            portOfLoading: '',
                            portOfDischarge: '',
                            vessel: cached.vessel || undefined,
                            voyage: cached.voyage || undefined,
                            events: [],
                            lastUpdated: cached.updatedAt,
                        },
                        manualTrackingURL: getCarrierTrackingURL(upper, carrier)
                    })
                }
            }
        } catch (cacheErr) {
            console.warn('[Tracking] Sheets cache read failed, proceeding to API:', cacheErr)
        }

        let expectedPol, expectedPod;
        if (opId && !isDemo) {
            try {
                const ops = await searchMasterInput(opId);
                const op = ops.find(o => o.id === opId);
                if (op) {
                    expectedPol = op.portLoad;
                    expectedPod = op.puertoDestino;
                }
            } catch (e) {
                console.error("Failed fetching operation for tracking context", e);
            }
        }
        
        // 3. Cache miss or stale — call findTEU
        const trackingData = await getTrackingInfo(upper, expectedPol, expectedPod)

        if (!trackingData) {
            const isContainer = /^[A-Z]{4}[0-9]{7}$/.test(upper)
            const errorMessage = isContainer 
                ? 'No se encontraron datos ingresados para este contenedor en la naviera.' 
                : 'El rastreo automático por número de Booking no está soportado por la naviera en nuestra plataforma. Utilice el enlace manual o ingrese el número de Contenedor.'

            return NextResponse.json({
                success: false,
                error: errorMessage,
                carrier,
                manualTrackingURL: getCarrierTrackingURL(upper, carrier)
            }, { status: 404 })
        }

        // 4. Save to Sheets cache (fire and forget — don't block response)
        if (opId || trackingData.containerNumber) {
            upsertTrackingCache(
                opId || trackingData.containerNumber,
                trackingData.containerNumber,
                {
                    status: trackingData.status,
                    location: trackingData.currentLocation,
                    etd: trackingData.etd,
                    eta: trackingData.eta,
                    vessel: trackingData.vessel,
                    voyage: trackingData.voyage,
                }
            ).catch(e => console.error('[Tracking] Failed to save to Sheets cache:', e))
        }

        return NextResponse.json({
            success: true,
            fromCache: false,
            data: trackingData,
            manualTrackingURL: getCarrierTrackingURL(upper, carrier)
        })

    } catch (error) {
        console.error('Error in tracking API:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/tracking/[identifier]
 * Force refresh — bypasses Sheets cache, calls findTEU, updates cache
 */
export async function POST(
    request: Request,
    { params }: { params: { identifier: string } }
) {
    try {
        const { identifier } = params
        const upper = identifier.toUpperCase()
        const carrier = detectCarrier(upper)

        const url = new URL(request.url)
        const opId = url.searchParams.get('opId') || ''

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({
                success: true,
                fromCache: false,
                data: {
                    containerNumber: identifier,
                    carrier,
                    status: 'IN_TRANSIT',
                    currentLocation: 'AT SEA',
                    eta: '2025-04-10T14:00:00Z',
                    etd: '2025-03-01T10:00:00Z',
                    portOfLoading: 'BUENOS AIRES',
                    portOfDischarge: 'ROTTERDAM',
                    vessel: 'MSC LUCIANA',
                    voyage: '921N',
                    events: [
                        { status: 'DEPARTED', date: '2025-03-01T10:00:00Z', location: 'BUENOS AIRES', description: 'Vessel departed from Port of Loading' },
                        { status: 'LOADED', date: '2025-02-28T14:30:00Z', location: 'BUENOS AIRES', description: 'Container loaded on vessel' },
                        { status: 'GATE_IN', date: '2025-02-26T09:15:00Z', location: 'BUENOS AIRES', description: 'Container received at terminal' },
                        { status: 'EMPTY_DISPATCHED', date: '2025-02-20T11:00:00Z', location: 'BUENOS AIRES', description: 'Empty container dispatched to shipper' }
                    ],
                    lastUpdated: new Date().toISOString(),
                },
                manualTrackingURL: getCarrierTrackingURL(upper, carrier)
            })
        }

        // Clear in-memory cache
        clearTrackingCache(upper)

        let expectedPol, expectedPod;
        if (opId && !isDemo) {
            try {
                const ops = await searchMasterInput(opId);
                const op = ops.find(o => o.id === opId);
                if (op) {
                    expectedPol = op.portLoad;
                    expectedPod = op.puertoDestino;
                }
            } catch (e) {
                console.error("Failed fetching operation for tracking context", e);
            }
        }
        
        // Force fresh data from findTEU
        const trackingData = await getTrackingInfo(upper, expectedPol, expectedPod)

        if (!trackingData) {
            const isContainer = /^[A-Z]{4}[0-9]{7}$/.test(upper)
            const errorMessage = isContainer 
                ? 'No se encontraron datos ingresados para este contenedor en la naviera.' 
                : 'El rastreo automático por número de Booking no está soportado por la naviera en nuestra plataforma. Utilice el enlace manual o ingrese el número de Contenedor.'

            return NextResponse.json({
                success: false,
                error: errorMessage,
                carrier,
                manualTrackingURL: getCarrierTrackingURL(upper, carrier)
            }, { status: 404 })
        }

        // Update Sheets cache
        await upsertTrackingCache(
            opId || trackingData.containerNumber,
            trackingData.containerNumber,
            {
                status: trackingData.status,
                location: trackingData.currentLocation,
                etd: trackingData.etd,
                eta: trackingData.eta,
                vessel: trackingData.vessel,
                voyage: trackingData.voyage,
            }
        )

        return NextResponse.json({
            success: true,
            fromCache: false,
            data: trackingData,
            manualTrackingURL: getCarrierTrackingURL(upper, carrier)
        })

    } catch (error) {
        console.error('Error refreshing tracking:', error)
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        )
    }
}
