import { NextResponse } from 'next/server'
import { getAgendaItems, upsertAgendaItem, deleteAgendaItem, dismissAgendaItemForUser, getAllCashFlowTransactions } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        const { searchParams } = new URL(req.url)
        const startDate = searchParams.get('startDate')
        const endDate = searchParams.get('endDate')
        const userEmail = searchParams.get('userEmail')?.toLowerCase() || ''

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Missing date range' }, { status: 400 })
        }

        if (isDemo) {
            const { MOCK_CASHFLOW, MOCK_OPERACIONES } = await import('@/lib/mockData')

            // Map cashflow movements to agenda items
            const cashFlowItems = MOCK_CASHFLOW
                .filter(tx => tx.status === 'PENDIENTE')
                .map(tx => {
                    const op = MOCK_OPERACIONES.find(o => o.id === tx.operationId)
                    return {
                        id: tx.id,
                        date: tx.dueDate || tx.date,
                        title: `${tx.type === 'INGRESO' ? 'Cobro' : 'Pago'}: ${tx.category} ${op?.cliente || ''}`,
                        type: tx.type === 'INGRESO' ? 'COLLECTION' : 'PAYMENT',
                        status: 'PENDING',
                        creator: 'Sistema',
                        amount: tx.amount,
                        operationId: tx.operationId
                    }
                })

            const mockGeneralItems = [
                { id: 'M-1', date: startDate, time: '10:00', title: 'Reunión de Equipo (Mañana)', type: 'MEETING' as const, status: 'PENDING', creator: 'Marta' },
                { id: 'M-2', date: endDate, title: 'Revisar Booking Manzanas', type: 'TASK' as const, status: 'PENDING', creator: 'Rafa' }
            ]

            return NextResponse.json({ success: true, data: [...mockGeneralItems, ...cashFlowItems] })
        }

        const start = new Date(startDate).getTime()
        const end = new Date(endDate).getTime()

        // 1. Agenda items from Contacts sheet (meetings, tasks, etc.)
        let items = await getAgendaItems(startDate, endDate)

        // 2. CashFlow PENDIENTE items with "Fecha para agendar" in range
        try {
            const allTx = await getAllCashFlowTransactions()
            const cashflowAgenda = allTx
                .filter(tx => {
                    if (tx.status !== 'PENDIENTE') return false
                    if (!tx.dueDate) return false
                    const d = new Date(tx.dueDate).getTime()
                    return d >= start && d <= end
                })
                .map(tx => ({
                    id: `CF-${tx.id}`,
                    date: tx.dueDate!,
                    time: '',
                    title: `💰 ${tx.category}: ${tx.description || tx.operationId}`,
                    type: 'PAYMENT' as any,
                    status: 'PENDING' as any,
                    creator: 'Sistema',
                    operationId: tx.operationId,
                    amount: tx.amount
                }))
            items = [...items, ...cashflowAgenda]
        } catch (cfErr) {
            console.error('[Agenda] Error merging CashFlow items:', cfErr)
        }

        const responsibleEmail = searchParams.get('responsibleEmail')?.toLowerCase() || ''
        if (responsibleEmail && responsibleEmail !== 'todos') {
            const { getAllOperations } = await import('@/lib/googleSheets')
            const { USER_MAP } = await import('@/lib/sheets-types')

            const allOps = await getAllOperations()

            // Find all possible identifiers for this responsible (email, name, initial)
            const userInfo = USER_MAP[responsibleEmail]
            const searchTerms = [responsibleEmail]
            if (userInfo) {
                if (userInfo.name) searchTerms.push(userInfo.name.toLowerCase())
                if (userInfo.initial) searchTerms.push(userInfo.initial.toLowerCase())
            }

            const userOps = allOps.filter(op => {
                const opUserId = op.userId?.toLowerCase() || ''
                return searchTerms.some(term => opUserId.includes(term) || term.includes(opUserId))
            })
            const userOpIds = new Set(userOps.map(op => op.id))

            items = items.filter(item => {
                // If it's linked to an operation, check if it belongs to selected responsible
                if (item.operationId) {
                    return userOpIds.has(item.operationId)
                }
                // For items with assignedTo (like general tasks), match against name/email
                if (item.assignedTo) {
                    const assignedLower = item.assignedTo.toLowerCase()
                    return searchTerms.some(term => assignedLower.includes(term))
                }
                // General items visible to everyone
                return true
            })
        }

        // Sort combined items by date then time
        items.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            return (a.time || '23:59').localeCompare(b.time || '23:59')
        })

        return NextResponse.json({ success: true, data: items })
    } catch (error) {
        console.error('Error in GET /api/dashboard/agenda:', error)
        return NextResponse.json({ success: false, error: 'Failed to fetch agenda' }, { status: 500 })
    }
}


export async function POST(req: Request) {
    try {
        const body = await req.json()
        const item = await upsertAgendaItem(body)
        return NextResponse.json({ success: true, data: item })
    } catch (error) {
        console.error('Error in POST /api/dashboard/agenda:', error)
        return NextResponse.json({ success: false, error: 'Failed to save agenda item' }, { status: 500 })
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        if (!body.id) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
        const item = await upsertAgendaItem(body)
        return NextResponse.json({ success: true, data: item })
    } catch (error) {
        console.error('Error in PUT /api/dashboard/agenda:', error)
        return NextResponse.json({ success: false, error: 'Failed to update agenda item' }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get('id')
        const userEmail = searchParams.get('userEmail')
        
        if (!id) return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
        
        if (userEmail) {
            await dismissAgendaItemForUser(id, userEmail)
        } else {
            await deleteAgendaItem(id)
        }
        
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in DELETE /api/dashboard/agenda:', error)
        return NextResponse.json({ success: false, error: 'Failed to delete agenda item' }, { status: 500 })
    }
}
