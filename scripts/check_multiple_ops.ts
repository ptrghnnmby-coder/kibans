import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getAllCashFlowTransactions } from '../src/lib/googleSheets'

async function checkOps() {
    const ids = ['078-26', '079-26', '080-26', '081-26', '077-26']
    try {
        const txs = await getAllCashFlowTransactions()
        ids.forEach(id => {
            const specific = txs.filter(t => t.operationId === id)
            console.log(`Transactions for op ${id}: ${specific.length}`)
            if (specific.length > 0) {
                console.log(JSON.stringify(specific, null, 2))
            }
        })
    } catch (err) {
        console.error('Error checking ops:', err)
    }
}

checkOps()
