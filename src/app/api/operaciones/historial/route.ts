import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getHistoricalOperations } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
        }

        const isDemo = (session?.user as any)?.isDemo
        if (isDemo) {
            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
            // Mocking 'Liquidada' status as historical
            const demoHistorial = MOCK_OPERACIONES.filter(o => o.estado?.includes('Liquidada') || o.estado?.includes('14.'))
            return NextResponse.json({ success: true, data: demoHistorial })
        }

        const operaciones = await getHistoricalOperations()

        // Optional: Filter by user role if needed (e.g. only see own history)
        // For now, assuming standard visibility rules or admin-like access to history

        return NextResponse.json({ success: true, data: operaciones })
    } catch (error) {
        console.error('Error fetching historical operations:', error)
        return NextResponse.json(
            { success: false, error: 'Failed to fetch historical operations' },
            { status: 500 }
        )
    }
}
