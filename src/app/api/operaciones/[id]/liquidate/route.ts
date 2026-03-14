import { getCashFlowByOperation, liquidateOperation, deleteTrackingCache } from '@/lib/googleSheets';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const ADMIN_EMAILS = ['hm@southmarinetrading.com', 'admin@southmarinetrading.com']

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const userEmail = session.user.email
        const isAdmin = ADMIN_EMAILS.includes(userEmail.toLowerCase())

        const { id } = params

        // Admin users bypass validation — they can always liquidate
        if (!isAdmin) {
            // Fetch the operation's cash flow transactions
            const transactions = await getCashFlowByOperation(id)

            const blockingReasons: string[] = []

            // Check for pending payments
            const pendingTxs = transactions.filter(tx => tx.status === 'PENDIENTE')
            if (pendingTxs.length > 0) {
                blockingReasons.push(
                    pendingTxs.length === 1
                        ? 'Hay 1 pago pendiente en el flujo de caja'
                        : `Hay ${pendingTxs.length} pagos pendientes en el flujo de caja`
                )
            }

            if (blockingReasons.length > 0) {
                return NextResponse.json({
                    success: false,
                    blocked: true,
                    reasons: blockingReasons,
                    error: blockingReasons.join(' · ')
                }, { status: 422 })
            }
        }

        const result = await liquidateOperation(id)

        if (result.success) {
            deleteTrackingCache(id).catch(e =>
                console.warn('[Liquidate] Failed to delete tracking cache for', id, e)
            )
        }

        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Error in /api/operaciones/[id]/liquidate:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Fallo al liquidar la operación' },
            { status: 500 }
        )
    }
}
