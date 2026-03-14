import { getAllProductos } from '@/lib/googleSheets'
import { ProductsView } from '@/components/ProductsView'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
    const productos = await getAllProductos()

    return <ProductsView initialProducts={productos} />
}
