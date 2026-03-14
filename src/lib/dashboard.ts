import { CashFlowTransaction, Operacion } from './sheets-types'
import { parseProductString } from './googleSheets'

export interface ExecutiveFinancials {
    totalIncome: number
    totalExpense: number
    pendingToCollect: number
    pendingToPay: number
    activeBalance: number
    grossMargin: number
}

export interface DashboardData {
    recentOps: Operacion[]
    monthlySales: { month: string, value: number, year: number }[]
    totalSales: number
    financials?: ExecutiveFinancials
}

export function calculateFinancialStats(operations: Operacion[], allTransactions: CashFlowTransaction[] = []): DashboardData {
    // Group sales by month
    const salesByMonth: Record<string, number> = {}
    let totalSales = 0
    let totalPurchases = 0

    operations.forEach(op => {
        // Parse timestamp: "D/M/YYYY H:MM:SS" or similar
        const ts = op.timestamp ? new Date(op.timestamp) : new Date()
        const monthKey = `${ts.getMonth() + 1}/${ts.getFullYear()}`

        const products = parseProductString(op.productos || '')
        const opTotal = products.reduce((sum: number, p: any) => sum + (p.cantidad * p.precio), 0)

        totalSales += opTotal
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + opTotal

        // Purchase calculation for margin
        const purchaseLines = (op.purchasePricesRaw || '').split('\n')
        purchaseLines.forEach(line => {
            const parts = line.split(':')
            if (parts.length >= 3) {
                const qty = parseFloat(parts[1]) || 0
                const price = parseFloat(parts[2]) || 0
                totalPurchases += (qty * price)
            }
        })
    })

    // Executive Financials Calculation - based on ACTUAL transactions
    const paidTransactions = allTransactions.filter(tx => tx.status === 'PAGADO')
    const totalIncome = paidTransactions
        .filter(tx => tx.type === 'INGRESO')
        .reduce((sum, tx) => sum + tx.amount, 0)

    const totalExpense = paidTransactions
        .filter(tx => tx.type === 'EGRESO')
        .reduce((sum, tx) => sum + tx.amount, 0)

    const financials: ExecutiveFinancials = {
        totalIncome,
        totalExpense,
        pendingToCollect: totalSales - totalIncome,
        pendingToPay: totalPurchases - totalExpense,
        activeBalance: totalIncome - totalExpense,
        grossMargin: totalSales > 0 ? ((totalSales - totalPurchases) / totalSales) * 100 : 0
    }

    // Format for chart (last 6 months)
    const monthlySales = []
    for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const month = d.toLocaleString('es-ES', { month: 'long' })
        const key = `${d.getMonth() + 1}/${d.getFullYear()}`
        monthlySales.push({
            month: month.charAt(0).toUpperCase() + month.slice(1),
            value: salesByMonth[key] || 0,
            year: d.getFullYear()
        })
    }

    return {
        totalSales,
        monthlySales,
        recentOps: operations,
        financials
    }
}
