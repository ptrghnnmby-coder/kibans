import { NextRequest, NextResponse } from 'next/server'
import { addCashFlowTransaction, updateOperation } from '@/lib/googleSheets'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { operationId, amount, date, type } = body

        if (!operationId || !amount || !date) {
            return NextResponse.json({
                success: false,
                error: 'Faltan datos requeridos'
            }, { status: 400 })
        }

        const txType = (type === 'INFORMATIVO') ? 'INFORMATIVO' : 'EGRESO'

        // Create freight transaction in CashFlow tab
        const freightTx = await addCashFlowTransaction({
            operationId,
            date,
            type: txType,
            category: 'Flete',
            description: `Flete operación ${operationId}`,
            amount: parseFloat(amount),
            status: 'PENDIENTE',
            dueDate: date
        })

        // Update operation with freightTxId in Master Input
        await updateOperation(operationId, { freightTxId: freightTx.id })

        return NextResponse.json({
            success: true,
            data: freightTx
        })
    } catch (error) {
        console.error('Error creating freight transaction:', error)
        return NextResponse.json({
            success: false,
            error: 'Error al crear la transacción de flete'
        }, { status: 500 })
    }
}
