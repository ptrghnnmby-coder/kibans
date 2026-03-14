
import { NextResponse } from 'next/server'
import { getAllOperations } from '@/lib/googleSheets'
import { Operacion } from '@/lib/sheets-types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const productId = searchParams.get('productId')
        const contactId = searchParams.get('contactId')

        if (!productId && !contactId) {
            return NextResponse.json({ success: false, error: 'Missing productId or contactId' }, { status: 400 })
        }

        const allOperations = await getAllOperations()

        let filteredOperations: Operacion[] = []

        if (productId) {
            const lowerProdId = productId.toLowerCase()
            filteredOperations = allOperations.filter(op => {
                const rawProducts = (op.productos || '').toLowerCase()
                // Simple inclusion check for now, can be improved with regex if needed
                return rawProducts.includes(lowerProdId)
            })
        } else if (contactId) {
            // contactId logic
            // We need to check if this contact ID appears in importador, exportador, or productor fields
            // The Master Input stores these often as just the name or ID. 
            // We should match against the contact ID provided.

            // However, the Master Input columns 'importador', 'exportador', 'productor' might contain IDs or Names.
            // Ideally we match exact ID if possible, or fuzzy match name?
            // For this iteration, let's assume the contactId passed is the one stored in the operation columns
            // OR the operation stores the ID in `import_id`, `export_id` etc invisible columns?
            // The `getAllOperations` maps 'importador' from 'import_id' OR 'importador'.

            const lowerContactId = contactId.toLowerCase().trim()

            filteredOperations = allOperations.filter(op => {
                const lowerImp = (op.cliente || '').toLowerCase().trim()
                const lowerExp = (op.exportador || '').toLowerCase().trim()
                const lowerProd = (op.productor || '').toLowerCase().trim()

                return (
                    lowerImp === lowerContactId ||
                    lowerExp === lowerContactId ||
                    lowerProd === lowerContactId
                )
            })
        }

        // Sort by date desc (assuming timestamp or id descending)
        // If timestamp exists use it, otherwise use ID if it looks like a timestamp or auto-increment
        filteredOperations.sort((a, b) => {
            const dateA = a.fechaEmbarque ? new Date(a.fechaEmbarque).getTime() : 0
            const dateB = b.fechaEmbarque ? new Date(b.fechaEmbarque).getTime() : 0
            return dateB - dateA
        })

        return NextResponse.json({ success: true, data: filteredOperations })

    } catch (error) {
        console.error('Error searching operations:', error)
        return NextResponse.json({ success: false, error: 'Failed to search operations' }, { status: 500 })
    }
}
