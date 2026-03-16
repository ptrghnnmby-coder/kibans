import { getAllProductos } from '@/lib/googleSheets'
import { ProductsView } from '@/components/ProductsView'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function ProductosPage() {
    const session = await getServerSession(authOptions)
    const isDemo = (session?.user as any)?.isDemo

    let productos = []
    if (isDemo) {
        const { MOCK_PRODUCTOS } = await import('@/lib/mockData')
        productos = MOCK_PRODUCTOS
    } else {
        productos = await getAllProductos()
    }

    return <ProductsView initialProducts={productos} />
}
