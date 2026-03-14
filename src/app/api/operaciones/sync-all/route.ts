import { NextResponse } from 'next/server'
import { getAllOperations, syncOperationCashFlow } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'

export async function POST(req: Request) {
    try {
        const session = await getServerSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 1. Get all operations
        const allOps = await getAllOperations()
        console.log(`[SYNC-ALL] Found ${allOps.length} operations to process.`)

        const results = {
            total: allOps.length,
            success: 0,
            error: 0,
            details: [] as string[]
        }

        // 2. Process one by one
        // Using a sequential loop to avoid overwhelming the Google Sheets API
        for (const op of allOps) {
            if (!op.id) continue

            try {
                await syncOperationCashFlow(op.id)
                results.success++
            } catch (err: any) {
                console.error(`[SYNC-ALL] Error syncing op ${op.id}:`, err)
                results.error++
                results.details.push(`${op.id}: ${err.message || String(err)}`)
            }
        }

        return NextResponse.json({
            success: true,
            summary: results
        })

    } catch (error) {
        console.error('Error in sync-all route:', error)
        return NextResponse.json(
            { error: 'Error al ejecutar la sincronización masiva' },
            { status: 500 }
        )
    }
}
