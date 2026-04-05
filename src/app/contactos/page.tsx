'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { Search, Plus, MapPin, Mail, Phone, Eye } from 'lucide-react'
import Link from 'next/link'

import { Contacto } from '@/lib/sheets-types'
import { AIFeatureBadge } from '@/components/AIFeatureBadge'

export default function ContactosPage() {
    const [contactos, setContactos] = useState<Contacto[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filtro, setFiltro] = useState<string>('todos')
    const [busqueda, setBusqueda] = useState('')

    useEffect(() => {
        fetchContactos()
    }, [])

    const fetchContactos = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/contactos')
            const data = await response.json()

            if (data.success) {
                setContactos(data.data)
            } else {
                setError(data.error || 'Error al cargar contactos')
            }
        } catch (err) {
            setError('Error de conexión con el servidor')
            console.error('Error fetching contacts:', err)
        } finally {
            setLoading(false)
        }
    }

    // Filtrar contactos
    const contactosFiltrados = contactos.filter(c => {
        const matchFiltro = filtro === 'todos' || (
            filtro === 'importador' ? c.isImporter :
                filtro === 'exportador' ? c.isExporter :
                    filtro === 'productor' ? c.isProducer :
                        filtro === 'forwarder' ? c.isForwarder :
                            false
        )
        const matchBusqueda =
            c.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.nombreContacto?.toLowerCase().includes(busqueda.toLowerCase()) ||
            c.email?.toLowerCase().includes(busqueda.toLowerCase())
        return matchFiltro && matchBusqueda
    })

    // Contar por tipo
    const stats = {
        importadores: contactos.filter((c: Contacto) => c.isImporter).length,
        exportadores: contactos.filter((c: Contacto) => c.isExporter).length,
        productores: contactos.filter((c: Contacto) => c.isProducer).length,
        forwarders: contactos.filter((c: Contacto) => c.isForwarder).length,
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Contactos</h1>
                    <p className="page-subtitle">Gestiona importadores, exportadores, productores y forwarders</p>
                </div>
                <AIFeatureBadge 
                    title="Enriquecimiento de Datos" 
                    description="Tess limpia y completa automáticamente los perfiles comerciales analizando bases de datos externas y documentos históricos para asegurar que el CUIT y los datos de contacto estén siempre al día." 
                    position="bottom"
                />
                <Link href="/contactos/nuevo" className="btn btn-primary">
                    <Plus size={18} />
                    Nuevo Contacto
                </Link>
            </div>

            {/* Filtros y Búsqueda */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, empresa o email..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        {[
                            { key: 'todos', label: 'Todos', color: 'var(--accent)' },
                            { key: 'importador', label: 'Importadores', color: 'var(--cyan)' },
                            { key: 'exportador', label: 'Exportadores', color: 'var(--green)' },
                            { key: 'productor', label: 'Productores', color: 'var(--purple)' },
                            { key: 'forwarder', label: 'Forwarders', color: '#f59e0b' },
                        ].map(({ key, label, color }) => (
                            <button
                                key={key}
                                onClick={() => setFiltro(key)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '8px 14px',
                                    borderRadius: 'var(--radius-md)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 600,
                                    fontFamily: 'var(--font-family)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    border: filtro === key ? `2px solid ${color}` : '2px solid transparent',
                                    background: filtro === key ? `${color}22` : 'var(--surface-raised)',
                                    color: filtro === key ? color : 'var(--text-muted)',
                                    boxShadow: filtro === key ? `0 0 0 1px ${color}44` : 'none',
                                }}
                            >
                                <span style={{
                                    width: 7, height: 7, borderRadius: '50%',
                                    background: color, display: 'inline-block',
                                    opacity: filtro === key ? 1 : 0.4, flexShrink: 0,
                                }} />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stats rápidos — 4 columnas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                {[
                    { label: 'Importadores', value: stats.importadores, color: 'var(--cyan)' },
                    { label: 'Exportadores', value: stats.exportadores, color: 'var(--green)' },
                    { label: 'Productores', value: stats.productores, color: 'var(--purple)' },
                    { label: 'Forwarders', value: stats.forwarders, color: '#f59e0b' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="summary-card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-2)' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                            <div className="summary-label" style={{ margin: 0 }}>{label}</div>
                        </div>
                        <div className="summary-value" style={{ color }}>{value}</div>
                    </div>
                ))}
            </div>

            {/* Estado de carga */}
            {loading && (
                <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                    <div style={{
                        display: 'inline-block', width: 40, height: 40,
                        border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
                        borderRadius: '50%', animation: 'spin 1s linear infinite',
                    }} />
                    <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)' }}>
                        Cargando contactos desde Google Sheets...
                    </p>
                    <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="card" style={{
                    textAlign: 'center', padding: 'var(--space-6)',
                    background: 'var(--red-soft)', border: '1px solid rgba(239,68,68,0.3)',
                }}>
                    <p style={{ color: 'var(--red)' }}>⚠️ {error}</p>
                    <button className="btn btn-secondary" onClick={fetchContactos} style={{ marginTop: 'var(--space-4)' }}>
                        Reintentar
                    </button>
                </div>
            )}

            {/* Contenido principal */}
            {!loading && !error && (
                <>
                    {/* Contador */}
                    {contactosFiltrados.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--font-size-sm)', color: 'var(--text-dim)' }}>
                            {contactosFiltrados.length} de {contactos.length} contactos
                        </div>
                    )}

                    {/* ── Vista Tabla (desktop) ── */}
                    <div className="table-container contacts-table-desktop" style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <colgroup>
                                <col style={{ width: '160px' }} />{/* ID + Categoría */}
                                <col />{/* Empresa — flexible */}
                                <col style={{ width: '200px' }} />{/* Contacto */}
                                <col style={{ width: '180px' }} />{/* Dirección & Tel */}
                                <col style={{ width: '60px' }} />{/* Ver */}
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>ID / Categoría</th>
                                    <th>Empresa</th>
                                    <th>Contacto</th>
                                    <th>Dirección &amp; Teléfono</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {contactosFiltrados.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-10)' }}>
                                            {busqueda || filtro !== 'todos'
                                                ? 'No se encontraron contactos con ese filtro'
                                                : 'No hay contactos todavía'}
                                        </td>
                                    </tr>
                                ) : (
                                    contactosFiltrados.map((contacto) => (
                                        <tr key={contacto.id}>

                                            {/* ID + Categorías */}
                                            <td style={{ verticalAlign: 'middle', paddingRight: '8px' }}>
                                                <code style={{
                                                    display: 'block',
                                                    background: 'var(--surface-raised)',
                                                    padding: '2px 7px',
                                                    borderRadius: '4px',
                                                    fontFamily: 'var(--font-mono)',
                                                    fontSize: '11px',
                                                    color: 'var(--text-dim)',
                                                    whiteSpace: 'nowrap',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    marginBottom: '5px',
                                                }}>
                                                    {contacto.id}
                                                </code>
                                                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                                                    {contacto.isImporter && <span className="badge badge-importador">IMP</span>}
                                                    {contacto.isExporter && <span className="badge badge-exportador">EXP</span>}
                                                    {contacto.isProducer && <span className="badge badge-productor">PROD</span>}
                                                    {contacto.isForwarder && <span className="badge badge-flete">FWD</span>}
                                                </div>
                                            </td>

                                            {/* Empresa */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{
                                                    fontWeight: 700,
                                                    fontSize: 'var(--font-size-base)',
                                                    color: 'var(--text)',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {contacto.empresa}
                                                </div>
                                                {contacto.pais && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {contacto.pais}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Contacto */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                {(contacto.nombreContacto || contacto.apellido) && (
                                                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text)', fontWeight: 500, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {contacto.nombreContacto}{contacto.apellido ? ` ${contacto.apellido}` : ''}
                                                    </div>
                                                )}
                                                {contacto.email && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <Mail size={11} style={{ flexShrink: 0, color: 'var(--accent)', opacity: 0.7 }} />
                                                        <span style={{
                                                            fontSize: '11px', color: 'var(--text-muted)',
                                                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                        }}>
                                                            {contacto.email}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Dirección & Teléfono */}
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    {contacto.telefono && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Phone size={11} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                                                            <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contacto.telefono}</span>
                                                        </div>
                                                    )}
                                                    {contacto.direccion && (
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                            <MapPin size={11} style={{ flexShrink: 0, color: 'var(--text-muted)', marginTop: '2px' }} />
                                                            <span style={{
                                                                fontSize: '11px', color: 'var(--text-dim)',
                                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                            }}>{contacto.direccion}</span>
                                                        </div>
                                                    )}
                                                    {!contacto.telefono && !contacto.direccion && (
                                                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>—</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Ver */}
                                            <td style={{ textAlign: 'center', verticalAlign: 'middle', paddingLeft: '4px', paddingRight: '8px' }}>
                                                <Link href={`/contactos/${contacto.id}`} className="btn btn-secondary btn-small" title="Ver detalle" style={{ flexShrink: 0 }}>
                                                    <Eye size={15} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Vista Tarjetas (móvil) ── */}
                    <div className="contacts-cards-mobile">
                        {contactosFiltrados.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                                {busqueda || filtro !== 'todos' ? 'No se encontraron contactos con ese filtro' : 'No hay contactos todavía'}
                            </div>
                        ) : (
                            contactosFiltrados.map((contacto) => (
                                <div key={contacto.id} style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 'var(--radius-lg)',
                                    padding: 'var(--space-4)',
                                    marginBottom: 'var(--space-3)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                        <code style={{ background: 'var(--surface-raised)', padding: '2px 8px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-dim)' }}>
                                            {contacto.id}
                                        </code>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {contacto.isImporter && <span className="badge badge-importador">IMP</span>}
                                            {contacto.isExporter && <span className="badge badge-exportador">EXP</span>}
                                            {contacto.isProducer && <span className="badge badge-productor">PROD</span>}
                                            {contacto.isForwarder && <span className="badge badge-flete">FWD</span>}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, fontSize: 'var(--font-size-base)', color: 'var(--text)', marginBottom: '2px' }}>{contacto.empresa}</div>
                                    {(contacto.nombreContacto || contacto.apellido) && (
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-dim)', marginBottom: 'var(--space-2)' }}>
                                            {contacto.nombreContacto}{contacto.apellido ? ` ${contacto.apellido}` : ''}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: 'var(--space-3)' }}>
                                        {contacto.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Mail size={12} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{contacto.email}</span>
                                            </div>
                                        )}
                                        {contacto.telefono && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Phone size={12} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{contacto.telefono}</span>
                                            </div>
                                        )}
                                        {contacto.direccion && (
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                                <MapPin size={12} style={{ flexShrink: 0, color: 'var(--text-muted)', marginTop: '2px' }} />
                                                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>{contacto.direccion}</span>
                                            </div>
                                        )}
                                    </div>
                                    <Link href={`/contactos/${contacto.id}`} className="btn btn-secondary btn-small" style={{ width: '100%', justifyContent: 'center' }}>
                                        <Eye size={14} /> Ver detalle
                                    </Link>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
