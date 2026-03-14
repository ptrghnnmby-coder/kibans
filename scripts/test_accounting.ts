import { generateAccountingTransactions } from '../src/lib/googleSheets'
import { Operacion } from '../src/lib/sheets-types'

async function test() {
    const dummyOp: Operacion = {
        id: '999-26',
        estado: '1. Operación Creada',
        cliente: 'Test Client',
        exportador: 'Exporter Inc',
        productor: 'Producer S.A.',
        incoterm: 'FOB',
        paymentTerms: '30% Advance | 70% Cash against documents',
        fechaEmbarque: '2026-03-01', // ETD
        arrivalDate: '2026-03-20',   // ETA
        productos: 'Product A:10:100\nProduct B:5:200',
        purchasePricesRaw: 'Product A:10:80\nProduct B:5:150',
        freightValue: '1500',
        portLoad: 'Buenos Aires',
        puertoDestino: 'Norfolk',
        userId: 'test@example.com'
    }

    console.log('Testing Accounting Generation for FOB 30/70...')
    const txs = await generateAccountingTransactions(dummyOp)
    console.log(JSON.stringify(txs, null, 2))

    // Assertions
    const cobros = txs.filter(t => t.category === 'Cobro')
    if (cobros.length !== 2) console.error('FAILED: Expected 2 cobros')
    if (cobros[0].amount !== 600) console.error(`FAILED: Expected advance 600, got ${cobros[0].amount}`) // (1000 + 1000) * 0.3 = 600
    if (cobros[1].amount !== 1400) console.error(`FAILED: Expected balance 1400, got ${cobros[1].amount}`)

    const flete = txs.find(t => t.category === 'Flete')
    if (!flete) console.error('FAILED: Expected Flete')
    if (flete?.dueDate !== '2026-03-11') console.error(`FAILED: Expected Flete dueDate 2026-03-11, got ${flete?.dueDate}`)

    console.log('Test logic complete.')
}

test()
