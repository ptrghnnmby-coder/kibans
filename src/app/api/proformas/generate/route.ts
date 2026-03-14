import { NextResponse } from 'next/server'
import { searchMasterInput, updateOperation } from '@/lib/googleSheets'
import { getAllContactos, getAllProductos } from '@/lib/googleSheets'
import { generateProformaData, OperationInput } from '@/lib/proformaEngine'
import { createProformaDoc, createDriveFolder, deleteFile, shareFile } from '@/lib/googleDocs'
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { operationId, notasProforma, booking, containerNumber } = body

        if (!operationId) {
            return NextResponse.json({ success: false, error: 'Operation ID required' }, { status: 400 })
        }

        const session = await getServerSession(authOptions)
        const isDemo = (session?.user as any)?.isDemo

        if (isDemo) {
            return NextResponse.json({
                success: true,
                docId: 'demo-doc-id',
                docUrl: 'https://docs.google.com/document/d/1BxiMVs0XRYNzOQmr6mJAgxXh187HdbO2ZJ38i0QxYEM/edit?usp=sharing',
                piNumber: `PI-${operationId}`
            })
        }

        // 1. Fetch Data
        const ops = await searchMasterInput(operationId)
        const op = ops.find(o => o.id === operationId)

        if (!op) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        // 1.5 Update operation with provided data if any
        if (notasProforma !== undefined || booking !== undefined || containerNumber !== undefined) {
            await updateOperation(operationId, {
                notasProforma,
                booking,
                containerNumber
            })
            // Refresh op data
            op.notasProforma = notasProforma
            op.booking = booking || op.booking
            op.containerNumber = containerNumber || op.containerNumber
        }

        // ... existing data fetching ...
        // 2. Fetch Contacts and Products
        const [contacts, catalogProducts] = await Promise.all([
            getAllContactos(),
            getAllProductos()
        ])

        // Filter contacts by type/flags
        const importers = contacts.filter(c => c.isImporter || c.tipo === 'Importador')
        const exporters = contacts.filter(c => c.isExporter || c.tipo === 'Exportador')
        const producers = contacts.filter(c => c.isProducer || c.tipo === 'Productor')

        // ... parsing logic ...
        const productString = op.productos || ""
        console.log(`[ProformaAPI] Raw product string for ${operationId}: "${productString.replace(/\n/g, '\\n')}"`)
        const productsParsed = productString.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split(':')
            if (parts.length < 3) return null
            return {
                id: parts[0].trim(),
                qty: parseFloat(parts[1]) || 0,
                price: parseFloat(parts[2]) || 0
            }
        }).filter(p => p !== null) as any[]
        console.log(`[ProformaAPI] Parsed ${productsParsed.length} products`)

        const input: OperationInput = {
            id_carga: op.id,
            user_id: op.userId || "",
            import_id: op.cliente,
            export_id: op.exportador,
            producer_id: op.productor || "",
            port_dest: op.puertoDestino || "",
            port_load: op.portLoad || "Montevideo",
            incoterm: op.incoterm || "CFR",
            ship_date: op.fechaEmbarque || new Date().toISOString(),
            ship_lane: op.shipLane || "",
            payment_terms: op.paymentTerms || "",
            trading: op.trading || "",
            notes: op.notas || "",
            notasProforma: op.notasProforma || "",
            brand: op.brand || "",
            products: productsParsed
        }

        // 3. Run Engine
        if (!importers.length) console.warn("[Proforma] No importers found in contacts")

        const generatedData = generateProformaData(input, ops, catalogProducts, importers, exporters, producers)

        // Override computed IDs with actual Operation IDs to match consistency
        generatedData.id_carga = op.id || generatedData.id_carga
        generatedData.pi_number = op.piNumber || `Pi ${op.id}` // Use existing PI or fallback
        // generatedData.folder_name re-calculated by engine

        // update replacements with correct keys
        generatedData.replacements['proforma_n'] = generatedData.pi_number
        generatedData.replacements['ID_Carga'] = generatedData.id_carga

        // 4. Create Folder & Doc
        // Check if folder already exists
        let folderId: string | undefined = op.idCarpeta || undefined
        const folderName: string = op.nombreCarpeta || generatedData.folder_name

        if (!folderId) {
            try {
                folderId = (await createDriveFolder(folderName)) || undefined
                // Update folder info immediately
                await updateOperation(op.id!, {
                    idCarpeta: folderId,
                    nombreCarpeta: folderName
                })
            } catch (e) {
                console.error('Error creating folder:', e)
            }
        }

        // Delete previous document if it exists (Replace logic)
        if (op.idDocumento) {
            try {
                await deleteFile(op.idDocumento!)
                console.log(`Deleted previous proforma: ${op.idDocumento}`)
            } catch (e) {
                console.error('Error deleting previous proforma (might strictly not exist):', e)
            }
        }

        const docName = generatedData.pi_number

        // Use the pre-formatted products array from the engine
        const productsArray = generatedData.products.map(p => ({
            qty: p.qty,
            desc: p.description,
            unit: p.unit_price,
            subtotal: p.subtotal,
            ctns: p.cartons
        }));

        const docId = await createProformaDoc(generatedData.replacements, docName, folderId, productsArray)

        // 4.5 Share Document
        if (op.userId) {
            await shareFile(docId, op.userId, 'writer')
        } else {
            await shareFile(docId, undefined, 'reader')
        }

        // 5. Update Sheet (Sync back to Master Input)
        await updateOperation(op.id!, {
            piNumber: generatedData.pi_number,
            nombreCarpeta: folderName, // Ensure consistent name
            idCarpeta: folderId || "",
            idDocumento: docId,
            estado: '2. Proforma Enviada'
        })

        return NextResponse.json({
            success: true,
            docId: docId,
            docUrl: `https://docs.google.com/document/d/${docId}/edit`,
            folderName: generatedData.folder_name
        })

    } catch (error: any) {
        console.error('Error generating proforma:', error)

        let friendlyMessage = error.message
        if (error.message.includes('importers is not defined')) {
            friendlyMessage = "Error de configuración: La lista de contactos no se cargó correctamente (importers missing)."
        } else if (error.message.includes('404') || error.message.includes('not found')) {
            friendlyMessage = "Error de Google Drive: No se encontró la carpeta o el documento base."
        } else if (error.message.includes('Permissions') || error.message.includes('403')) {
            friendlyMessage = "Error de permisos: Tess no tiene permiso para crear archivos en esa carpeta de Drive."
        }

        return NextResponse.json({
            success: false,
            error: friendlyMessage,
            technical: error.message
        }, { status: 500 })
    }
}
