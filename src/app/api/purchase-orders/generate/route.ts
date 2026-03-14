
import { NextResponse } from 'next/server'
import { searchMasterInput, updateOperation } from '@/lib/googleSheets'
import { getAllContactos, getAllProductos } from '@/lib/googleSheets'
import { generatePOData, POInput } from '@/lib/poEngine'
import { createPurchaseOrderDoc, createDriveFolder, deleteFile, shareFile } from '@/lib/googleDocs'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const {
            operationId,
            notes,
            billToId,
            consigneeId,
            notifyId,
            portLoad,
            portDest,
            incoterm,
            paymentTerms,
            fechaEmbarque
        } = await request.json()

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Operation ID required' }, { status: 400 })
        }

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({
                success: true,
                docId: 'demo-po-id',
                docUrl: 'https://docs.google.com/document/d/1BxiMVs0XRYNzOQmr6mJAgxXh187HdbO2ZJ38i0QxYEM/edit?usp=sharing',
                poNumber: `PO-${operationId}`
            })
        }

        // 1. Fetch Data
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        // Fetch all contacts
        const contacts = await getAllContactos()
        const catalogProducts = await getAllProductos()

        // 2. Prepare Input for PO Engine
        // PO uses 'purchasePricesRaw' (buy price), format: "ID:Qty:Price" per line
        const productString = op.purchasePricesRaw || op.productos || ""

        const productsParsed = productString.split('\n').map(line => {
            const parts = line.split(':')
            if (parts.length < 2) return null
            return {
                id: parts[0].trim(),
                qty: parseFloat(parts[1]) || 0,
                price: parseFloat(parts[2]) || 0
            }
        }).filter(p => p !== null) as any[]

        // Validate: all products must have a buy price > 0
        const missingPrice = productsParsed.filter(p => p.price === 0)
        if (missingPrice.length > 0) {
            const ids = missingPrice.map(p => p.id).join(', ')
            return NextResponse.json({
                success: false,
                error: `Faltan precios de compra para: ${ids}. Editá la operación y completá el campo "Precio de Compra" en cada producto antes de generar la PO.`
            }, { status: 400 })
        }

        const poNumber = op.id ? `Po ${op.id}` : `Po-Draft`

        const input: POInput = {
            po_number: poNumber,
            date: new Date().toISOString(),
            user_id: op.userId || "",

            port_load: portLoad || op.portLoad || "Montevideo",
            port_dest: portDest || op.puertoDestino || "",
            ship_date: fechaEmbarque || op.fechaEmbarque || "",
            incoterm: incoterm || op.incoterm || "",
            payment_terms: paymentTerms || op.paymentTerms || "",

            bill_to_id: billToId || op.billToId || "",
            consignee_id: consigneeId || op.consigneeId || op.cliente || "",
            notify_id: notifyId || op.notifyId || "",
            supplier_id: op.productor || op.exportador || "",

            notes: notes || op.notesOc || op.notas || "",
            products: productsParsed
        }

        // 3. Run Engine
        const generatedData = generatePOData(input, catalogProducts, contacts)

        // 4. Create Folder & Doc
        let folderId: string | undefined = op.idCarpeta || undefined
        const folderName: string = op.nombreCarpeta || `${op.id} - ${op.cliente}`

        if (!folderId) {
            // Should exist if proforma was made, but just in case
            try {
                folderId = (await createDriveFolder(folderName)) || undefined
                await updateOperation(op.id!, {
                    idCarpeta: folderId,
                    nombreCarpeta: folderName
                })
            } catch (e) {
                console.error('Error creating folder:', e)
            }
        }

        // Delete previous PO if exists (Column X: OC_id documento)
        if (op.ocIdDocumento) {
            try {
                await deleteFile(op.ocIdDocumento!)
                console.log(`Deleted previous PO: ${op.ocIdDocumento}`)
            } catch (e) {
                console.error('Error deleting previous PO:', e)
            }
        }

        const docName = generatedData.po_number

        const docId = await createPurchaseOrderDoc(
            generatedData.replacements,
            docName,
            folderId,
            generatedData.products
        )

        // 4.5 Share Document
        if (op.userId) {
            await shareFile(docId, op.userId, 'writer')
        } else {
            await shareFile(docId, undefined, 'reader')
        }

        // 5. Update Sheet (Include all updated fields to keep Master Input in sync)
        await updateOperation(op.id!, {
            estado: '4. Orden de Compra Emitida',
            ocId: generatedData.po_number,
            ocIdDocumento: docId,
            billToId: billToId || op.billToId,
            consigneeId: consigneeId || op.consigneeId,
            notifyId: notifyId || op.notifyId,
            portLoad: portLoad || op.portLoad,
            puertoDestino: portDest || op.puertoDestino,
            incoterm: incoterm || op.incoterm,
            paymentTerms: paymentTerms || op.paymentTerms,
            fechaEmbarque: fechaEmbarque || op.fechaEmbarque,
            notesOc: notes || op.notesOc
        })

        return NextResponse.json({
            success: true,
            docId: docId,
            docUrl: `https://docs.google.com/document/d/${docId}/edit`,
            poNumber: generatedData.po_number
        })

    } catch (error: any) {
        console.error('Error generating PO:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
