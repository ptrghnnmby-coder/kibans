'use client'

import React, { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, ArrowUpCircle, ArrowDownCircle, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useToast } from '../ui/Toast'

interface CashFlowTransaction {
    id: string
    operationId: string
    date: string
    type: 'INGRESO' | 'EGRESO'
    category: string
    description: string
    amount: number
    status: 'PENDIENTE' | 'PAGADO'
    dueDate?: string
}

export function CashFlowWidget() {
    const router = useRouter()
    const [transactions, setTransactions] = useState<CashFlowTransaction[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmModal, setConfirmModal] = useState<{ txId: string; opId: string; amount: number; description: string } | null>(null)
    const [showSuccess, setShowSuccess] = useState(false)
    const { showToast } = useToast()

    const fetchTransactions = async () => {
        try {
            const res = await fetch('/api/dashboard/cashflow')
            const data = await res.json()
            if (data.success) {
                setTransactions(data.data)
            }
        } catch (error) {
            console.error('Error fetching cash flow:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTransactions()
    }, [])

    const handlePayment = (tx: CashFlowTransaction) => {
        setConfirmModal({
            txId: tx.id,
            opId: tx.operationId,
            amount: tx.amount,
            description: tx.description
        })
    }

    const confirmPayment = async () => {
        if (!confirmModal) return

        try {
            const res = await fetch(`/api/operaciones/${confirmModal.opId}/cashflow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txId: confirmModal.txId,
                    status: 'PAGADO',
                    date: new Date().toISOString().split('T')[0]
                })
            })

            const data = await res.json()
            if (data.success) {
                setConfirmModal(null)
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
                fetchTransactions() // Refresh the list
            } else {
                showToast('Error al registrar el pago', 'error')
            }
        } catch (error) {
            console.error('Error updating payment:', error)
            showToast('Error al conectar con la API', 'error')
        }
    }

    if (loading) {
        return (
            <div className="card h-full flex items-center justify-center">
                <div className="spinner"></div>
            </div>
        )
    }

    return (
        <>
            <div className="card h-full flex flex-col">
                <div className="card-header pb-2">
                    <h2 className="card-title">
                        <CalendarIcon size={18} className="text-accent" />
                        Calendario de Flujo de Caja
                    </h2>
                    <div className="badge badge-info text-[10px]">Próximos 15 días</div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 pt-2">
                    {transactions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <p style={{ fontSize: '13px' }}>No hay movimientos pendientes en los próximos 15 días</p>
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <div key={tx.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                background: 'var(--surface-raised)',
                                border: '1px solid var(--border)',
                                transition: 'all 0.3s ease'
                            }} className="hover:border-accent/40 group">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: tx.type === 'INGRESO' ? 'var(--green-soft)' : 'var(--red-soft)',
                                        color: tx.type === 'INGRESO' ? 'var(--green)' : 'var(--red)',
                                        flexShrink: 0,
                                        border: '1px solid transparent',
                                        transition: 'all 0.3s'
                                    }} className="group-hover:scale-110">
                                        {tx.type === 'INGRESO' ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                                    </div>
                                    <div className="overflow-hidden">
                                        <div
                                            onClick={() => router.push(`/operaciones/${tx.operationId}`)}
                                            style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: 'var(--accent)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                            className="hover:underline"
                                        >
                                            OP-{tx.operationId}
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {tx.description}
                                        </div>
                                        <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {new Date(tx.dueDate || tx.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: tx.type === 'INGRESO' ? 'var(--green)' : 'var(--red)' }}>
                                        {tx.type === 'INGRESO' ? '+' : '-'}${tx.amount.toLocaleString()}
                                    </div>
                                    {tx.type === 'EGRESO' && (
                                        <button
                                            onClick={() => handlePayment(tx)}
                                            style={{
                                                background: 'var(--green-soft)',
                                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                                borderRadius: 'var(--radius-sm)',
                                                padding: '4px 8px',
                                                cursor: 'pointer',
                                                color: 'var(--green)',
                                                fontSize: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontWeight: 600,
                                                transition: 'all 0.2s',
                                                flexShrink: 0
                                            }}
                                            className="hover:bg-green hover:text-white"
                                            title="Confirmar Pago"
                                        >
                                            <Check size={12} />
                                            Pagado
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    backdropFilter: 'blur(10px)',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div className="card animate-in shadow-2xl" style={{ width: '420px', padding: 'var(--space-8)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', background: 'var(--surface-raised)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-6)' }}>
                            <div style={{ width: '40px', height: '40px', background: 'var(--green-soft)', color: 'var(--green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={20} strokeWidth={3} />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                                Confirmar Pago
                            </h3>
                        </div>

                        <div style={{ marginBottom: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Vas a registrar el pago de la operación:</div>
                            <div className="flex items-center gap-2">
                                <span style={{ padding: '4px 8px', background: 'var(--accent)', color: 'white', borderRadius: '4px', fontSize: '12px', fontWeight: 700 }}>
                                    OP-{confirmModal.opId}
                                </span>
                                <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '14px' }}>
                                    {confirmModal.description}
                                </span>
                            </div>
                        </div>

                        <div style={{
                            marginBottom: 'var(--space-8)',
                            padding: 'var(--space-5)',
                            background: 'rgba(34, 197, 94, 0.05)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid rgba(34, 197, 94, 0.2)',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Monto a Liquidar</div>
                            <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
                                ${confirmModal.amount.toLocaleString()}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                className="btn btn-secondary flex-1"
                                onClick={() => setConfirmModal(null)}
                                style={{ fontWeight: 700, padding: '12px' }}
                            >
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary flex-1"
                                style={{ background: 'var(--green)', color: 'white', fontWeight: 700, padding: '12px', border: 'none' }}
                                onClick={confirmPayment}
                            >
                                Sí, Confirmar Pago
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Modal */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.85)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    backdropFilter: 'blur(12px)',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div className="card animate-in" style={{
                        width: '320px',
                        padding: '2rem',
                        textAlign: 'center',
                        border: '1px solid var(--green)',
                        boxShadow: '0 0 40px rgba(34, 197, 94, 0.2)',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'var(--green)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            boxShadow: '0 0 20px rgba(34, 197, 94, 0.4)',
                            marginBottom: '0.5rem'
                        }}>
                            <Check size={32} strokeWidth={3} />
                        </div>
                        <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>¡Éxito!</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>
                            El pago ha sido registrado correctamente.
                        </p>
                        <button
                            className="btn btn-primary"
                            style={{
                                background: 'var(--green)',
                                border: 'none',
                                marginTop: '1rem',
                                width: '100%'
                            }}
                            onClick={() => setShowSuccess(false)}
                        >
                            Entendido
                        </button>
                    </div>
                    <style jsx>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                    `}</style>
                </div>
            )}
        </>
    )
}
