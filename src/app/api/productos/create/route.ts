import { NextResponse } from 'next/server'
import { createProductosBatch, getAllProductos } from '@/lib/googleSheets'
import { generateProductBatch, ProductInput } from '@/lib/productLogic'

export async function POST(req: Request) {
    try {
        const body = await req.json() // Expecting: { especie, cortes, calibres, packings, origenes, ... }

        // Input validation to match ProductInput interface
        const input: ProductInput = {
            especie: body.especie || '',
            cortes: typeof body.corte === 'string' ? body.corte.split(',').map((s: string) => s.trim()) : (body.cortes || []),
            calibres: typeof body.calibre === 'string' ? body.calibre.split(',').map((s: string) => s.trim()) : (body.calibres || []),
            packings: typeof body.packing === 'string' ? body.packing.split(',').map((s: string) => s.trim()) : (body.packings || []),
            origenes: typeof body.origen === 'string' ? body.origen.split(',').map((s: string) => s.trim()) : (body.origenes || []),
            tamanoCaja: body.tamanoCaja || 'Bulk',
            nombreCientifico: body.nombreCientifico || '',
            defaultTemp: body.defaultTemp || '',
            defaultVent: body.defaultVent || '',
            defaultDrains: body.defaultDrains || '',
            defaultHumidity: body.defaultHumidity || ''
        }

        if (!input.especie || input.cortes.length === 0 || input.packings.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Faltan campos (Especie, Cortes, Packing)' },
                { status: 400 }
            )
        }

        // 1. Get existing products to check duplicates & sequence
        const existingProducts = await getAllProductos()

        // 2. Generate Batch
        const batchParams = existingProducts.map(p => ({
            id: p.id,
            especie: p.especie,
            corte: p.corte,
            calibre: p.calibre,
            packing: p.packing,
            tamanoCaja: p.tamanoCaja || '',
            origen: p.origen || ''
        }))

        // @ts-ignore
        const generatedBatch = generateProductBatch(input, batchParams)

        const newItems = generatedBatch.filter(i => i.esNuevo)

        // 3. Save to Sheets
        if (newItems.length > 0) {
            // @ts-ignore
            await createProductosBatch(newItems)
        }

        return NextResponse.json({
            success: true,
            data: generatedBatch
        })
    } catch (error) {
        console.error('Error in create product API:', error)
        return NextResponse.json(
            { success: false, error: 'Error interno del servidor', details: String(error) },
            { status: 500 }
        )
    }
}
