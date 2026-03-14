import { NextRequest, NextResponse } from 'next/server'
import { getFletesByOperation, addFlete, updateFlete, deleteFlete } from '@/lib/googleSheets'
import { FleteSchema } from '@/lib/schemas'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_FLETES } = await import('@/lib/mockData')
            const fletes = MOCK_FLETES.filter((f: any) => f.id_operacion === id)
            return NextResponse.json({ success: true, data: fletes })
        }

        const fletes = await getFletesByOperation(id)
        return NextResponse.json({ success: true, data: fletes })
    } catch (error) {
        console.error('Error fetching fletes:', error)
        return NextResponse.json({ success: false, error: 'Error al cargar fletes' }, { status: 500 })
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const body = await request.json()
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true, data: { ...body, id_operacion: id, fecha_solicitud: new Date().toISOString() } })
        }

        // Ensure id matches
        body.id_operacion = id

        const validatedData = FleteSchema.parse(body)
        const newFlete = await addFlete(validatedData)

        return NextResponse.json({ success: true, data: newFlete })
    } catch (error: any) {
        console.error('Error adding flete:', error)
        return NextResponse.json({ success: false, error: error.message || 'Error al guardar flete' }, { status: 500 })
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const body = await request.json()
        const { forwarder, ...updates } = body
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true })
        }

        if (!forwarder) throw new Error('Forwarder is required')

        await updateFlete(id, forwarder, updates)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error updating flete:', error)
        return NextResponse.json({ success: false, error: error.message || 'Error al actualizar flete' }, { status: 500 })
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id
        const { searchParams } = new URL(request.url)
        const forwarder = searchParams.get('forwarder')
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true })
        }

        if (!forwarder) throw new Error('Forwarder is required')

        await deleteFlete(id, forwarder)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Error deleting flete:', error)
        return NextResponse.json({ success: false, error: error.message || 'Error al eliminar flete' }, { status: 500 })
    }
}
