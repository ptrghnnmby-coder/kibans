import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getOperationById } from '../src/lib/googleSheets'

async function checkOp() {
    const opId = '077-26'
    try {
        const op = await getOperationById(opId)
        console.log(`Operation ${opId}:`, JSON.stringify(op, null, 2))
    } catch (err) {
        console.error('Error checking op:', err)
    }
}

checkOp()
