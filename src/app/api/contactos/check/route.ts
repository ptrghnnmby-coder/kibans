import { NextResponse } from 'next/server'
import { checkContactDuplicates } from '@/lib/googleSheets'

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email') || undefined
    const id = searchParams.get('id') || undefined

    try {
        const result = await checkContactDuplicates(email, id)
        return NextResponse.json({
            success: true,
            data: result
        })
    } catch (error) {
        console.error('Error checking duplicates:', error)
        return NextResponse.json(
            { success: false, error: 'Error al verificar duplicados' },
            { status: 500 }
        )
    }
}
