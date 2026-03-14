import { NextResponse } from 'next/server'
import { getAllProductos, deleteProducto } from '@/lib/googleSheets'

interface Context {
    params: {
        id: string
    }
}

export async function GET(request: Request, { params }: Context) {
    const { id } = params

    if (!id) {
        return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
    }

    try {
        const productos = await getAllProductos()
        const producto = productos.find(p => p.id === id)

        if (!producto) {
            return NextResponse.json({ success: false, error: 'Producto no encontrado' }, { status: 404 })
        }

        return NextResponse.json({ success: true, data: producto })
    } catch (error) {
        console.error('Error fetching product:', error)
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}

export async function DELETE(request: Request, { params }: Context) {
    const { id } = params

    if (!id) {
        return NextResponse.json({ success: false, error: 'Missing ID' }, { status: 400 })
    }

    try {
        await deleteProducto(id)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting product:', error)
        return NextResponse.json({ success: false, error: 'Error al eliminar producto' }, { status: 500 })
    }
}
