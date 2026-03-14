import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getAllOperations } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_OPERACIONES } = await import('@/lib/mockData')
            return NextResponse.json({
                success: true,
                data: MOCK_OPERACIONES,
                count: MOCK_OPERACIONES.length
            })
        }

        console.log('[API] /api/operaciones/all - Session User:', session?.user?.email)

        const operations = await getAllOperations()
        console.log(`[API] /api/operaciones/all - Fetched ${operations.length} operations`)

        return NextResponse.json({
            success: true,
            data: operations,
            count: operations.length,
            debugUser: session?.user?.email,
            debugRole: (session?.user as any)?.role
        })

    } catch (error) {
        console.error('Error fetching all operations:', error)
        return NextResponse.json(
            { error: 'Error al obtener todas las operaciones' },
            { status: 500 }
        )
    }
}
