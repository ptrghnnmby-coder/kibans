'use client'

import React, { useState, useEffect } from 'react'
import { getAllOperations, getAllProductos } from '@/lib/googleSheets'
import Link from 'next/link'
import { Ship, MapPin, Calendar, Package, ExternalLink, TrendingUp, Filter, Eye, ChevronRight, User, Building2, Anchor, Loader2 } from 'lucide-react'
import { detectCarrier, getCarrierTrackingURL } from '@/lib/containerTracking'
import { USER_MAP, getResponsableName, Operacion, Producto } from '@/lib/sheets-types'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function EmbarquesPage() {
    const router = useRouter()
    const [allOperations, setAllOperations] = useState<Operacion[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/operaciones/all')
                const data = await res.json()
                if (data.success) {
                    setAllOperations(data.data)
                }
            } catch (error) {
                console.error('Error fetching operations:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    // Filter only operations with container numbers and sort by LOADED DATE (LD)
    const embarques = allOperations
        .filter(op => op.containerNumber && op.containerNumber.trim() !== '')
        .sort((a, b) => {
            // Sort by loadedDate (LD) - Oldest to Newest as requested
            const dateA = a.loadedDate ? new Date(a.loadedDate).getTime() : Infinity
            const dateB = b.loadedDate ? new Date(b.loadedDate).getTime() : Infinity

            if (dateA !== dateB) return dateA - dateB

            // Fallback to ID for consistent sorting
            const parseId = (idStr: string | undefined) => {
                if (!idStr) return { num: 0, year: 0 }
                const parts = idStr.split('-')
                if (parts.length < 2) return { num: 0, year: 0 }
                return { num: parseInt(parts[0]) || 0, year: parseInt(parts[1]) || 0 }
            }
            const idA = parseId(a.id)
            const idB = parseId(b.id)
            if (idA.year !== idB.year) return idB.year - idA.year
            return idB.num - idA.num
        })

    // Group by status
    const enTransito = embarques.filter(op => op.trackingStatus === 'IN_TRANSIT')
    const llegados = embarques.filter(op => op.trackingStatus === 'ARRIVED')
    const demorados = embarques.filter(op => op.trackingStatus === 'DELAYED')

    if (loading) {
        return (
            <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        )
    }

    return (
        <div className="dashboard-container animate-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Tracking de Operaciones</h1>
                    <p className="page-subtitle">
                        Seguimiento integral de cargas y logística 🚢
                    </p>
                </div>
            </header>

            {/* Stats Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ borderLeft: '4px solid var(--blue)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                En Tránsito
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                {enTransito.length}
                            </div>
                        </div>
                        <Ship size={24} color="var(--blue)" style={{ opacity: 0.5 }} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--green)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                Llegados
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                {llegados.length}
                            </div>
                        </div>
                        <Package size={24} color="var(--green)" style={{ opacity: 0.5 }} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--red)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                Demorados
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                {demorados.length}
                            </div>
                        </div>
                        <TrendingUp size={24} color="var(--red)" style={{ opacity: 0.5 }} />
                    </div>
                </div>

                <div className="card" style={{ borderLeft: '4px solid var(--accent)', padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                            <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 'var(--space-2)' }}>
                                Total Activos
                            </div>
                            <div style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800 }}>
                                {embarques.length}
                            </div>
                        </div>
                        <Anchor size={24} color="var(--accent)" style={{ opacity: 0.5 }} />
                    </div>
                </div>
            </div>

            {/* Embarques Table */}
            <div className="card" style={{ padding: 0 }}>
                <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
                        Cargas en Seguimiento
                    </h2>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Ordenado por LD (Más antiguo primero)
                    </div>
                </div>

                {embarques.length === 0 ? (
                    <div style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <Ship size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.3 }} />
                        <p>No hay embarques registrados con número de contenedor</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: 'var(--space-4)' }}>Operación</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Responsable</th>
                                    <th style={{ padding: 'var(--space-4)' }}>LD (Loaded)</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Contenedor / Naviera</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Entidades</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Ruta</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Estado</th>
                                    <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {embarques.map(embarque => {
                                    const carrier = detectCarrier(embarque.containerNumber!)
                                    const trackingURL = getCarrierTrackingURL(embarque.containerNumber!, carrier)

                                    const statusColors: Record<string, string> = {
                                        IN_TRANSIT: 'var(--blue)',
                                        ARRIVED: 'var(--green)',
                                        DELAYED: 'var(--red)',
                                        DEPARTED: 'var(--cyan)',
                                        LOADING: 'var(--orange)',
                                        UNKNOWN: 'var(--gray)'
                                    }

                                    return (
                                        <tr
                                            key={embarque.id}
                                            className="clickable-row group"
                                            onClick={() => router.push(`/operaciones/${embarque.id}`)}
                                        >
                                            {/* 1. Operación */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '14px', fontFamily: 'var(--font-mono)' }}>
                                                    {embarque.id}
                                                </div>
                                            </td>

                                            {/* 2. Responsable */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {(() => {
                                                        const responsableName = getResponsableName(embarque.userId)
                                                        const user = Object.values(USER_MAP).find(u => u.name === responsableName)
                                                        return user?.avatar ? (
                                                            <div className="avatar-container" style={{ margin: 0, width: 24, height: 24 }}>
                                                                <img src={user.avatar} alt={user.name} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--surface-raised)', fontSize: '10px' }}>
                                                                <User size={12} />
                                                            </div>
                                                        )
                                                    })()}
                                                    <span style={{ fontSize: 'var(--font-size-sm)' }}>{getResponsableName(embarque.userId)}</span>
                                                </div>
                                            </td>

                                            {/* 3. LOADED DATE (LD) */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Calendar size={14} style={{ color: embarque.loadedDate ? 'var(--blue)' : 'var(--text-dim)', opacity: 0.7 }} />
                                                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: embarque.loadedDate ? 'var(--text)' : 'var(--text-dim)' }}>
                                                        {embarque.loadedDate ? new Date(embarque.loadedDate).toLocaleDateString() : 'N/A'}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 4. Contenedor / Naviera */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <code style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)', background: 'var(--surface-raised)', padding: '2px 6px', borderRadius: 'var(--radius-sm)' }}>
                                                            {embarque.containerNumber}
                                                        </code>
                                                        <a
                                                            href={trackingURL}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="hover:text-accent transition-colors"
                                                            title="Ver tracking externo"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink size={14} style={{ opacity: 0.5 }} />
                                                        </a>
                                                    </div>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: carrier === 'MSC' ? 'var(--blue)' : 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {carrier}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* 5. Entidades */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cyan)', flexShrink: 0 }} title="Importador" />
                                                        <div style={{ fontSize: '12px', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', fontWeight: 600 }}>
                                                            {embarque.cliente || '-'}
                                                        </div>
                                                    </div>
                                                    {embarque.exportador && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} title="Exportador" />
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                                                {embarque.exportador}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {embarque.productor && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} title="Productor" />
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                                                {embarque.productor}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* 6. Ruta */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <div style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontWeight: 600 }}>{embarque.portLoad || 'POL'}</span>
                                                        <TrendingUp size={10} style={{ transform: 'rotate(90deg)', opacity: 0.5, color: 'var(--text-muted)' }} />
                                                        <span style={{ fontWeight: 600 }}>{embarque.puertoDestino || 'POD'}</span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 500 }}>
                                                        ETA: {embarque.eta ? new Date(embarque.eta).toLocaleDateString() : (embarque.arrivalDate ? new Date(embarque.arrivalDate).toLocaleDateString() : '-')}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* 7. Estado */}
                                            <td style={{ padding: 'var(--space-4)' }}>
                                                <span
                                                    className="badge"
                                                    style={{
                                                        background: 'var(--accent-soft)',
                                                        color: 'var(--accent)',
                                                        border: '1px solid var(--accent-soft)',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        textTransform: 'uppercase',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px'
                                                    }}
                                                >
                                                    {embarque.estado || 'PAUSADO'}
                                                </span>
                                            </td>

                                            {/* 8. Acciones */}
                                            <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <Link
                                                        href={`/operaciones/${embarque.id}`}
                                                        style={{
                                                            padding: '6px 14px',
                                                            borderRadius: 'var(--radius-md)',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            background: 'var(--surface-raised)',
                                                            border: '1px solid var(--border)',
                                                            color: 'var(--text)',
                                                            textDecoration: 'none',
                                                            transition: 'all 0.2s',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: '0.02em'
                                                        }}
                                                        className="hover:bg-accent/10 hover:border-accent/30 hover:scale-105"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <span>Ver</span>
                                                        <ChevronRight size={14} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
