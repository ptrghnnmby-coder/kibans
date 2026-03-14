import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getAllOperations, syncOperationCashFlow } from '../src/lib/googleSheets'

async function runSync() {
    console.log('Starting Mass Sync of All Operations...')
    try {
        const allOps = await getAllOperations()
        console.log(`Found ${allOps.length} operations.`)

        let success = 0
        let error = 0

        for (const op of allOps) {
            if (!op.id) continue
            try {
                console.log(`Syncing op ${op.id}...`)
                await syncOperationCashFlow(op.id)
                success++
                // 1 second delay to avoid Google Sheets API rate limits
                await new Promise(r => setTimeout(r, 1000))
            } catch (err) {
                console.error(`Error syncing ${op.id}:`, err)
                error++
            }
        }

        console.log(`Mass Sync Complete. Success: ${success}, Errors: ${error}`)
    } catch (err) {
        console.error('Fatal error in mass sync:', err)
    }
}

runSync()
