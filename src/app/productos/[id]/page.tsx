import Link from 'next/link'
import { ArrowLeft, Box, Fish, Globe, Tag, Info, Snowflake, Thermometer, Wind, Droplet, Waves } from 'lucide-react'
import { getAllProductos } from '@/lib/googleSheets'
import { RelatedOperations } from '@/components/RelatedOperations'
import { notFound } from 'next/navigation'
import { DeleteProductButton } from '@/components/DeleteProductButton'

export const dynamic = 'force-dynamic'

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

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
    const productos = await getAllProductos()
    // Decode URI component just in case the ID has special characters
    const decodedId = decodeURIComponent(params.id)
    const product = productos.find(p => p.id === decodedId)

    if (!product) {
        notFound()
    }

    return (
        <div className="dashboard-container animate-in">
            {/* Page Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link href="/productos" className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: '4px' }}>
                            <h1 className="page-title" style={{ margin: 0 }}>{product.especie} {product.corte}</h1>
                            <span className="badge badge-info">{product.id}</span>
                        </div>
                        <p className="page-subtitle">
                            {product.nombreCientifico || 'Nombre científico no registrado'}
                            {product.origen && <span style={{ marginLeft: '8px' }}>• {product.origen}</span>}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <DeleteProductButton id={product.id} especie={product.especie} />
                </div>
            </div>

            {/* Main Content Card */}
            <div className="card" style={{ maxWidth: '1000px', margin: '0 auto', padding: 'var(--space-8)' }}>

                {/* Section 1: Specifications */}
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Box size={24} color="var(--accent)" />
                    <span>Especificaciones</span>
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-8)' }}>
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Calibre</label>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.calibre}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Packing</label>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.packing}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Tamaño Caja</label>
                        <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.tamanoCaja || '-'}</div>
                    </div>
                </div>

                {/* Section 2: Reefer Conditions */}
                {(product.defaultTemp || product.defaultVent || product.defaultDrains || product.defaultHumidity) && (
                    <>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-8) 0' }} />
                        <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Snowflake size={24} color="var(--accent)" />
                            <span>Condiciones de Transporte (Reefer)</span>
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-8)' }}>
                            {product.defaultTemp && (
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Thermometer size={14} /> Temperatura
                                    </label>
                                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.defaultTemp}</div>
                                </div>
                            )}
                            {product.defaultVent && (
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Wind size={14} /> Ventilación
                                    </label>
                                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.defaultVent}</div>
                                </div>
                            )}
                            {product.defaultDrains && (
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Waves size={14} /> Desagües
                                    </label>
                                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.defaultDrains}</div>
                                </div>
                            )}
                            {product.defaultHumidity && (
                                <div>
                                    <label style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Droplet size={14} /> Humedad
                                    </label>
                                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{product.defaultHumidity}</div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: 'var(--space-8) 0' }} />

                {/* Section 2: Description */}
                <h3 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Info size={24} color="var(--accent)" />
                    <span>Descripción Adicional</span>
                </h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '80ch' }}>
                    {product.descripcion || 'Sin descripción adicional registrada para este producto.'}
                </p>

            </div>

            {/* Related Operations */}
            <div style={{ maxWidth: '1000px', margin: 'var(--space-8) auto' }}>
                <RelatedOperations productId={product.id} />
            </div>
        </div>
    )
}

