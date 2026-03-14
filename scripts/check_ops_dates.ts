import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getOperationById } from '../src/lib/googleSheets'

async function checkOps() {
    const ids = ['078-26', '079-26', '080-26', '081-26']
    try {
        for (const id of ids) {
            const op = await getOperationById(id)
            console.log(`Op ${id}: ETD=[${op?.fechaEmbarque}], ETA=[${op?.arrivalDate}], Terms=[${op?.paymentTerms}]`)
        }
    } catch (err) {
        console.error('Error checking ops:', err)
    }
}

checkOps()
