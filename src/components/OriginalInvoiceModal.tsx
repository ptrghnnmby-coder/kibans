'use client'

import React, { useState, useEffect } from 'react'
import { X, Loader2, FileText, CheckCircle, AlertTriangle, Coffee, RefreshCw, Download, Send, Package, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react'

interface RealProduct {
    id: string
    name: string
    qty: number
    salePrice: number
    purchasePrice: number
}

interface OriginalInvoiceModalProps {
    isOpen: boolean
    onClose: () => void
    operationId: string
    clientName: string
    invoiceDocId?: string
    opProductos?: string       // "id:qty:price\n..."  (sale)
    opPurchaseRaw?: string     // "id:qty:price\n..."  (purchase)
    productCatalog?: Array<{ id: string; nombre: string }>
}

function parseProductEntries(raw: string) {
    return (raw || '').split('\n').filter(l => l.trim()).map(line => {
        const parts = line.split(':')
        return {
            id: parts[0]?.trim() || '',
            qty: parseFloat(parts[1]) || 0,
            price: parseFloat(parts[2]) || 0
        }
    }).filter(p => p.id)
}

export default function OriginalInvoiceModal({
    isOpen, onClose, operationId, clientName, invoiceDocId: initialDocId,
    opProductos, opPurchaseRaw, productCatalog = []
}: OriginalInvoiceModalProps) {

    const [step, setStep] = useState<'configure' | 'generating' | 'preview' | 'error'>('configure')
    const [realProducts, setRealProducts] = useState<RealProduct[]>([])
    const [invoiceNotes, setInvoiceNotes] = useState('')
    const [docId, setDocId] = useState<string | null>(null)
    const [docUrl, setDocUrl] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [result, setResult] = useState<{ realTotal: number; estimatedTotal: number; delta: number } | null>(null)

    useEffect(() => {
        if (!isOpen) return
        if (initialDocId) {
            setDocId(initialDocId)
            setDocUrl(`https://docs.google.com/document/d/${initialDocId}/edit`)
            setStep('preview')
            return
        }
        // Pre-populate from proforma data
        const saleItems = parseProductEntries(opProductos || '')
        const purchaseItems = parseProductEntries(opPurchaseRaw || '')
        const products: RealProduct[] = saleItems.map(s => {
            const cat = productCatalog.find(c => c.id === s.id || c.nombre === s.id)
            const purchase = purchaseItems.find(p => p.id === s.id)
            return {
                id: s.id,
                name: cat?.nombre || s.id,
                qty: s.qty,
                salePrice: s.price,
                purchasePrice: purchase?.price || 0
            }
        })
        setRealProducts(products.length > 0 ? products : [{ id: '', name: '', qty: 0, salePrice: 0, purchasePrice: 0 }])
        setStep('configure')
    }, [isOpen, initialDocId])

    if (!isOpen) return null

    const updateProduct = (idx: number, field: keyof RealProduct, value: string | number) => {
        setRealProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p))
    }

    const estimatedTotal = parseProductEntries(opProductos || '').reduce((s, p) => s + p.qty * p.price, 0)
    const realTotal = realProducts.reduce((s, p) => s + (p.qty || 0) * (p.salePrice || 0), 0)
    const delta = realTotal - estimatedTotal
    const hasDelta = Math.abs(delta) > 0.01

    const handleGenerate = async () => {
        setStep('generating')
        setErrorMessage(null)
        try {
            const res = await fetch('/api/invoice/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationId, realProducts, invoiceNotes })
            })
            const data = await res.json()
            if (data.success) {
                setDocId(data.docId)
                setDocUrl(`https://docs.google.com/document/d/${data.docId}/edit`)
                setResult({ realTotal: data.realTotal, estimatedTotal: data.estimatedTotal, delta: data.delta })
                setStep('preview')
            } else {
                throw new Error(data.error || 'Error al generar')
            }
        } catch (err: any) {
            setErrorMessage(err.message)
            setStep('error')
        }
    }

    // Generating screen
    if (step === 'generating') {
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
                <div style={{ background: '#111827', borderRadius: '24px', padding: '48px', maxWidth: '450px', width: '90%', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}>
                        <Coffee size={40} color="white" />
                    </div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Generando Original Invoice...</h3>
                    <p style={{ color: '#9ca3af', marginBottom: '24px' }}>Actualizando cantidades y ajustando CashFlow 🧉</p>
                    <div style={{ height: '6px', borderRadius: '9999px', overflow: 'hidden', background: 'rgba(255,255,255,0.1)' }}>
                        <div style={{ height: '100%', width: '70%', background: 'linear-gradient(90deg, #a855f7, #ec4899)', animation: 'progress 2s ease-in-out infinite' }} />
                    </div>
                    <style>{`@keyframes progress { 0%{transform:translateX(-100%)} 50%{transform:translateX(0%)} 100%{transform:translateX(100%)} }`}</style>
                </div>
            </div>
        )
    }

    // Preview screen
    if (step === 'preview' && docUrl) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                <div className="w-full max-w-5xl bg-gray-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[90vh]">
                    <div className="p-5 bg-[#0a0f18] border-b border-white/10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 rounded-lg" style={{ background: 'rgba(168,85,247,0.2)' }}>
                                    <CheckCircle size={18} style={{ color: '#a855f7' }} />
                                </div>
                                <h3 className="text-xl font-bold text-white">¡Original Invoice Generada!</h3>
                            </div>
                            {result && Math.abs(result.delta) > 0.01 && (
                                <div style={{ display: 'flex', gap: '12px', marginTop: '6px', marginLeft: '44px' }}>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Estimado: <b style={{ color: 'white' }}>${result.estimatedTotal.toFixed(2)}</b>
                                    </span>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>→</span>
                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                        Real: <b style={{ color: '#a855f7' }}>${result.realTotal.toFixed(2)}</b>
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: result.delta >= 0 ? '#34d399' : '#f87171' }}>
                                        ({result.delta >= 0 ? '+' : ''}${result.delta.toFixed(2)} en CashFlow ajustado)
                                    </span>
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors"><X size={24} /></button>
                    </div>
                    <div className="flex-1 relative bg-black/20 p-4">
                        <iframe src={docUrl.replace('/edit', '/preview')} className="w-full h-full rounded-2xl border border-white/5" title="Invoice Preview" />
                    </div>
                    <div className="p-5 bg-gray-800/50 border-t border-white/10 flex gap-4">
                        <button onClick={handleGenerate} className="p-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl transition-all border border-white/5" title="Regenerar">
                            <RefreshCw size={20} />
                        </button>
                        <a href={docUrl} target="_blank" rel="noopener noreferrer"
                            className="flex-1 px-6 py-4 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                            style={{ background: 'var(--accent)', color: 'white' }}>
                            <FileText size={20} /> Editar Documento
                        </a>
                        <button onClick={onClose} className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold transition-all">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Error screen
    if (step === 'error') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Error al generar</h3>
                    <p className="text-sm text-red-700 bg-red-50 rounded-xl p-3 mb-6">{errorMessage}</p>
                    <button onClick={onClose} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800">Cerrar</button>
                </div>
            </div>
        )
    }

    // Configure screen
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div style={{ background: 'var(--surface-raised)', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.6)', border: '1px solid var(--border)' }}>

                {/* Header */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Package size={16} style={{ color: '#a855f7' }} />
                            </div>
                            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)' }}>Original Invoice — Cantidades Reales</h2>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', marginLeft: '42px' }}>{operationId} · {clientName}</p>
                    </div>
                    <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-dim)' }}><X size={20} /></button>
                </div>

                {/* Product table */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                        Ingresá las cantidades <b>reales</b> cargadas. Los precios de venta y compra se actualizarán en la planilla.
                    </p>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '8px 0', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Producto</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Cantidad Real</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>P. Venta <span style={{ fontWeight: 400, opacity: 0.6 }}>(invoice)</span></th>
                                <th style={{ padding: '8px 0', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase' }}>Subtotales</th>
                            </tr>
                        </thead>
                        <tbody>
                            {realProducts.map((p, i) => {
                                const saleSub = (p.qty || 0) * (p.salePrice || 0)
                                const purchSub = (p.qty || 0) * (p.purchasePrice || 0)
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <td style={{ padding: '10px 0' }}>
                                            <div style={{ fontWeight: 600 }}>{p.name || p.id}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{p.id}</div>
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            <input
                                                type="number"
                                                className="input"
                                                value={p.qty}
                                                onChange={e => updateProduct(i, 'qty', parseFloat(e.target.value) || 0)}
                                                style={{ width: '80px', textAlign: 'right', padding: '4px 8px', fontSize: '13px', fontWeight: 700 }}
                                                min={0}
                                                step={0.01}
                                            />
                                        </td>
                                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                            <input
                                                type="number"
                                                className="input"
                                                value={p.salePrice}
                                                onChange={e => updateProduct(i, 'salePrice', parseFloat(e.target.value) || 0)}
                                                style={{ width: '80px', textAlign: 'right', padding: '4px 8px', fontSize: '13px' }}
                                                min={0}
                                                step={0.01}
                                            />
                                        </td>
                                        <td style={{ padding: '10px 0', textAlign: 'right' }}>
                                            {/* Venta subtotal */}
                                            <div style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '13px' }}>
                                                ${saleSub.toFixed(2)}
                                            </div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                venta
                                            </div>
                                            {/* Compra subtotal */}
                                            {purchSub > 0 && (
                                                <>
                                                    <div style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                                                        ${purchSub.toFixed(2)}
                                                    </div>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '2px' }}>
                                                        compra
                                                    </div>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {/* Notes field */}
                    <div style={{ marginTop: '20px' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                            Notas del Invoice
                        </label>
                        <textarea
                            className="input"
                            value={invoiceNotes}
                            onChange={e => setInvoiceNotes(e.target.value)}
                            placeholder="Notas visibles en el documento (opcional)..."
                            rows={3}
                            style={{ width: '100%', resize: 'vertical', fontSize: '13px', padding: '10px 12px' }}
                        />
                    </div>

                    {/* Totals summary */}
                    <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasDelta ? '12px' : 0 }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Estimado (Proforma)</span>
                            <span style={{ fontSize: '14px', fontWeight: 700 }}>${estimatedTotal.toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: hasDelta ? '12px' : 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>Total Real (Invoice)</span>
                            <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--accent)' }}>${realTotal.toFixed(2)}</span>
                        </div>
                        {hasDelta && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: delta >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${delta >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    {delta >= 0 ? <TrendingUp size={14} style={{ display: 'inline', marginRight: 4 }} /> : <TrendingDown size={14} style={{ display: 'inline', marginRight: 4 }} />}
                                    Ajuste en CashFlow (saldo restante)
                                </span>
                                <span style={{ fontSize: '14px', fontWeight: 800, color: delta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                    {delta >= 0 ? '+' : ''}${delta.toFixed(2)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px' }}>
                    <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button
                        onClick={handleGenerate}
                        disabled={realProducts.every(p => !p.qty)}
                        style={{
                            flex: 2, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '14px', color: 'white',
                            background: 'var(--accent)',
                            opacity: realProducts.every(p => !p.qty) ? 0.5 : 1
                        }}
                    >
                        <FileText size={16} style={{ display: 'inline', marginRight: 6 }} />
                        Generar Original Invoice
                    </button>
                </div>
            </div>
        </div>
    )
}
