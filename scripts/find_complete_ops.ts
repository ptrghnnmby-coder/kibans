import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { searchMasterInput } from '../src/lib/googleSheets'

async function findCompleteOps() {
    try {
        const ops = await searchMasterInput('')
        const withPrice = ops.filter(op => {
            const prods = op.productos || ''
            return prods.split('\n').some(line => line.split(':').length >= 3)
        })

        console.log(`Found ${withPrice.length} operations with priced products.`)
        withPrice.slice(0, 5).forEach(op => {
            console.log(`- ${op.id}: [${op.productos}] Flete: [${op.freightValue}]`)
        })
    } catch (err) {
        console.error('Error finding ops:', err)
    }
}

findCompleteOps()
