import { NextResponse } from 'next/server'
import { getAllContactos, getOperationsByContact } from '@/lib/googleSheets'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    const id = params.id

    try {
        // 1. Get the contact to get its company name
        const contactos = await getAllContactos()
        const contacto = contactos.find(c => c.id === id)

        if (!contacto) {
            return NextResponse.json(
                { success: false, error: 'Contacto no encontrado' },
                { status: 404 }
            )
        }

        // 2. Get operations related to this contact's company name or ID
        const operations = await getOperationsByContact(contacto.empresa, contacto.id)

        return NextResponse.json({
            success: true,
            data: operations
        })
    } catch (error) {
        console.error('Error fetching operations for contact:', error)
        return NextResponse.json(
            { success: false, error: 'Error al buscar operaciones del contacto' },
            { status: 500 }
        )
    }
}
