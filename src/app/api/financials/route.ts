import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getAllOperations, getAllCashFlowTransactions, getGastosGenerales } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseProducts } from '@/lib/validation'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (session?.user?.email) {
            const email = session.user.email.toLowerCase();
            if (email === 'hm@southmarinetrading.com' || email === 'admin@southmarinetrading.com') {
                return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
            }
        }

        if (isDemo) {
            const { MOCK_OPERACIONES, MOCK_CASHFLOW } = await import('@/lib/mockData')

            const financialOps = MOCK_OPERACIONES.map(op => {
                const sales = parseProducts(op.productos).reduce((s, i) => s + (i.qty * i.price), 0);
                const purchases = parseProducts(op.purchasePricesRaw).reduce((s, i) => s + (i.qty * i.price), 0);
                const opTxs = MOCK_CASHFLOW.filter(tx => tx.operationId === op.id);
                const income = opTxs.filter(tx => tx.type === 'INGRESO' && tx.status === 'PAGADO').reduce((s, tx) => s + tx.amount, 0);
                const expense = opTxs.filter(tx => tx.type === 'EGRESO' && tx.status === 'PAGADO').reduce((s, tx) => s + tx.amount, 0);

                return {
                    id: op.id,
                    cliente: op.cliente,
                    exportador: op.exportador,
                    estado: op.estado,
                    fechaEmbarque: op.fechaEmbarque,
                    totalSales: sales,
                    totalPurchases: purchases,
                    totalIncome: income,
                    totalExpense: expense,
                    balance: income - expense,
                    margin: sales > 0 ? ((sales - purchases) / sales) * 100 : 0,
                    pendingToCollect: sales - income,
                    pendingToPay: purchases - expense,
                    freightPaid: opTxs.some(tx => (tx.category?.toLowerCase().includes('flete') || tx.description?.toLowerCase().includes('flete')) && tx.status === 'PAGADO'),
                    freightAmount: opTxs.find(tx => tx.category?.toLowerCase().includes('flete') || tx.description?.toLowerCase().includes('flete'))?.amount || 0,
                    freightTxId: opTxs.find(tx => tx.category?.toLowerCase().includes('flete') || tx.description?.toLowerCase().includes('flete'))?.id || null,
                    trading: op.trading || ''
                }
            });

            const agenda = MOCK_CASHFLOW.filter(tx => tx.status === 'PENDIENTE').map(tx => ({
                ...tx,
                cliente: MOCK_OPERACIONES.find(o => o.id === tx.operationId)?.cliente || 'Desconocido',
                operationEstado: MOCK_OPERACIONES.find(o => o.id === tx.operationId)?.estado || 'Desconocido'
            }));

            const movements = MOCK_CASHFLOW.map(tx => ({
                ...tx,
                cliente: MOCK_OPERACIONES.find(o => o.id === tx.operationId)?.cliente || 'Desconocido',
                operationEstado: MOCK_OPERACIONES.find(o => o.id === tx.operationId)?.estado || 'Desconocido'
            }));

            return NextResponse.json({
                success: true,
                data: {
                    operations: financialOps,
                    agenda,
                    movements,
                    totals: {
                        totalItemsInAgenda: agenda.length,
                        totalSales: financialOps.reduce((s, o) => s + o.totalSales, 0),
                        totalPurchases: financialOps.reduce((s, o) => s + o.totalPurchases, 0),
                        totalIncome: financialOps.reduce((s, o) => s + o.totalIncome, 0),
                        totalExpense: financialOps.reduce((s, o) => s + o.totalExpense, 0),
                        totalBalance: financialOps.reduce((s, o) => s + o.balance, 0),
                        totalPendingToCollect: financialOps.reduce((s, o) => s + o.pendingToCollect, 0),
                        totalPendingToPay: financialOps.reduce((s, o) => s + o.pendingToPay, 0)
                    }
                }
            })
        }

        // RESPONSIBLE FILTER LOGIC
        const { searchParams } = new URL(req.url)
        const responsibleEmail = searchParams.get('responsibleEmail')?.toLowerCase() || ''

        // 1. Fetch all operations, ALL cash flow transactions, and general expenses in parallel
        let [operations, allTransactions, gastosGenerales] = await Promise.all([
            getAllOperations(),
            getAllCashFlowTransactions(),
            getGastosGenerales()
        ])

        // Apply Responsible Filter if selected
        if (responsibleEmail && responsibleEmail !== 'todos') {
            const { USER_MAP } = await import('@/lib/sheets-types')
            const userInfo = USER_MAP[responsibleEmail]
            const searchTerms = [responsibleEmail]
            if (userInfo) {
                if (userInfo.name) searchTerms.push(userInfo.name.toLowerCase())
                if (userInfo.initial) searchTerms.push(userInfo.initial.toLowerCase())
            }

            // Filter operations first
            operations = operations.filter(op => {
                const opUserId = op.userId?.toLowerCase() || ''
                return searchTerms.some(term => opUserId.includes(term) || term.includes(opUserId))
            })

            // Then filter transactions that belong to these operations
            const opIds = new Set(operations.map(o => o.id))
            allTransactions = allTransactions.filter(tx => opIds.has(tx.operationId))

            // And filter Gastos Generales
            gastosGenerales = gastosGenerales.filter(g => {
                const respUserId = g.responsable?.toLowerCase() || ''
                return searchTerms.some(term => respUserId.includes(term) || term.includes(respUserId))
            })
        }

        const normalizeId = (id: string) => id.trim().toLowerCase().replace(/^0+/, '').replace(/-0+/, '-');

        // 2. Process each operation
        const financialData = operations.map((op) => {
            const opIdNorm = normalizeId(op.id || '');
            // Group transactions by operation
            const opTransactions = allTransactions.filter(tx => normalizeId(tx.operationId) === opIdNorm)
            const paidTransactions = opTransactions.filter(tx => tx.status === 'PAGADO')

            const salesData = parseProducts(op.productos);
            const purchaseData = parseProducts(op.purchasePricesRaw);

            const totalSales = salesData.reduce((sum, item) => sum + (item.qty * item.price), 0);
            const totalPurchases = purchaseData.reduce((sum, item) => sum + (item.qty * item.price), 0);

            const totalIncome = paidTransactions
                .filter(tx => tx.type === 'INGRESO')
                .reduce((sum, tx) => sum + tx.amount, 0)

            const totalExpense = paidTransactions
                .filter(tx => tx.type === 'EGRESO')
                .reduce((sum, tx) => sum + tx.amount, 0)

            const balance = totalIncome - totalExpense
            const margin = totalSales > 0 ? ((totalSales - totalPurchases) / totalSales) * 100 : 0

            const freightTx = opTransactions.find(tx =>
                tx.category?.toLowerCase().includes('flete') ||
                tx.description?.toLowerCase().includes('flete')
            )
            const freightPaid = freightTx ? freightTx.status === 'PAGADO' : false
            const freightAmount = freightTx?.amount || 0
            const freightTxId = freightTx?.id || null

            return {
                id: op.id,
                cliente: op.cliente,
                exportador: op.exportador,
                estado: op.estado,
                fechaEmbarque: op.fechaEmbarque,
                totalSales,
                totalPurchases,
                totalIncome,
                totalExpense,
                balance,
                margin,
                pendingToCollect: totalSales - totalIncome,
                pendingToPay: totalPurchases - totalExpense,
                freightPaid,
                freightAmount,
                freightTxId,
                trading: op.trading || ''
            }
        })

        // 3. Extract all movements for the list view
        const allMovements = allTransactions
            .map(tx => {
                const txIdNorm = normalizeId(tx.operationId);
                const op = operations.find(o => normalizeId(o.id || '') === txIdNorm)
                return {
                    ...tx,
                    cliente: op?.cliente || 'Desconocido',
                    operationEstado: op?.estado || 'Desconocido'
                }
            })
            .sort((a, b) => {
                const dateA = new Date(a.date || 0).getTime()
                const dateB = new Date(b.date || 0).getTime()
                return dateB - dateA
            })

        // 4. Extract pending actions for the Agenda (across all operations)
        const agenda = allTransactions
            .filter(tx => tx.status === 'PENDIENTE')
            .map(tx => {
                const txIdNorm = normalizeId(tx.operationId);
                const op = operations.find(o => normalizeId(o.id || '') === txIdNorm)
                return {
                    ...tx,
                    cliente: op?.cliente || 'Desconocido',
                    operationEstado: op?.estado || 'Desconocido'
                }
            })
            .sort((a, b) => new Date(a.dueDate || a.date).getTime() - new Date(b.dueDate || b.date).getTime())

        // 4. Calculate global totals
        const totalGastosGenerales = gastosGenerales.reduce((sum, g) => sum + g.amount, 0)

        const globalTotals = {
            totalItemsInAgenda: agenda.length,
            totalSales: financialData.reduce((sum, op) => sum + op.totalSales, 0),
            totalPurchases: financialData.reduce((sum, op) => sum + op.totalPurchases, 0),
            totalIncome: financialData.reduce((sum, op) => sum + op.totalIncome, 0),
            // Include gastosGenerales in totalExpense
            totalExpense: financialData.reduce((sum, op) => sum + op.totalExpense, 0) + totalGastosGenerales,
            // Balance = Income - Expenses
            totalBalance: financialData.reduce((sum, op) => sum + op.balance, 0) - totalGastosGenerales,
            totalPendingToCollect: financialData.reduce((sum, op) => sum + op.pendingToCollect, 0),
            totalPendingToPay: financialData.reduce((sum, op) => sum + op.pendingToPay, 0)
        }

        return NextResponse.json({
            success: true,
            data: {
                operations: financialData,
                agenda,
                movements: allMovements,
                gastosGenerales,
                totals: globalTotals
            }
        })

    } catch (error) {
        console.error('Error fetching financial data:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch financial data' },
            { status: 500 }
        )
    }
}
