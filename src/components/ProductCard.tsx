'use client'

import React from 'react'
import {
    Package,
    Scissors,
    Ruler,
    Box,
    Trash2,
    DollarSign,
    ShoppingCart
} from 'lucide-react'
import { Producto } from '../lib/sheets-types'
import { SearchableSelect } from './ui/SearchableSelect'
import { parseNumeric, formatInputBankStyle, formatNumber } from '@/lib/numbers'

interface ProductCardProps {
    isEditing: boolean
    product: {
        id: string
        qty: number | string
        price: number | string
        purchasePrice: number | string
    }
    allProducts: Producto[]
    allContacts?: any[]
    onQuickCreateProduct?: () => void
    onChange?: (updates: Partial<{ id: string, qty: number | string, price: number | string, purchasePrice: number | string }>) => void
    onDelete?: () => void
}

export const ProductCard: React.FC<ProductCardProps> = ({
    isEditing,
    product,
    allProducts,
    allContacts,
    onQuickCreateProduct,
    onChange,
    onDelete
}) => {
    const fullProduct = allProducts.find(p => p.id === product.id)
    const productLabel = fullProduct?.especie || product.id || 'Nuevo Producto'

    const numQty = typeof product.qty === 'string' ? (parseFloat(product.qty) || 0) : product.qty
    const numPrice = typeof product.price === 'string' ? (parseFloat(product.price) || 0) : product.price
    const numPurchasePrice = typeof product.purchasePrice === 'string' ? (parseFloat(product.purchasePrice) || 0) : product.purchasePrice

    const totalPurchase = numQty * numPurchasePrice
    const totalSale = numQty * numPrice

    if (isEditing) {
        return (
            <div className="card" style={{
                padding: 'var(--space-5)',
                marginBottom: 'var(--space-4)',
                borderLeft: '4px solid var(--accent)',
                background: 'var(--surface-raised)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                    <div style={{ flex: 1, marginRight: 'var(--space-4)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <SearchableSelect
                                    options={allProducts.map(p => ({ id: p.id, label: `${p.id} | ${p.descripcion || p.especie}` }))}
                                    value={product.id}
                                    onChange={(id) => onChange?.({ id })}
                                    placeholder="Seleccionar producto..."
                                />
                            </div>
                            {onQuickCreateProduct && (
                                <button
                                    type="button"
                                    onClick={onQuickCreateProduct}
                                    className="bg-transparent border-none text-[var(--accent)] cursor-pointer p-2 flex items-center justify-center hover:bg-[var(--accent-soft)] rounded-md transition-colors"
                                    title="Crear nuevo producto"
                                >
                                    <Package size={18} />
                                    <span style={{ fontSize: '18px', marginLeft: '-4px', marginTop: '-8px', fontWeight: 900 }}>+</span>
                                </button>
                            )}
                        </div>
                    </div>
                    {onDelete && (
                        <button
                            onClick={onDelete}
                            className="btn btn-secondary"
                            style={{
                                padding: '8px',
                                color: 'var(--red)',
                                background: 'var(--red-soft)',
                                borderColor: 'transparent'
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-4)' }}>
                    <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Cantidad</label>
                        <input
                            type="text"
                            inputMode="decimal"
                            className="input-compact"
                            value={product.qty}
                            onChange={(e) => onChange?.({ qty: e.target.value })}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Precio Compra</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--amber)', fontSize: '12px' }}>$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-compact"
                                style={{ paddingLeft: '24px', color: 'var(--amber)' }}
                                value={product.purchasePrice}
                                onChange={(e) => onChange?.({ purchasePrice: formatInputBankStyle(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Precio Venta</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', fontSize: '12px' }}>$</span>
                            <input
                                type="text"
                                inputMode="decimal"
                                className="input-compact"
                                style={{ paddingLeft: '24px', color: 'var(--accent)' }}
                                value={product.price}
                                onChange={(e) => onChange?.({ price: formatInputBankStyle(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="card" style={{
            padding: 'var(--space-5)',
            marginBottom: 'var(--space-4)',
            transition: 'all 0.2s',
            border: '1px solid var(--border-light)'
        }}>
            {/* Header: Title and ID */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                    {productLabel}
                </h4>
                <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: 'var(--text-dim)',
                    background: 'var(--surface-raised)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                }}>
                    ID: {product.id}
                </div>
            </div>

            {/* Details: Cut, Size, Packing */}
            {fullProduct && (
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-5)',
                    paddingBottom: 'var(--space-4)',
                    borderBottom: '1px solid var(--border-light)'
                }}>
                    {fullProduct.corte && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <Scissors size={14} style={{ color: 'var(--text-dim)' }} />
                            <span>{fullProduct.corte}</span>
                        </div>
                    )}
                    {fullProduct.calibre && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <Ruler size={14} style={{ color: 'var(--text-dim)' }} />
                            <span>{fullProduct.calibre}</span>
                        </div>
                    )}
                    {fullProduct.packing && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                            <Box size={14} style={{ color: 'var(--text-dim)' }} />
                            <span>{fullProduct.packing}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Financial Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
                {/* Purchase Column */}
                <div style={{ padding: 'var(--space-3)', background: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--amber)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ShoppingCart size={10} /> COMPRA
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Cant.</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>{product.qty.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Unit.</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--amber)' }}>${formatNumber(numPurchasePrice)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.2)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 800, color: 'var(--amber)' }}>
                                ${formatNumber(totalPurchase)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Sale Column */}
                <div style={{ padding: 'var(--space-3)', background: 'rgba(56, 189, 248, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <DollarSign size={10} /> VENTA
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Cant.</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text)' }}>{product.qty.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Unit.</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--accent)' }}>${formatNumber(numPrice)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(56, 189, 248, 0.2)', marginTop: '4px', paddingTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>
                                ${formatNumber(totalSale)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
