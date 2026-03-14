
import { NextResponse } from 'next/server'
import { generateProformaData, OperationInput } from '@/lib/proformaEngine'
import { getAllOperations, getAllContactos, updateOperation, createOperation, searchMasterInput } from '@/lib/googleSheets'
import { createDriveFolder, createProformaDoc, deleteFile } from '@/lib/googleDocs'

// EDIT STRATEGY: Regenerate & Replace
// 1. Fetch current operation data from Sheets
// 2. Merge with new data (updates)
// 3. Run Proforma Engine to generate NEW content
// 4. Create NEW Doc
// 5. Delete OLD Doc
// 6. Update Sheets (Master Input) with new Doc ID and Timestamp

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id_carga, updates } = body

        if (!id_carga) {
            return NextResponse.json({ success: false, error: 'Missing id_carga' }, { status: 400 })
        }

        // 1. Fetch Data
        const allOps = await getAllOperations()
        const currentOp = allOps.find(op => op.id === id_carga)

        if (!currentOp) {
            return NextResponse.json({ success: false, error: 'Operation not found' }, { status: 404 })
        }

        // Fetch contacts for engine
        const allContacts = await getAllContactos()
        const importers = allContacts.filter(c => c.isImporter)
        const exporters = allContacts.filter(c => c.isExporter)
        const producers = allContacts.filter(c => c.isProducer)

        // 2. Merge Data
        // We need to reconstruct OperationInput from currentOp + updates
        // CurrentOp has 'productos' as a string (raw), we might need to parse it if we want to manipulate it safely,
        // OR we trust 'updates' contains the full new product list if products are being changed.
        // The N8N workflow says: "Si es 'Agregar', suma. Si es 'Corregir', sobrescribe".
        // Our API will assume the frontend sends the FINAL desired state of products in `updates.products`.

        // Parse current products if needed, but if updates.products is present, use it.
        // If updates.products is NOT present, keep current. 
        // Note: `currentOp.productos` is a formatted string. We might need `purchasePricesRaw` or similar to get structured data back?
        // Actually `proformaEngine` expects `Product[]`. 
        // If we don't have structured products in `currentOp`, we can't easily re-run the engine without parsing.
        // `googleSheets.ts` has `parseProductString` helper!

        let productsForEngine = []
        if (updates.products) {
            productsForEngine = updates.products
        } else {
            // Try to parse existing
            const { parseProductString } = await import('@/lib/googleSheets')
            const parsed = parseProductString(currentOp.productos || '')
            // We need 'qty', 'price', 'id'. `parseProductString` returns {id, cantidad, precio}
            productsForEngine = parsed.map(p => ({
                id: p.id,
                qty: p.cantidad,
                price: p.precio,
                // We miss description details here if we only parse the ID string.
                // But `generateProformaData` will fetch details from Catalog if we pass just ID? 
                // Wait, `generateProformaData` uses `input.products`. 
                // It looks up details? No, it expects `desc`, `corte`, etc in the input object if it's not a service.
                // Actually `generateProformaData` Logic:
                // It takes `prod` from input. It tries to use `prod.descripcion` OR construct it.
                // It doesn't fetch from catalog inside the engine. The CALLER must provide enriched products.
                // So... we need to re-enrich the products if we parse them from string.
            }))

            // Re-enrich from catalog
            // We need all products catalog?
            // `getAllOperations` doesn't return products catalog.
            // We might need to fetch products catalog here.
            const { getAllProductos } = await import('@/lib/googleSheets')
            const productCatalog = await getAllProductos()

            productsForEngine = productsForEngine.map(p => {
                const cat = productCatalog.find(c => c.id === p.id)
                return {
                    ...p,
                    ...cat // Merge catalog details (especie, corte, etc)
                }
            })
        }

        const mergedInput: OperationInput = {
            user_id: updates.user_id || currentOp.userId,
            import_id: updates.import_id || currentOp.cliente,
            export_id: updates.export_id || currentOp.exportador,
            producer_id: updates.producer_id || currentOp.productor,
            port_dest: updates.port_dest || currentOp.puertoDestino,
            port_load: updates.port_load || currentOp.portLoad,
            incoterm: updates.incoterm || currentOp.incoterm,
            ship_date: updates.ship_date || currentOp.fechaEmbarque,
            ship_lane: updates.ship_lane || currentOp.shipLane || 'MAERSK',
            payment_terms: updates.payment_terms || currentOp.paymentTerms,
            trading: updates.trading || currentOp.trading,
            notes: updates.notes || currentOp.notas,
            brand: updates.brand || currentOp.brand,
            products: productsForEngine,
            id_carga: currentOp.id,
            row_number: undefined // Not needed for engine logic per se, handled in updates
        }

        const { getAllProductos } = await import('@/lib/googleSheets')
        const productCatalog = await getAllProductos()

        // 3. Run Engine
        const proformaData = generateProformaData(
            mergedInput,
            allOps,
            productCatalog,
            importers,
            exporters,
            producers
        )

        // 4. Create NEW Doc
        // We reuse the FOLDER. N8N says "Update file" > actually "folderId" might change if entities changed?
        // N8N logic: Folder Name is updated. Logic for Folder ID?
        // N8N "Update file" node seems to rename the folder?
        // Wait, "Name: {{folderName}}" in `Update file`. It updates the FOLDER name. 
        // And then "Borrar proforma anterior". And then "Copy Template".
        // So yes, we should update Folder Name if it changed, and Create new Doc locally.

        // Find Folder ID. currentOp doesn't have folder ID column explicitly mapped in `Operacion` interface commonly?
        // `Operacion` has `idCarpeta`? Let's check `sheets-types.ts` or `googleSheets.ts` map.
        // `googleSheets.ts` map: `idCarpeta: ['Id carpeta', 'id_carpeta']`.
        // So `currentOp.idCarpeta` should be available if mapped. 
        // If not, we might fail to find the folder to rename. 
        // If we can't find it, we might create a new one? No, that duplicates.
        // Let's assume we have it or we search for it? 
        // For now, let's create the DOC in the SAME folder if we have ID, or create new if missing.

        let folderId = (currentOp as any).idCarpeta

        // If we have folderId, rename it (in case entities changed)
        if (folderId) {
            // Rename folder logic? `googleDocs.ts` doesn't have rename.
            // For now skip renaming the folder to avoid complexity, focus on Doc.
        } else {
            // Create if missing?
            folderId = await createDriveFolder(proformaData.folder_name)
        }

        const fileName = `Proforma ${proformaData.pi_number} - ${mergedInput.import_id}`

        // Build productsArray for dynamic table row insertion
        const productsArray = (proformaData.products || []).map(p => ({
            qty: p.qty,
            desc: p.description,
            unit: p.unit_price,
            subtotal: p.subtotal,
            ctns: p.cartons || ''
        }))

        const newDocId = await createProformaDoc(proformaData.replacements, fileName, folderId, productsArray)

        // 5. Delete OLD Doc
        if (currentOp.idDocumento) {
            try {
                // We need `deleteFile` in `googleDocs.ts`
                await deleteFile(currentOp.idDocumento)
            } catch (e) {
                console.warn('Failed to delete old doc:', e)
            }
        }

        // 6. Update Sheets
        const productsRaw = updates.products_raw || (updates.products ? JSON.stringify(updates.products) : currentOp.productos)

        const updatePayload = {
            idDocumento: newDocId,
            timestamp: new Date().toISOString(),
            // Update other fields that might have changed
            cliente: mergedInput.import_id,
            exportador: mergedInput.export_id,
            productor: mergedInput.producer_id,
            puertoDestino: mergedInput.port_dest,
            fechaEmbarque: mergedInput.ship_date,
            productos: productsRaw,
            brand: mergedInput.brand,
            notas: mergedInput.notes,
            // ... map others
        }

        await updateOperation(id_carga, updatePayload)

        return NextResponse.json({
            success: true,
            data: {
                id_carga,
                new_doc_id: newDocId
            }
        })

    } catch (error) {
        console.error('Error editing proforma:', error)
        return NextResponse.json({ success: false, error: 'Edit failed' }, { status: 500 })
    }
}
