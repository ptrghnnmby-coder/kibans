import { NextResponse } from 'next/server'
import { getNextContactNumericId } from '@/lib/googleSheets'

export async function GET() {
    try {
        const nextId = await getNextContactNumericId()
        return NextResponse.json({
            success: true,
            data: { nextId }
        })
    } catch (error) {
        console.error('Error getting next contact ID:', error)
        return NextResponse.json(
            { success: false, error: 'Error al obtener el siguiente ID' },
            { status: 500 }
        )
    }
}
