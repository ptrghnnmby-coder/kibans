
import { NextResponse } from 'next/server'
import { getCashFlowByOperation, addCashFlowTransaction, deleteCashFlowTransaction, updateCashFlowTransaction, getOperationById } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

async function validateOwnership(operationId: string) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) return { error: 'Unauthorized', status: 401 }

    // El usuario solicitó que cualquier usuario pueda cargar movimientos en operaciones por igual.
    // Solo validamos que el usuario esté autenticado.
    return { success: true, userEmail: session.user.email }
}

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const isDemo = (session?.user as any)?.isDemo
        if (isDemo) {
            const { MOCK_CASHFLOW } = await import('@/lib/mockData')
            const transactions = MOCK_CASHFLOW.filter(tx => tx.operationId === params.id)
            return NextResponse.json({ success: true, data: transactions })
        }

        const { searchParams } = new URL(request.url)
        const forceSync = searchParams.get('forceSync') === 'true'

        let transactions = await getCashFlowByOperation(params.id)

        // Si se pide forceSync o no hay movimientos, intentar sincronizar
        if (forceSync || transactions.length === 0) {
            try {
                console.log(`[API/CashFlow] No transactions found for ${params.id}, attempting sync...`);
                const { syncOperationCashFlow } = await import('@/lib/googleSheets')
                await syncOperationCashFlow(params.id)
                transactions = await getCashFlowByOperation(params.id)
            } catch (syncError) {
                console.error('Error in automatic sync:', syncError)
            }
        }

        console.log(`[API/CashFlow] Returning ${transactions.length} transactions for ${params.id}`);
        return NextResponse.json({ success: true, data: transactions })
    } catch (error) {
        console.error('Error fetching cash flow:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch cash flow' },
            { status: 500 }
        )
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const auth = await validateOwnership(params.id)
        if (auth.error) return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })

        const body = await request.json()

        // Validate payload
        if (!body.date || !body.type || !body.amount) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            )
        }

        const transaction = await addCashFlowTransaction({
            operationId: params.id,
            date: body.date,
            type: body.type,
            category: body.category || 'General',
            description: body.description || '',
            amount: body.amount,
            status: body.status || 'PENDIENTE'
        })

        return NextResponse.json({ success: true, data: transaction })
    } catch (error) {
        console.error('Error adding cash flow transaction:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to add transaction' },
            { status: 500 }
        )
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        console.log(`[CASHFLOW_API] DELETE request for opId: ${params.id}`)
        const auth = await validateOwnership(params.id)
        if (auth.error) {
            console.error(`[CASHFLOW_API] Auth error for opId ${params.id}: ${auth.error}`)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }

        const { searchParams } = new URL(request.url)
        const txId = searchParams.get('txId')

        if (!txId) {
            console.error(`[CASHFLOW_API] Missing txId for opId ${params.id}`)
            return NextResponse.json(
                { success: false, error: 'Transaction ID required' },
                { status: 400 }
            )
        }

        console.log(`[CASHFLOW_API] Deleting transaction ${txId} for opId ${params.id}`)
        await deleteCashFlowTransaction(txId)
        console.log(`[CASHFLOW_API] Successfully deleted transaction ${txId}`)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error(`[CASHFLOW_API] Error deleting transaction:`, error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete transaction' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        console.log(`[CASHFLOW_API] PUT request for opId: ${params.id}`)
        const auth = await validateOwnership(params.id)
        if (auth.error) {
            console.error(`[CASHFLOW_API] Auth error: ${auth.error}`)
            return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
        }

        const body = await request.json()
        console.log(`[CASHFLOW_API] PUT payload:`, body)

        if (!body.txId) {
            return NextResponse.json(
                { success: false, error: 'Transaction ID required' },
                { status: 400 }
            )
        }

        const { txId, ...updates } = body
        await updateCashFlowTransaction(txId, updates)
        console.log(`[CASHFLOW_API] Transaction ${txId} updated successfully`)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating cash flow transaction:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to update transaction' },
            { status: 500 }
        )
    }
}
