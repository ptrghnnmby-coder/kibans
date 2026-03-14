import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getAllCashFlowTransactions, TABS } from '../src/lib/googleSheets'

async function inspectCashFlow() {
    try {
        console.log(`Inspecting Tab: ${TABS.cashFlow}`)
        const txs = await getAllCashFlowTransactions()

        if (txs.length === 0) {
            console.log('No transactions found in CashFlow.')
            return
        }

        console.log(`Found ${txs.length} transactions.`)
        console.log('First 3 transactions:')
        console.log(JSON.stringify(txs.slice(0, 3), null, 2))

        // Find transactions for 079-26 (from user screenshot)
        const specific = txs.filter(t => t.operationId === '079-26')
        console.log(`\nTransactions for op 079-26: ${specific.length}`)
        if (specific.length > 0) {
            console.log(JSON.stringify(specific, null, 2))
        }
    } catch (err) {
        console.error('Error inspecting CashFlow:', err)
    }
}

inspectCashFlow()
