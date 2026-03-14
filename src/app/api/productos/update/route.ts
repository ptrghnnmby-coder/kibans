import { NextResponse } from 'next/server'
import { createProducto } from '@/lib/googleSheets' // Assuming we can use createProducto with OVERWRITE if implemented, or we need a new shelf
// For now, I'll implement a simple "append" but wait, update should OVERWRITE.
// I need an updateProduct in googleSheets.ts.

import { updateProducto } from '@/lib/googleSheets'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const { id, ...updates } = body

        if (!id) {
            return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 })
        }

        await updateProducto(id, updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Update error:', error)
        return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
    }
}
