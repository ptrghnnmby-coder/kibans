
import { NextResponse } from 'next/server'
import { generateProformaData, OperationInput } from '@/lib/proformaEngine'
import { getAllOperations, getAllContactos, addToTrackingSheet, createOperation, updateOperation, addCashFlowTransaction } from '@/lib/googleSheets'
import { createDriveFolder, createProformaDoc } from '@/lib/googleDocs'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // 1. Fetch necessary data
        const [operationsHistory, allContacts] = await Promise.all([
            getAllOperations(),
            getAllContactos()
        ])

        // 2. Filter Catalogs
        const importers = allContacts.filter(c => c.isImporter)
        const exporters = allContacts.filter(c => c.isExporter)
        const producers = allContacts.filter(c => c.isProducer)

        // 3. Prepare Input for Engine
        // Map body to OperationInput
        const input: OperationInput = {
            user_id: body.user_id || 'unknown@example.com',
            import_id: body.import_id,
            export_id: body.export_id,
            producer_id: body.producer_id,
            port_dest: body.port_dest,
            port_load: body.port_load,
            incoterm: body.incoterm,
            ship_date: body.ship_date,
            ship_lane: body.ship_lane,
            payment_terms: body.payment_terms,
            trading: body.trading,
            notes: body.notes,
            brand: body.brand,
            products: body.products, // Assumes frontend sends {id, qty, price, details...}
            id_carga: body.id_carga || undefined, // Optional, might be null
            row_number: body.row_number
        }

        // 4. Run Proforma Engine
        const proformaData = generateProformaData(
            input,
            operationsHistory,
            [], // catalogProducts
            importers,
            exporters,
            producers
        )

        // 5. Google Drive Actions
        // Re-enabled based on user feedback
        console.log('[DEBUG] Creating Drive Folder for:', proformaData.folder_name)
        const folderId = await createDriveFolder(proformaData.folder_name)
        console.log('[DEBUG] Folder Created ID:', folderId)

        // Create Doc
        const fileName = `Proforma ${proformaData.pi_number} - ${input.import_id}`
        // const docId = await createProformaDoc(proformaData.replacements, fileName, folderId)
        const docId = "" // Keep doc creation disabled for now if not explicitly requested, or enable? User said "folder". Start with folder.

        // 6. Google Sheets Actions
        // Prepare Operation Data for persistence
        const opData = {
            id: proformaData.id_carga,
            piNumber: proformaData.pi_number,
            nombreCarpeta: proformaData.folder_name,
            idCarpeta: folderId || '',
            estado: '2. Proforma Enviada',
            cliente: input.import_id,
            exportador: input.export_id,
            productor: input.producer_id,
            fechaEmbarque: input.ship_date,
            arrivalDate: body.arrival_date, // ETA
            puertoDestino: proformaData.replacements.port_destination,
            portLoad: input.port_load,
            incoterm: input.incoterm,
            shipLane: input.ship_lane,
            trading: input.trading,
            paymentTerms: input.payment_terms,
            userId: input.user_id,
            notes: input.notes,
            brand: input.brand,
            productos: body.products_raw || JSON.stringify(body.products),
            purchasePricesRaw: body.purchase_prices_raw || '',
            idDocumento: docId || '',
            booking: body.booking,
            forwarder: body.forwarder,
            freightValue: typeof body.freight_value === 'number' ? body.freight_value.toString() : body.freight_value,
            containerNumber: body.container_number,
            timestamp: new Date().toISOString()
        }

        // Update Master Input (Append new row as per N8N)
        // N8N flow "Agregar linea nueva en Master imput".
        // Use createOperation which appends.
        // NOTE: If we wanted to UPDATE an existing draft, we'd check body.id_carga.
        // But N8N generates a NEW ID every time. Let's follow N8N for now: Always New.
        // Wait, if it's "New Operation" in UI, it's new. 
        const createdOp = await createOperation(opData)

        // 7. Add to Tracking Sheet
        try {
            await addToTrackingSheet({
                responsable: proformaData.user_initial,
                importador: input.import_id,
                exportador: input.export_id,
                productor: input.producer_id,
                destino: input.port_dest,
                trading: input.trading,
                proforma: "", // Empty
                idCarga: createdOp.id || proformaData.id_carga,
                estado: '2. Proforma Enviada',
                fechaCierre: ''
            })
        } catch (trackingError) {
            console.error('Warning: Failed to add to tracking sheet', trackingError)
            // Do not fail the request if tracking sheet fails, since operation was created
        }

        // 8. Auto-create pending cash flow transactions using the centralized sync
        const operationId = createdOp.id || proformaData.id_carga
        if (operationId) {
            try {
                const { syncOperationCashFlow } = await import('@/lib/googleSheets')
                await syncOperationCashFlow(operationId)
            } catch (txError) {
                console.error('Error creating initial cash flow transactions:', txError);
                // Don't fail the entire operation if cash flow creation fails
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id_carga: createdOp.id || proformaData.id_carga,
                pi_number: "",
                doc_id: "",
                folder_id: "",
                folder_name: ""
            }
        })

    } catch (error) {
        console.error('Error generating proforma:', error)
        return NextResponse.json(
            { success: false, error: 'Error generando operación' },
            { status: 500 }
        )
    }
}
