
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Operacion } from '@/lib/sheets-types'
import { Calendar, Ship, ArrowRight, Package } from 'lucide-react'
import { ResizableTh } from './ui/ResizableTh'
import { UserAvatar } from './ui/UserAvatar'

interface RelatedOperationsProps {
    productId?: string
    contactId?: string // We can use one or the other
    title?: string
}

export function RelatedOperations({ productId, contactId, title = 'Operaciones Relacionadas' }: RelatedOperationsProps) {
    const [operations, setOperations] = useState<Operacion[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOperations = async () => {
            try {
                const params = new URLSearchParams()
                if (productId) params.append('productId', productId)
                if (contactId) params.append('contactId', contactId)

                const res = await fetch(`/api/operations/search?${params.toString()}`)
                const data = await res.json()

                if (data.success) {
                    setOperations(data.data)
                }
            } catch (error) {
                console.error('Error fetching related operations:', error)
            } finally {
                setLoading(false)
            }
        }

        if (productId || contactId) {
            fetchOperations()
        }
    }, [productId, contactId])

    if (loading) return <div className="p-4 text-sm text-gray-400">Cargando historial de operaciones...</div>

    if (operations.length === 0) {
        return (
            <div className="card" style={{ marginTop: 'var(--space-6)', padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>
                <p>No se encontraron operaciones relacionadas.</p>
            </div>
        )
    }

    return (
        <div className="card" style={{ marginTop: 'var(--space-6)', padding: '0', overflow: 'hidden' }}>
            <div className="card-header" style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--border)' }}>
                <h3 className="card-title" style={{ fontSize: '16px' }}>{title} ({operations.length})</h3>
            </div>

            <div className="table-container">
                <table className="table table-layout-fixed">
                    <thead>
                        <tr>
                            <ResizableTh tableKey="related-ops" columnKey="id" initialWidth={120}>Ref / ID</ResizableTh>
                            <ResizableTh tableKey="related-ops" columnKey="resp" initialWidth={100}>Resp.</ResizableTh>
                            <ResizableTh tableKey="related-ops" columnKey="fecha" initialWidth={180}>Fecha/Trip</ResizableTh>
                            <ResizableTh tableKey="related-ops" columnKey="cliente" initialWidth={350}>Importador</ResizableTh>
                            <ResizableTh tableKey="related-ops" columnKey="destino" initialWidth={250}>Destino</ResizableTh>
                            <ResizableTh tableKey="related-ops" columnKey="estado" initialWidth={200}>Estado</ResizableTh>
                            <th className="sticky-column-right" style={{ width: '80px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {operations.map(op => (
                            <tr key={op.id || Math.random()}>
                                <td>
                                    <div className="font-mono text-xs">{op.piNumber || op.id || '-'}</div>
                                    <div className="text-xs text-muted-foreground">{op.brand || '-'}</div>
                                </td>
                                <td>
                                    <UserAvatar email={op.userId || ''} size={24} variant="outlined" />
                                </td>
                                <td>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} className="text-muted-foreground" />
                                        <span>{op.fechaEmbarque || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        <Ship size={12} />
                                        <span className="truncate max-w-[100px]">{op.shipLane || '-'}</span>
                                    </div>
                                </td>
                                <td className="max-w-[150px] truncate" title={op.cliente}>
                                    {op.cliente || '-'}
                                </td>
                                <td>{op.puertoDestino || '-'}</td>
                                <td>
                                    <span className={`badge ${op.estado === '14. Operación Liquidada' ? 'badge-success' :
                                        op.estado === '1. Operación Creada' ? 'badge-warning' : 'badge-info'
                                        }`}>
                                        {op.estado}
                                    </span>
                                </td>
                                <td className="text-right sticky-column-right">
                                    <Link href={`/operaciones/${op.id || '#'}`} className="btn btn-ghost btn-small">
                                        <ArrowRight size={14} />
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
