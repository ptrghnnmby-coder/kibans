import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import {
    getAllOperations,
    getAllCashFlowTransactions,
    getNotes,
    getAllContactos,
    getAllProductos
} from '@/lib/googleSheets'
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
            const { MOCK_DASHBOARD_STATS, MOCK_NOTES, MOCK_CONTACTOS, MOCK_PRODUCTOS } = await import('@/lib/mockData')
            return NextResponse.json({
                success: true,
                data: {
                    stats: MOCK_DASHBOARD_STATS,
                    notes: MOCK_NOTES,
                    lookups: {
                        contacts: (MOCK_CONTACTOS || []).slice(0, 100).map(c => ({ id: c.id, empresa: c.empresa })),
                        products: (MOCK_PRODUCTOS || []).slice(0, 100).map(p => ({ id: p.id, especie: p.especie }))
                    }
                }
            })
        }

        const isAdmin = userRole === 'Admin' || userEmail === 'hm@southmarinetrading.com' || userEmail === 'admin@southmarinetrading.com' || userEmail === 'info@southmarinetrading.com'
        const canImpersonate = userEmail === 'info@southmarinetrading.com' || userEmail === 'rdm@southmarinetrading.com';
        const effectiveEmail = (canImpersonate && impersonateEmail) ? impersonateEmail : (isAdmin ? undefined : userEmail || 'guest')

        // Fetch everything in parallel
        const [allOperations, allTransactions, notes, allContacts, allProducts] = await Promise.all([
            getAllOperations(effectiveEmail),
            getAllCashFlowTransactions(),
            getNotes(),
            getAllContactos(),
            getAllProductos()
        ])

        const dashboardData = calculateFinancialStats(allOperations, allTransactions)

        const recentOps = [...allOperations]
        recentOps.sort((a, b) => {
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
                stats: {
                    recentOps: recentOps.slice(0, 10), // Limiting to top 10 for dashboard
                    monthlySales: dashboardData.monthlySales,
                    totalSales: dashboardData.totalSales,
                    financials: dashboardData.financials
                },
                notes: notes,
                lookups: {
                    contacts: (allContacts || []).map(c => ({ id: c.id, empresa: c.empresa })),
                    products: (allProducts || []).map(p => ({ id: p.id, especie: p.especie }))
                }
            }
        })
    } catch (error) {
        console.error('Dashboard Init API Error:', error)
        return NextResponse.json({ success: false, error: 'Failed to initialize dashboard data' }, { status: 500 })
    }
}
