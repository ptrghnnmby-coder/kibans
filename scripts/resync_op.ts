import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { syncOperationCashFlow } from '../src/lib/googleSheets'

async function resync() {
    const opId = '077-26'
    try {
        console.log(`Syncing op ${opId}...`)
        await syncOperationCashFlow(opId)
        console.log('Sync complete.')
    } catch (err) {
        console.error('Error syncing:', err)
    }
}

resync()
