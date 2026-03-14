import { NextResponse } from 'next/server'
import { updateContacto, getAllContactos, deleteContacto } from '@/lib/googleSheets'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id

    // Como no tenemos una función getContactoById en la lib (para no leer todo de nuevo y buscar),
    // y dada la simplicidad, podemos reutilizar getAllContactos y buscar en memoria por ahora.
    // Optimización futura: getRowById directo en Sheets.
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            const { MOCK_CONTACTOS } = await import('@/lib/mockData')
            const contacto = MOCK_CONTACTOS.find(c => c.id === id)
            if (!contacto) {
                return NextResponse.json({ success: false, error: 'Contacto no encontrado' }, { status: 404 })
            }
            return NextResponse.json({ success: true, data: contacto })
        }

        const contactos = await getAllContactos()
        const contacto = contactos.find(c => c.id === id)

        if (!contacto) {
            return NextResponse.json(
                { success: false, error: 'Contacto no encontrado' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            success: true,
            data: contacto
        })
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Error al buscar contacto' },
            { status: 500 }
        )
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true, data: { ...await request.json(), id } })
        }

        const body = await request.json()
        const updatedContacto = await updateContacto(id, body)

        return NextResponse.json({
            success: true,
            data: updatedContacto
        })
    } catch (error) {
        console.error('Error updating contacto:', error)
        return NextResponse.json(
            { success: false, error: 'Error al actualizar contacto' },
            { status: 500 }
        )
    }
}
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id
    try {
        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({ success: true })
        }

        await deleteContacto(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting contacto:', error)
        return NextResponse.json(
            { success: false, error: 'Error al eliminar contacto' },
            { status: 500 }
        )
    }
}
