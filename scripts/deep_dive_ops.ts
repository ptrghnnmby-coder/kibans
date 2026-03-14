import * as dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

import { getOperationById } from '../src/lib/googleSheets'
import { parseProducts } from '../src/lib/validation'

async function deepDive() {
    const ids = ['077-26', '080-26']
    try {
        for (const id of ids) {
            const op = await getOperationById(id)
            if (!op) continue

            const sales = parseProducts(op.productos)
            const totalSales = sales.reduce((sum, i) => sum + (i.qty * i.price), 0)
            const fleteVal = parseFloat(op.freightValue || '0')

            console.log(`--- Op ${id} ---`)
            console.log(`Raw Products: [${op.productos}]`)
            console.log(`Parsed Products:`, JSON.stringify(sales))
            console.log(`Total Sales: $${totalSales}`)
            console.log(`Freight Value: ${op.freightValue} -> parsed: ${fleteVal}`)
            console.log(`Dates: ETD=[${op.fechaEmbarque}], ETA=[${op.arrivalDate}]`)
            console.log(`Payment Terms: [${op.paymentTerms}]`)
        }
    } catch (err) {
        console.error('Error deep diving:', err)
    }
}

deepDive()
