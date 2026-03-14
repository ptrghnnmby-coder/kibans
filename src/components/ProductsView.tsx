'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Plus, X, Search, Edit2, Fish, Box, Globe, Eye, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from './ui/Toast'
import { ProductForm } from './ProductForm'

const SPECIES_ICON_MAP: Record<string, string> = {
    'Croacker': '/icons/species/croacker_v2.png',
    'Flounder': '/icons/species/flounder_v2.png',
    'Whiting': '/icons/species/whiting_v2.png',
    'Hake': '/icons/species/hake_v2.png',
    'Sea Frozen Hake': '/icons/species/hake_v2.png',
    'Squid': '/icons/species/squid_v2.png',
    'Sea Frozen Squid': '/icons/species/squid_v2.png',
    'Land Frozen Squid': '/icons/species/squid_v2.png',
    'Red Shrimp': '/icons/species/red_shrimp_v2.png',
    'Smooth Hound': '/icons/species/smooth_hound_v2.png',
    'Sea Trout': '/icons/species/sea_trout_v2.png',
    'Tilapia': '/icons/species/tilapia_v2.png',
    'Panga': '/icons/species/panga_v2.png',
    'Red Porgy': '/icons/species/red_porgy_v2.png',
    'Yellow Croaker': '/icons/species/yellow_croaker_v2.png'
}

interface Producto {
    id: string
    especie: string
    corte: string
    calibre: string
    packing: string
    tamanoCaja?: string
    nombreCientifico?: string
    origen?: string
    descripcion?: string
    defaultTemp?: string
    defaultVent?: string
    defaultDrains?: string
    defaultHumidity?: string
}

interface ProductsViewProps {
    initialProducts: Producto[]
}

