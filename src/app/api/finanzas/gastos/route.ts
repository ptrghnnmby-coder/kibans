import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { getGastosGenerales, addGastoGeneral } from '@/lib/googleSheets'

export async function GET(req: Request) {
    try {
        const session = await getAuthSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const gastos = await getGastosGenerales()
        return NextResponse.json(gastos)
    } catch (error) {
        console.error('[GET /api/finanzas/gastos] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function POST(req: Request) {
    try {
        const session = await getAuthSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { date, responsable, category, description, amount } = body

        if (!responsable || !category || amount === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const gasto = await addGastoGeneral({
            date,
            responsable,
            category,
            description: description || '',
            amount: Number(amount),
            timestamp: new Date().toISOString()
        })

        return NextResponse.json(gasto)
    } catch (error) {
        console.error('[POST /api/finanzas/gastos] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
