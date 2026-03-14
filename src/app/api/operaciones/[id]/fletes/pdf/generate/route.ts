import { NextResponse } from 'next/server'
import { searchMasterInput, getAllContactos, getAllProductos, getFletesByOperation, updateOperation } from '@/lib/googleSheets'
import { createBookingDoc, shareFile } from '@/lib/googleDocs'
import { generateBookingData } from '@/lib/bookingEngine'

export async function POST(request: Request, { params }: { params: { id: string } }) {
    try {
        const operationId = params.id
        const body = await request.json()
        const { forwarder, marine, inland, freightType, notes, temperature } = body

        if (!forwarder) {
            return NextResponse.json({ success: false, error: 'Forwarder name is required' }, { status: 400 })
        }

        // 1. Fetch Details
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        // Save booking-specific data to the operation
        try {
            const bookingUpdates: any = {}
            if (notes) bookingUpdates.bookingNotes = notes
            if (freightType) bookingUpdates.bookingFreightType = freightType
            if (temperature && temperature !== op.instrucciones_frio) {
                bookingUpdates.instrucciones_frio = temperature
                op.instrucciones_frio = temperature // apply for this generation
            }
            if (Object.keys(bookingUpdates).length > 0) {
                await updateOperation(operationId, bookingUpdates)
            }
        } catch (err) {
            console.error('Failed to save booking data to operation', err)
        }

        // 3. Prepare data for generation
        const contacts = await getAllContactos()
        const productsCatalog = await getAllProductos()
        const fletes = await getFletesByOperation(operationId)
        const flete = fletes.find(f => f.forwarder === forwarder)

        const { replacements, productsArray } = generateBookingData({
            operation: op,
            catalogProducts: productsCatalog,
            contacts,
            flete,
            marine: marine || '',
            inland: inland || '',
            notes: notes || '',
            freightType: freightType || 'MARITIMO'
        })

        const fileName = `Booking Instruction - ${forwarder} - ${operationId}`
        const folderId = op.idCarpeta

        if (!folderId) {
            throw new Error('La operación no tiene una carpeta de Drive asignada.')
        }

        // 4. Create Google Doc
        const docId = await createBookingDoc(
            replacements,
            fileName,
            folderId,
            productsArray
            // Note: createBookingDoc uses BOOKING_TEMPLATE_ID from env var internally
        )

        if (op.userId) {
            await shareFile(docId, op.userId, 'writer')
        }

        // Save docId to operation
        try {
            await updateOperation(operationId, { bookingDocId: docId })
        } catch (err) {
            console.error('Failed to save bookingDocId', err)
        }

        return NextResponse.json({
            success: true,
            docId: docId,
            docUrl: `https://docs.google.com/document/d/${docId}/edit`
        })

    } catch (error: any) {
        console.error('Error generating Booking Doc:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
