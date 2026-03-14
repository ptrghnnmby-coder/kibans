import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getAllCashFlowTransactions } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_CASHFLOW } = await import('@/lib/mockData')
            return NextResponse.json({ success: true, data: MOCK_CASHFLOW })
        }

        const { searchParams } = new URL(request.url)
        const userEmail = searchParams.get('userEmail')?.toLowerCase() || ''

        // Get all cash flow transactions
        const allTransactions = await getAllCashFlowTransactions()

        // Filter for pending transactions
        const pendingTransactions = allTransactions.filter(tx => tx.status === 'PENDIENTE')

        // Get current date
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Get date 15 days from now
        const fifteenDaysFromNow = new Date(today)
        fifteenDaysFromNow.setDate(today.getDate() + 15)

        // Filter transactions: Include pending items from the past (overdue) and upcoming (next 30 days)
        let relevantTransactions = pendingTransactions.filter(tx => {
            const dueDate = new Date(tx.dueDate || tx.date)
            dueDate.setHours(0, 0, 0, 0)

            const thirtyDaysFromNow = new Date(today)
            thirtyDaysFromNow.setDate(today.getDate() + 30)

            // Include ALL pending items that are either overdue (dueDate < today) 
            // or due within the next 30 days.
            return dueDate <= thirtyDaysFromNow
        })

        const responsibleEmail = searchParams.get('responsibleEmail')?.toLowerCase() || ''
        if (responsibleEmail && responsibleEmail !== 'todos') {
            const { getAllOperations } = await import('@/lib/googleSheets')
            const { USER_MAP } = await import('@/lib/sheets-types')

            const allOps = await getAllOperations()

            // Find all possible identifiers for this responsible (email, name, initial)
            const userInfo = USER_MAP[responsibleEmail]
            const searchTerms = [responsibleEmail]
            if (userInfo) {
                if (userInfo.name) searchTerms.push(userInfo.name.toLowerCase())
                if (userInfo.initial) searchTerms.push(userInfo.initial.toLowerCase())
            }

            const userOps = allOps.filter(op => {
                const opUserId = op.userId?.toLowerCase() || ''
                // Check if any search term matches the op.userId (which might be email or name)
                return searchTerms.some(term => opUserId.includes(term) || term.includes(opUserId))
            })
            const userOpIds = new Set(userOps.map(op => op.id))

            relevantTransactions = relevantTransactions.filter(tx => {
                if (tx.operationId) {
                    return userOpIds.has(tx.operationId)
                }
                return true
            })
        }

        // Sort by due date (earliest first, so overdue items appear first)
        relevantTransactions.sort((a, b) => {
            const dateA = new Date(a.dueDate || a.date).getTime()
            const dateB = new Date(b.dueDate || b.date).getTime()
            return dateA - dateB
        })

        // Limit to 15 most urgent (overdue + upcoming)
        const limitedTransactions = relevantTransactions.slice(0, 15)

        return NextResponse.json({
            success: true,
            data: limitedTransactions
        })
    } catch (error) {
        console.error('Error fetching pending cash flow:', error)
        return NextResponse.json({
            success: false,
            error: 'Error al obtener flujo de caja pendiente'
        }, { status: 500 })
    }
}

