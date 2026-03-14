import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/tracking/refresh-all
 * Called by Cloud Scheduler every morning at 8am (America/Argentina/Buenos_Aires).
 * Fetches tracking for all active operations that have a container number
 * and updates the Tracking_Cache sheet.
 *
 * Auth: protected by CRON_SECRET header to prevent public abuse.
 */
export async function POST(request: Request) {
    try {
        // Verify cron secret (set as env var CRON_SECRET)
        const authHeader = request.headers.get('X-Cron-Secret')
        const cronSecret = process.env.CRON_SECRET
        if (cronSecret && authHeader !== cronSecret) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const { getAllOperations, upsertTrackingCache, updateOperation } = await import('@/lib/googleSheets')
        const { getTrackingInfo } = await import('@/lib/containerTracking')

        // Get all active operations
        const allOps = await getAllOperations()
        const withContainers = allOps.filter(op => op.containerNumber && op.containerNumber.trim() !== '')

        console.log(`[refresh-all] Refreshing tracking for ${withContainers.length} operations`)

        const results: { opId: string; container: string; success: boolean; datesUpdated?: boolean; error?: string }[] = []

        // Process sequentially to avoid rate limits on findTEU
        for (const op of withContainers) {
            const container = op.containerNumber!.trim().toUpperCase()
            try {
                const trackingData = await getTrackingInfo(container)
                if (trackingData) {
                    // 1. Update Tracking_Cache sheet
                    await upsertTrackingCache(op.id!, container, {
                        status: trackingData.status,
                        location: trackingData.currentLocation,
                        etd: trackingData.etd,
                        eta: trackingData.eta,
                        vessel: trackingData.vessel,
                        voyage: trackingData.voyage,
                    })

                    // 2. Sync ETD/ETA to Master Input (fechaEmbarque / arrivalDate)
                    let datesUpdated = false
                    if (trackingData.etd || trackingData.eta) {
                        const datePayload: Partial<Record<string, string>> = {}
                        if (trackingData.etd) datePayload.fechaEmbarque = trackingData.etd
                        if (trackingData.eta) datePayload.arrivalDate = trackingData.eta
                        try {
                            await updateOperation(op.id!, datePayload)
                            datesUpdated = true
                            console.log(`[refresh-all] Synced ETD/ETA for ${op.id}`)
                        } catch (dateErr: any) {
                            console.warn(`[refresh-all] ETD/ETA sync failed for ${op.id}:`, dateErr.message)
                        }
                    }

                    results.push({ opId: op.id!, container, success: true, datesUpdated })
                } else {
                    results.push({ opId: op.id!, container, success: false, error: 'No data returned' })
                }
            } catch (err: any) {
                console.error(`[refresh-all] Failed for ${op.id}:`, err.message)
                results.push({ opId: op.id!, container, success: false, error: err.message })
            }

            // Small delay between API calls to be nice to findTEU rate limits
            await new Promise(r => setTimeout(r, 1500))
        }


        const successCount = results.filter(r => r.success).length
        console.log(`[refresh-all] Done: ${successCount}/${withContainers.length} updated`)

        return NextResponse.json({
            success: true,
            processed: withContainers.length,
            updated: successCount,
            failed: withContainers.length - successCount,
            results,
            timestamp: new Date().toISOString(),
        })

    } catch (error: any) {
        console.error('[refresh-all] Fatal error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

// Also allow GET for manual testing from browser
export async function GET(request: Request) {
    return POST(request)
}
