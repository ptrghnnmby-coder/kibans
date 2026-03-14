import { NextResponse } from 'next/server'
import { getAllProductos } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_PRODUCTOS } = await import('@/lib/mockData')
            return NextResponse.json({
                success: true,
                data: MOCK_PRODUCTOS
            })
        }

        const productos = await getAllProductos()
        return NextResponse.json({
            success: true,
            data: productos
        })
    } catch (error) {
        console.error('Error fetching products:', error)
        return NextResponse.json(
            { success: false, error: 'Error al obtener productos' },
            { status: 500 }
        )
    }
}
