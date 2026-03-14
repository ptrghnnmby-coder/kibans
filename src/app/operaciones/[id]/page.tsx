import { getOperationById, getAllProductos, getAllContactos } from '@/lib/googleSheets'
import Link from 'next/link'
import OperationDetailView from '@/components/OperationDetailView'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function OperacionDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    const isDemo = (session?.user as any)?.isDemo

    if (isDemo) {
        const { MOCK_OPERACIONES, MOCK_CONTACTOS, MOCK_PRODUCTOS } = await import('@/lib/mockData')
        const op = MOCK_OPERACIONES.find(o => o.id === params.id)

        if (!op) {
            return (
                <div className="dashboard-container">
                    <div className="alert alert-warning">Operación de Demo no encontrada: {params.id}</div>
                    <Link href="/operaciones" className="btn btn-secondary mt-4">Volver</Link>
                </div>
            )
        }

        return (
            <OperationDetailView
                initialOp={op}
                allProducts={MOCK_PRODUCTOS as any}
                allContacts={MOCK_CONTACTOS}
            />
        )
    }

    // getOperationById searches Master Input FIRST, then falls back to Historial
    // This ensures liquidated operations (in Historial) are also found
    const [op, allProducts, allContacts] = await Promise.all([
        getOperationById(params.id),
        getAllProductos(),
        getAllContactos()
    ])

    if (!op) {
        return (
            <div className="dashboard-container">
                <div className="alert alert-warning">Operación no encontrada: {params.id}</div>
                <Link href="/operaciones" className="btn btn-secondary mt-4">Volver</Link>
            </div>
        )
    }

    return (
        <OperationDetailView
            initialOp={op}
            allProducts={allProducts}
            allContacts={allContacts}
        />
    )
}
