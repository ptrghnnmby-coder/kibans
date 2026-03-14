import { NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { getRecentOperations } from '@/lib/googleSheets'

export async function GET() {
    try {
        const operations = await getRecentOperations()

        return NextResponse.json({
            success: true,
            data: operations,
            count: operations.length
        })

    } catch (error) {
        console.error('Error fetching recent operations:', error)
        return NextResponse.json(
            { error: 'Error al obtener operaciones recientes' },
            { status: 500 }
        )
    }
}
