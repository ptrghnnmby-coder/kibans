import { NextResponse } from 'next/server'
import { getAuthSession } from '@/lib/auth'
import { deleteGastoGeneral } from '@/lib/googleSheets'

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await getAuthSession()
        if (!session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { id } = params
        if (!id) {
            return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        }

        await deleteGastoGeneral(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('[DELETE /api/finanzas/gastos/:id] Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