export function ProductsView({ initialProducts }: ProductsViewProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')
    // Eliminado: const [selectedSpecies, setSelectedSpecies] ... ya no se usa porque todo está abierto
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null)
    const { showToast } = useToast()

    // State management is now handled inside ProductForm component

    // Helper Normalization
    const normalizeKey = (str: string) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
    const titleCase = (str: string) => str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase()

    // Grouping Logic
    const filteredProducts = initialProducts.filter(p =>
        p.especie.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.corte.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const productsBySpecies = filteredProducts.reduce((acc, product) => {
        const rawSpecies = product.especie || 'Sin Especie'
        const key = titleCase(rawSpecies)
        const normalize = normalizeKey(key)

        const existingKey = Object.keys(acc).find(k => normalizeKey(k) === normalize)
        const finalKey = existingKey || key

        if (!acc[finalKey]) acc[finalKey] = []
        acc[finalKey].push(product)
        return acc
    }, {} as Record<string, Producto[]>)

    const speciesList = Object.keys(productsBySpecies).sort()

    // Icon helper
    const getSpeciesIconPath = (species: string) => {
        // Try exact match first
        if (SPECIES_ICON_MAP[species]) return SPECIES_ICON_MAP[species]

        // Try case-insensitive match
        const key = Object.keys(SPECIES_ICON_MAP).find(k => k.toLowerCase() === species.toLowerCase())
        if (key) return SPECIES_ICON_MAP[key]

        return null
    }

    const getFallbackIcon = (species: string) => {
        if (species.toLowerCase().includes('servicio')) return Box
        return Fish
    }

    // Handlers
    const handleSave = async (formData: any) => {
        setIsSubmitting(true)
        try {
            const url = editingProduct ? `/api/productos/${editingProduct.id}/update` : '/api/productos/create'
            const method = 'POST' // Assuming both use POST per existing logic

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })
            const data = await res.json()

            if (res.ok && data.success) {
                if (editingProduct) {
                    showToast('Producto actualizado con éxito', 'success')
                } else {
                    const created = data.data.filter((i: any) => i.esNuevo).length
                    const existing = data.data.length - created
                    showToast(`Proceso completado: ${created} nuevos, ${existing} existentes`, 'success')
                }
                setIsModalOpen(false)
                setEditingProduct(null)
                router.refresh()
            } else {
                showToast(`Error: ${data.error || 'Error desconocido'}`, 'error')
            }
        } catch (error) {
            console.error(error)
            showToast('Error de conexión', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }






    const openEdit = (product: Producto) => {
        setEditingProduct(product)
        setIsModalOpen(true)
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h1 className="dashboard-title">Catálogo de Productos</h1>
                    <p className="dashboard-subtitle">Gestioná tu oferta exportable ({initialProducts.length} items)</p>
                </div>
                <button
                    onClick={() => {
                        setEditingProduct(null)
                        setIsModalOpen(true)
                    }}
                    className="btn btn-primary"
                >
                    <Plus size={18} />
                    Nuevo Producto
                </button>
            </header>

            {/* Search Bar */}
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por especie, corte o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Listado Expandido (Nuevo Diseño) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                {speciesList.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 card">
                        No se encontraron productos.
                    </div>
                ) : (
                    speciesList.map(species => {
                        const iconPath = getSpeciesIconPath(species)
                        const FallbackIcon = getFallbackIcon(species)

                        return (
                            <div key={species} className="species-group animate-in">
                                {/* Encabezado de Sección (Estilo Integrado) */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                    marginBottom: 'var(--space-4)',
                                    paddingBottom: 'var(--space-3)',
                                    borderBottom: '3px solid var(--border)',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 42,
                                        height: 42,
                                        background: 'var(--surface-raised)',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)',
                                        boxShadow: 'var(--shadow-sm)'
                                    }}>
                                        {iconPath ? (
                                            <Image
                                                src={iconPath}
                                                alt={species}
                                                width={28}
                                                height={28}
                                                style={{
                                                    objectFit: 'contain',
                                                    filter: 'brightness(1.2)'
                                                }}
                                            />
                                        ) : (
                                            <div style={{ color: 'var(--accent)' }}>
                                                <FallbackIcon size={24} />
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h2 style={{
                                            fontSize: '22px',
                                            fontWeight: 900,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.1em',
                                            color: 'var(--foreground)',
                                            margin: 0,
                                            lineHeight: 1
                                        }}>
                                            {species}
                                        </h2>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                color: 'var(--text-muted)',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Catálogo • {productsBySpecies[species].length} variantes
                                            </span>
                                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', opacity: 0.5 }}></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tabla de Datos (Estilo Dark Premium) */}
                                <div className="card" style={{ padding: 0, overflow: 'hidden', background: 'var(--surface)' }}>
                                    
                                    {/* --- DESKTOP VIEW --- */}
                                    <div className="table-container hidden md:block">
                                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '150px' }}>ID</th>
                                                    <th style={{ width: '25%' }}>Corte / Descripción</th>
                                                    <th style={{ width: '20%' }}>Calibre</th>
                                                    <th style={{ width: '20%' }}>Packing</th>
                                                    <th style={{ width: '10%' }}>Origen</th>
                                                    <th style={{ width: '120px' }} className="text-right"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productsBySpecies[species].map((prod, index) => (
                                                    <tr key={prod.id} style={{
                                                        borderBottom: index === productsBySpecies[species].length - 1 ? 'none' : '1px solid var(--border)',
                                                        transition: 'background 0.2s',
                                                        background: 'var(--surface)'
                                                    }} className="clickable-row">
                                                        <td className="cell-op-id">
                                                            {prod.id}
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '14px', marginBottom: '4px' }}>{prod.corte}</div>
                                                            {prod.nombreCientifico && (
                                                                <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                                                    {prod.nombreCientifico}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <span style={{ fontSize: '13px', color: 'var(--amber)', fontWeight: 600 }}>{prod.calibre}</span>
                                                        </td>
                                                        <td style={{ padding: '16px', fontSize: '13px', color: 'var(--text)' }}>
                                                            {prod.packing}
                                                            {prod.tamanoCaja && <div style={{ color: 'var(--text-dim)', fontSize: '12px', marginTop: '2px' }}>{prod.tamanoCaja}</div>}
                                                        </td>
                                                        <td style={{ padding: '16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--text-muted)' }}>
                                                                <Globe size={14} color="var(--text-dim)" />
                                                                {prod.origen || 'Argentina'}
                                                            </div>
                                                        </td>
                                                        <td style={{ padding: '16px', textAlign: 'right' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                                <button
                                                                    className="icon-btn"
                                                                    title="Ver Detalle"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        e.preventDefault()
                                                                        router.push(`/productos/${prod.id}`)
                                                                    }}
                                                                    style={{ padding: '8px', color: 'var(--text-muted)' }}
                                                                >
                                                                    <Eye size={16} />
                                                                </button>
                                                                <button
                                                                    className="icon-btn"
                                                                    title="Editar"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        e.preventDefault()
                                                                        openEdit(prod)
                                                                    }}
                                                                    style={{ padding: '8px', color: 'var(--text-muted)' }}
                                                                >
                                                                    <Edit2 size={16} />
                                                                </button>
                                                                {/* Delete button moved to Detail Page */}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* --- MOBILE VIEW --- */}
                                    <div className="flex flex-col md:hidden p-3 gap-3" style={{ background: 'var(--bg)' }}>
                                        {productsBySpecies[species].map((prod, index) => (
                                            <div 
                                                key={prod.id} 
                                                className="flex flex-col rounded-xl border p-4 shadow-sm"
                                                style={{
                                                    background: 'var(--surface-raised)',
                                                    borderColor: 'var(--border)'
                                                }}
                                                onClick={(e) => {
                                                    router.push(`/productos/${prod.id}`)
                                                }}
                                            >
                                                {/* Header ID */}
                                                <div className="flex items-center justify-between mb-2">
                                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                                        {prod.id}
                                                    </span>
                                                </div>

                                                {/* Title & Desc */}
                                                <div style={{ fontWeight: 800, color: 'var(--text)', fontSize: '16px', lineHeight: 1.2 }}>
                                                    {prod.corte}
                                                </div>
                                                {prod.nombreCientifico && (
                                                    <div style={{ fontSize: '13px', color: 'var(--text-dim)', fontStyle: 'italic', marginTop: '2px' }}>
                                                        {prod.nombreCientifico}
                                                    </div>
                                                )}

                                                {/* Tags Row */}
                                                <div className="flex flex-wrap items-center gap-2 mt-4">
                                                    {prod.calibre && (
                                                        <div style={{
                                                            fontSize: '13px', fontWeight: 700, color: 'var(--amber)',
                                                            padding: '4px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)'
                                                        }}>
                                                            {prod.calibre}
                                                        </div>
                                                    )}
                                                    {prod.packing && (
                                                        <div style={{ fontSize: '13px', color: 'var(--text-dim)' }}>
                                                            {prod.packing}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Secondary Row */}
                                                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                                                    <div className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                        <Globe size={13} />
                                                        {prod.origen || 'Argentina'}
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            className="icon-btn"
                                                            title="Ver Detalle"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                e.preventDefault()
                                                                router.push(`/productos/${prod.id}`)
                                                            }}
                                                            style={{ padding: '6px', color: 'var(--text-dim)' }}
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        <button
                                                            className="icon-btn"
                                                            title="Editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                e.preventDefault()
                                                                openEdit(prod)
                                                            }}
                                                            style={{ padding: '6px', color: 'var(--text-dim)' }}
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(4px)'
                }}>
                    <div className="card animate-in" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-6)', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div className="stat-icon blue" style={{ width: 48, height: 48 }}>
                                    <Plus size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800 }}>{editingProduct ? 'Editar Producto' : 'Nuevas Variantes'}</h2>
                                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                        {editingProduct ? 'Modificar datos del item' : 'Generación masiva de catálogo'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="icon-btn">
                                <X size={24} />
                            </button>
                        </div>

                        <ProductForm
                            initialData={editingProduct || undefined}
                            onSubmit={handleSave}
                            onCancel={() => setIsModalOpen(false)}
                            isSubmitting={isSubmitting}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
