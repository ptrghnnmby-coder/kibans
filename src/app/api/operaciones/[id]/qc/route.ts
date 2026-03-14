import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getInspeccionesByOperation, addInspeccion, updateInspeccion } from '@/lib/googleSheets'
import { v4 as uuidv4 } from 'uuid'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const isDemo = (session.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json([{
                id: `QC-${params.id}-DEMO`,
                operationId: params.id,
                fechaProgramada: '2025-03-15',
                responsable: 'Demo Inspector',
                estado: 'Completado',
                notas: 'Inspección de calidad completada satisfactoriamente (Reporte Demo).',
                rutaCarpetaDrive: 'Control de Calidad / Demo'
            }])
        }

        const inspecciones = await getInspeccionesByOperation(params.id)
        return NextResponse.json(inspecciones)
    } catch (error) {
        console.error('Error in GET /api/operaciones/[id]/qc:', error)
        return NextResponse.json({ error: 'Failed to fetch inspections' }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const operacionId = params.id
        const reqData = await request.json()

        const isDemo = (session.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json({
                ...reqData,
                operationId: operacionId,
                id: `QC-${operacionId}-DEMO-NEW`
            })
        }

        const nuevaInspeccion = {
            ...reqData,
            operationId: operacionId,
            id: reqData.id || `QC-${operacionId}-${reqData.fechaProgramada?.replace(/-/g, '') || uuidv4().split('-')[0]}`,
        }

        const result = await addInspeccion(nuevaInspeccion)
        return NextResponse.json(result)
    } catch (error) {
        console.error('Error in POST /api/operaciones/[id]/qc:', error)
        return NextResponse.json({ error: 'Failed to add inspection' }, { status: 500 })
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // El ID de inspección debe venir en el body, y params.id es de la operación
        const { id, ...updates } = await request.json()

        if (!id) {
            return NextResponse.json({ error: 'Inspection ID is required for update' }, { status: 400 })
        }

        const isDemo = (session.user as any)?.isDemo
        if (isDemo) {
            return NextResponse.json({ success: true, updated: true, demo: true })
        }

        await updateInspeccion(id, updates)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error in PUT /api/operaciones/[id]/qc:', error)
        return NextResponse.json({ error: 'Failed to update inspection' }, { status: 500 })
    }
}
