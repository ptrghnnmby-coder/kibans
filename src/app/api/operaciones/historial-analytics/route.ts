import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getHistoricalOperations, getAllCashFlowTransactions, getAllCashFlowHistoricalTransactions } from '@/lib/googleSheets'
import { CashFlowTransaction, Operacion } from '@/lib/sheets-types'

function parseAmount(v?: string | number | null): number {
    if (!v) return 0
    const s = String(v).replace(/[^0-9.,\-]/g, '').replace(',', '.')
    return parseFloat(s) || 0
}

function parseProductEntries(raw: string | undefined): { id: string, qty: number, price: number }[] {
    if (!raw) return []
    return raw.split('|').map(entry => {
        const parts = entry.split(':')
        const id = parts[0] || ''
        const qty = parseFloat(parts[1]) || 0
        const price = parseFloat(parts[2]) || 0
        return { id, qty, price }
    }).filter(p => p.id !== '')
}

export interface EnrichedOp extends Operacion {
    ingreso: number
    costo: number
    ganancia: number
    margen: number       // 0–100
}

export async function GET() {
    try {
        const [ops, activeTxs, historialTxs] = await Promise.all([
            getHistoricalOperations(),
            getAllCashFlowTransactions(),
            getAllCashFlowHistoricalTransactions().catch(() => [] as CashFlowTransaction[])
        ])

        // Merge both sources so liquidated ops show their real CashFlow data
        const allTxs = [...activeTxs, ...historialTxs]

        // Group transactions by operationId
        const txsByOp: Record<string, CashFlowTransaction[]> = {}
        for (const tx of allTxs) {
            const key = tx.operationId?.trim() || ''
            if (!key) continue
            if (!txsByOp[key]) txsByOp[key] = []
            txsByOp[key].push(tx)
        }

        const enriched: EnrichedOp[] = ops.map(op => {
            const opId = op.id?.trim() || ''

            // Try exact match, then loose match
            let txs = txsByOp[opId] || []
            if (txs.length === 0) {
                // Try loose: any key that starts with opId or vice versa
                const key = Object.keys(txsByOp).find(k =>
                    k.toLowerCase().includes(opId.toLowerCase()) ||
                    opId.toLowerCase().includes(k.toLowerCase())
                )
                if (key) txs = txsByOp[key]
            }

            let ingreso = 0
            let costo = 0

            if (txs.length > 0) {
                for (const tx of txs) {
                    if (tx.type === 'INGRESO') ingreso += tx.amount
                    else if (tx.type === 'EGRESO') costo += tx.amount
                }
            } else {
                // Fallback to operation fields
                ingreso = parseAmount(op.totalFOB) || parseAmount(op.fobGranTotal) || 0
                const purchase = parseAmount(op.totalPurchase) || 0
                const freight = parseAmount(op.freightValue) || 0
                costo = purchase + freight
                
                // Si aún así no hay ingreso ni costo, derivamos directo de los productos anotados
                if (ingreso === 0 && costo === 0) {
                    const salesProds = parseProductEntries(op.productos)
                    const purchProds = parseProductEntries(op.purchasePricesRaw)
                    
                    ingreso = salesProds.reduce((sum, p) => sum + (p.qty * p.price), 0)
                    costo = purchProds.reduce((sum, p) => sum + (p.qty * p.price), 0) + freight
                }
            }

            const ganancia = ingreso - costo
            const margen = ingreso > 0 ? (ganancia / ingreso) * 100 : 0

            return { ...op, ingreso, costo, ganancia, margen }
        })

        return NextResponse.json({ success: true, data: enriched })
    } catch (error: any) {
        console.error('[historial-analytics]', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
