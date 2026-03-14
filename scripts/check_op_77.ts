import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getAllCashFlowTransactions } from '../src/lib/googleSheets'

async function checkOp77() {
    const opId = '077-26'
    try {
        const txs = await getAllCashFlowTransactions()
        const specific = txs.filter(t => t.operationId === opId)
        console.log(`Transactions for op ${opId}: ${specific.length}`)
        if (specific.length > 0) {
            console.log(JSON.stringify(specific, null, 2))
        } else {
            console.log('No transactions found for this OP.')
        }
    } catch (err) {
        console.error('Error checking op 77:', err)
    }
}

checkOp77()
