import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getAllOperations, getAllCashFlowTransactions } from '@/lib/googleSheets'
import { calculateFinancialStats } from '@/lib/dashboard'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const impersonateEmail = searchParams.get('impersonate')

        const session = await getServerSession(authOptions)
        const userEmail = session?.user?.email
        const userRole = (session?.user as any)?.role
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_DASHBOARD_STATS } = await import('@/lib/mockData')
            return NextResponse.json({
                success: true,
                data: MOCK_DASHBOARD_STATS
            })
        }

        const isAdmin = userRole === 'Admin' || userEmail === 'hm@southmarinetrading.com' || userEmail === 'admin@southmarinetrading.com' || userEmail === 'info@southmarinetrading.com'

        // Authorization for Admin Bridge (Impersonation)
        const canImpersonate = userEmail === 'info@southmarinetrading.com' || userEmail === 'rdm@southmarinetrading.com';

        // Impersonation logic: only authorized users can impersonate
        const effectiveEmail = (canImpersonate && impersonateEmail) ? impersonateEmail : (isAdmin ? undefined : userEmail || 'guest')

        // Fetch all operations and ALL cash flow transactions in parallel
        const [allOperations, allTransactions] = await Promise.all([
            getAllOperations(effectiveEmail),
            getAllCashFlowTransactions()
        ])

        const dashboardData = calculateFinancialStats(allOperations, allTransactions)

        const filteredOps = allOperations

        // Sort by timestamp descending, fallback to ID descending (more reliable for newest first)
        filteredOps.sort((a, b) => {
            const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;

            if (dateB !== dateA) return dateB - dateA;

            const idA = a.id || '';
            const idB = b.id || '';
            return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
        });

        return NextResponse.json({
            success: true,
            data: {
                recentOps: filteredOps, // Return all user operations
                monthlySales: dashboardData.monthlySales,
                totalSales: dashboardData.totalSales,
                financials: dashboardData.financials
            }
        })
    } catch (error) {
        console.error('Dashboard Stats API Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard stats' }, { status: 500 })
    }
}
