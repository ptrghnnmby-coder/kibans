'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar, Save, X, RefreshCw, Briefcase, Activity, Edit2, Check, AlertTriangle, Trash, CheckCircle } from 'lucide-react'
import { CashFlowTransaction } from '@/lib/sheets-types'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'

import { parseNumeric } from '@/lib/numbers'

interface CashFlowManagerProps {
    operationId: string
    initialTransactions?: CashFlowTransaction[]
    totalSales?: number
    totalPurchases?: number
    showAddButton?: boolean
}

export function CashFlowManager({
    operationId,
    initialTransactions = [],
    totalSales = 0,
    totalPurchases = 0,
    showAddButton = true
}: CashFlowManagerProps) {
    const { showToast } = useToast()
    const [transactions, setTransactions] = useState<CashFlowTransaction[]>(initialTransactions)
    const [loading, setLoading] = useState(false)
    const [adding, setAdding] = useState(false)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingTxId, setEditingTxId] = useState<string | null>(null)
    const [confirmModal, setConfirmModal] = useState<{ txId: string; amount: number; description?: string; type: 'PAY' | 'DELETE' } | null>(null)
    const [showSuccess, setShowSuccess] = useState<{ message: string } | null>(null)
    const [userName, setUserName] = useState('Marta')
    const [isAdmin, setIsAdmin] = useState(false)
    const [liquidating, setLiquidating] = useState(false)
    const [showLiquidateConfirm, setShowLiquidateConfirm] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user-profile')
            if (stored) {
                try {
                    const profile = JSON.parse(stored)
                    if (profile.name) setUserName(profile.name)
                    const role = profile.role || ''
                    const email = profile.email || ''
                    setIsAdmin(role === 'Admin' || email === 'hm@southmarinetrading.com' || email === 'admin@southmarinetrading.com')
                } catch (e) {
                    console.error('Error parsing user-profile', e)
                }
            }
        }
    }, [])

    // Form State
    const [newTx, setNewTx] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'EGRESO' as 'INGRESO' | 'EGRESO' | 'INFORMATIVO',
        category: '',
        description: '',
        status: 'PENDIENTE' as 'PENDIENTE' | 'PAGADO',
        dueDate: new Date().toISOString().split('T')[0]
    })
    // Bank-style amount input: store as integer cents (e.g. 500000 = $5,000.00)
    const [amountCents, setAmountCents] = useState(0)

    const formatAmountDisplay = (cents: number) =>
        (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault()
            setAmountCents(prev => {
                const next = prev * 10 + parseInt(e.key)
                return next > 9999999999 ? prev : next // cap at $99,999,999.99
            })
        } else if (e.key === 'Backspace') {
            e.preventDefault()
            setAmountCents(prev => Math.floor(prev / 10))
        } else if (e.key === 'Delete') {
            e.preventDefault()
            setAmountCents(0)
        }
        // Block all other keys (letters, dots, minus, etc.)
        else if (!['Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault()
        }
    }

    const fetchTransactions = async (forceSync = false) => {
        setLoading(true)
        try {
            const url = `/api/operaciones/${operationId}/cashflow${forceSync ? '?forceSync=true' : ''}`
            const res = await fetch(url)
            const data = await res.json()
            if (data.success) {
                setTransactions(data.data)
                if (forceSync) showToast('Sincronización completada y montos actualizados', 'success')
            }
        } catch (error) {
            console.error('Error fetching cash flow:', error)
            if (forceSync) showToast('Error al sincronizar datos', 'error')
        } finally {
            setLoading(false)
        }
    }

    // On mount: load data from sheet WITHOUT sync to preserve manual edits.
    // If the result is empty (first time or new operation), then run sync to generate initial transactions.
    const initTransactions = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/operaciones/${operationId}/cashflow`)
            const data = await res.json()
            if (data.success) {
                if (data.data.length === 0) {
                    // No transactions yet — generate initial accounting entries
                    await fetchTransactions(true)
                } else {
                    // Already has transactions — just display them, don't overwrite
                    setTransactions(data.data)
                }
            }
        } catch (error) {
            console.error('Error initializing cash flow:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (operationId) initTransactions()
    }, [operationId])

    const handleAddTransaction = async () => {
        if (amountCents === 0) {
            showToast('El importe debe ser mayor a 0', 'error')
            return
        }
        setAdding(true)
        try {
            const res = await fetch(`/api/operaciones/${operationId}/cashflow`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId,
                    ...newTx,
                    amount: amountCents / 100
                })
            })
            const data = await res.json()
            if (data.success) {
                setTransactions([...transactions, data.data])
                setIsFormOpen(false)
                setAmountCents(0)
                setNewTx({
                    date: new Date().toISOString().split('T')[0],
                    type: 'EGRESO',
                    category: '',
                    description: '',
                    status: 'PENDIENTE',
                    dueDate: new Date().toISOString().split('T')[0]
                })
                showToast('Movimiento registrado con éxito', 'success')
            } else {
                showToast(data.error || 'Error al guardar el movimiento', 'error')
            }
        } catch (error) {
            console.error('Error adding transaction:', error)
            showToast('Error de conexión con el servidor', 'error')
        } finally {
            setAdding(false)
        }
    }

    const handleDeleteTransaction = (tx: CashFlowTransaction) => {
        setConfirmModal({
            txId: tx.id,
            amount: tx.amount,
            description: tx.description,
            type: 'DELETE'
        })
    }

    const executeDelete = async () => {
        if (!confirmModal || confirmModal.type !== 'DELETE') return
        const txId = confirmModal.txId
        setAdding(true)
        try {
            const res = await fetch(`/api/operaciones/${operationId}/cashflow?txId=${txId}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (data.success) {
                setTransactions(transactions.filter(t => t.id !== txId))
                setConfirmModal(null)
                setShowSuccess({ message: 'Movimiento eliminado correctamente' })
                setTimeout(() => setShowSuccess(null), 3000)
                showToast('Movimiento eliminado correctamente', 'success')
            } else {
                showToast(data.error || 'Error al eliminar el movimiento', 'error')
            }
        } catch (error) {
            console.error('Error deleting transaction:', error)
            showToast('Error al eliminar la transacción', 'error')
        } finally {
            setAdding(false)
        }
    }

    const handleEditTransaction = (tx: CashFlowTransaction) => {
        setEditingTxId(tx.id)
        setAmountCents(Math.round(tx.amount * 100))
        setNewTx({
            date: tx.date,
            type: tx.type,
            category: tx.category,
            description: tx.description,
            status: tx.status,
            dueDate: tx.dueDate || tx.date
        })
        setIsFormOpen(true)
    }

    const handleUpdateTransaction = async () => {
        if (!editingTxId || amountCents === 0) {
            showToast('Faltan campos obligatorios o importe inválido', 'error')
            return
        }
        setAdding(true)
        try {
            const res = await fetch(`/api/operaciones/${operationId}/cashflow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txId: editingTxId,
                    date: newTx.date,
                    type: newTx.type,
                    category: newTx.category,
                    description: newTx.description,
                    amount: amountCents / 100,
                    status: newTx.status,
                    dueDate: newTx.dueDate
                })
            })
            const data = await res.json()
            if (data.success) {
                // Refresh transactions
                await fetchTransactions()
                setIsFormOpen(false)
                setEditingTxId(null)
                setAmountCents(0)
                setNewTx({
                    date: new Date().toISOString().split('T')[0],
                    type: 'EGRESO',
                    category: '',
                    description: '',
                    status: 'PENDIENTE',
                    dueDate: new Date().toISOString().split('T')[0]
                })
                showToast('Movimiento actualizado correctamente', 'success')
            } else {
                showToast(data.error || 'Error al actualizar el movimiento', 'error')
            }
        } catch (error: any) {
            console.error('Error updating transaction:', error)
            showToast(error?.message || 'Error al actualizar la transacción', 'error')
        } finally {
            setAdding(false)
        }
    }

    const handleQuickPay = (tx: CashFlowTransaction) => {
        setConfirmModal({
            txId: tx.id,
            amount: tx.amount,
            description: tx.description,
            type: 'PAY'
        })
    }

    const confirmQuickPayment = async () => {
        console.log('[CashFlowManager] Check button clicked. State:', confirmModal)
        if (!confirmModal || confirmModal.type !== 'PAY') {
            console.warn('[CashFlowManager] confirmModal invalid for payment:', confirmModal)
            return
        }

        setAdding(true)
        try {
            console.log(`[CashFlowManager] Sending PUT to /api/operaciones/${operationId}/cashflow`)
            const payload = {
                txId: confirmModal.txId,
                status: 'PAGADO',
                date: new Date().toISOString().split('T')[0]
            }
            console.log('[CashFlowManager] Payload:', payload)

            const res = await fetch(`/api/operaciones/${operationId}/cashflow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            console.log('[CashFlowManager] Response status:', res.status)
            const data = await res.json()
            console.log('[CashFlowManager] Response data:', data)

            if (data.success) {
                await fetchTransactions()
                setConfirmModal(null)
                setShowSuccess({ message: 'Pago registrado correctamente' })
                setTimeout(() => setShowSuccess(null), 3000)
                showToast('Pago registrado correctamente', 'success')
            } else {
                console.error('[CashFlowManager] Server error:', data.error)
                showToast(data.error || 'Error al registrar el pago', 'error')
            }
        } catch (error) {
            console.error('[CashFlowManager] Error in quick pay:', error)
            showToast('Error al conectar con la API', 'error')
        } finally {
            setAdding(false)
        }
    }


    // 1. DYNAMIC TOTALS FROM TRANSACTIONS (SUM OF ALL TABLE ITEMS)
    // User requested: "lo de arriba suma lo de abajo". If table is empty, all zero.
    const ledgerSales = transactions
        .filter(t => t.type === 'INGRESO')
        .reduce((sum, t) => sum + t.amount, 0)

    // TOTAL EGRESOS (MERCADERÍA + GASTOS) - Everything that is an OUTFLOW
    const ledgerAllOutflows = transactions
        .filter(t => t.type === 'EGRESO')
        .reduce((sum, t) => sum + t.amount, 0)

    const ledgerPurchases = transactions
        .filter(t => t.type === 'EGRESO' && ['Pago A', 'Pago B'].includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0)

    // Total extra costs (excluding main purchases)
    const extraCosts = transactions
        .filter(t => t.type === 'EGRESO' && !['Pago A', 'Pago B'].includes(t.category))
        .reduce((sum, t) => sum + t.amount, 0)

    // STRICT COHERENCE: If table is empty, show zero (User instruction: "lo de arriba suma lo de abajo")
    const effectiveTotalSales = ledgerSales
    const effectiveTotalOutflows = ledgerAllOutflows

    // 2. PROJECTED PROFIT (Basado en lo que hay en la tabla)
    // UTILIDAD = VENTAS - TOTAL EGRESOS (Coherencia visual total)
    const equity = effectiveTotalSales - effectiveTotalOutflows
    // Margin based on Sales
    const margin = effectiveTotalSales > 0 ? (equity / effectiveTotalSales) * 100 : 0

    // 3. ACTUAL CASH FLOW (EFECTIVO - SOLO LO QUE ESTÁ MARCADO COMO PAGADO)
    const totalCollected = transactions
        .filter(t => t.type === 'INGRESO' && t.status === 'PAGADO')
        .reduce((sum, t) => sum + t.amount, 0)

    const totalPaid = transactions
        .filter(t => t.type === 'EGRESO' && t.status === 'PAGADO')
        .reduce((sum, t) => sum + t.amount, 0)

    // CAPITAL INVERTIDO = PAGADO - COBRADO
    const investedCapital = totalPaid - totalCollected

    // 4. PAYMENT TRACKING (POR CATEGORÍA)
    const pendingToCollect = effectiveTotalSales - totalCollected
    const pendingToPay = effectiveTotalOutflows - totalPaid


    const formatDateForTable = (dateStr: string) => {
        if (!dateStr) return '-'
        const parts = dateStr.split('-')
        if (parts.length === 3 && parts[0].length === 4) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`
        }
        return dateStr
    }

    const handleLiquidate = () => {
        setShowLiquidateConfirm(true)
    }

    const confirmLiquidate = async () => {
        setShowLiquidateConfirm(false)

        setLiquidating(true)
        try {
            const res = await fetch(`/api/operaciones/${operationId}/liquidate`, {
                method: 'POST'
            })
            const data = await res.json()
            if (data.success) {
                showToast('Operación liquidada y archivada correctamente', 'success')
                // Redirect to operations list after a short delay
                setTimeout(() => {
                    window.location.href = '/operaciones'
                }, 2000)
            } else {
                showToast(data.error || 'Error al liquidar la operación', 'error')
            }
        } catch (error) {
            console.error('Error liquidating operation:', error)
            showToast('Error de conexión con el servidor', 'error')
        } finally {
            setLiquidating(false)
        }
    }

    return (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h3 style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <DollarSign size={14} /> CASH FLOW LEDGER
                </h3>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => fetchTransactions(true)}
                        className="btn btn-secondary btn-small"
                        title="Sincronizar con Master Input y corregir montos"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {showAddButton && (
                        <button
                            onClick={() => setIsFormOpen(!isFormOpen)}
                            className="btn btn-secondary btn-small"
                        >
                            {isFormOpen ? <X size={16} /> : <Plus size={16} />}
                            {isFormOpen ? 'Cancelar' : 'Nuevo Movimiento'}
                        </button>
                    )}
                </div>
            </div>

            {/* SUMMARY CARDS */}
            <div className="summary-grid-cards" style={{ marginBottom: 'var(--space-6)' }}>
                {/* CARD 1: TOTAL VENTAS (FROM TABLE) */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(6, 182, 212, 0) 100%)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', color: 'var(--cyan)' }}>
                            <TrendingUp size={16} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TOTAL VENTAS</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                        ${effectiveTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--cyan)' }}>${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> cobrado real
                    </div>
                </div>

                {/* CARD 2: TOTAL EGRESOS (FROM TABLE) */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0) 100%)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)' }}>
                            <TrendingDown size={16} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>TOTAL EGRESOS</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                        ${effectiveTotalOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ color: 'var(--red)' }}>${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> pagado real
                    </div>
                </div>

                {/* CARD 3: CAPITAL INVERTIDO */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    background: investedCapital <= 0
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.02) 100%)'
                        : 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)',
                    boxShadow: 'var(--shadow-sm)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: investedCapital <= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: investedCapital <= 0 ? 'var(--green)' : 'var(--orange)' }}>
                            <Activity size={16} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>CAPITAL INVERTIDO</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: investedCapital <= 0 ? 'var(--green)' : 'var(--orange)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                        ${Math.abs(investedCapital).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        {investedCapital <= 0 ? 'Capital a favor (Auto-financiada)' : 'Capital puesto en la operación'}
                    </div>
                </div>

                {/* CARD 4: UTILIDAD NETA (FINAL) */}
                <div style={{
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-5)',
                    background: equity >= 0
                        ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.05) 100%)'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.05) 100%)',
                    boxShadow: '0 8px 24px -10px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ padding: '6px', borderRadius: '8px', background: equity >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: equity >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            <Briefcase size={16} />
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>RESULTADO FINAL</span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: equity >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.5px' }}>
                        ${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', fontWeight: 600 }}>
                        MARGEN: <span style={{ color: margin >= 0 ? 'var(--green)' : 'var(--red)' }}>{margin.toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            {/* PAYMENT TRACKING */}
            {(effectiveTotalSales !== 0 || effectiveTotalOutflows !== 0) && (
                <div className="grid-cols-2-responsive" style={{
                    marginBottom: 'var(--space-6)',
                    padding: '20px',
                    background: 'var(--surface-raised)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)'
                }}>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingUp size={14} /> Seguimiento de Ventas
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Venta</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)' }}>${effectiveTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cobrado</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--cyan)' }}>-${totalCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: pendingToCollect > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>Pendiente por Cobrar</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: pendingToCollect > 0 ? 'var(--orange)' : 'var(--green)' }}>
                                    ${pendingToCollect.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <TrendingDown size={14} /> Seguimiento de Egresos
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Total Egresos (Mercadería + Gastos)</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--text)' }}>
                                    ${effectiveTotalOutflows.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Pagado</span>
                                <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--red)' }}>-${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', background: pendingToPay > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', paddingLeft: '12px', paddingRight: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase' }}>Pendiente por Pagar</span>
                                <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: pendingToPay > 0 ? 'var(--red)' : 'var(--green)' }}>
                                    ${pendingToPay.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FORM */}
            {isFormOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setIsFormOpen(false)
                    }}
                >
                    <div style={{
                        background: 'var(--surface-raised)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--space-8)',
                        width: '100%',
                        maxWidth: '650px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        position: 'relative',
                        animation: 'slideUp 0.3s ease-out'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: editingTxId ? 'var(--blue-soft)' : 'var(--cyan-soft)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: editingTxId ? 'var(--blue)' : 'var(--cyan)'
                                }}>
                                    {editingTxId ? <Save size={20} /> : <Plus size={20} />}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                                        {editingTxId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
                                    </h4>
                                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                                        {editingTxId ? 'Actualiza los detalles de la transacción' : 'Registra un ingreso o egreso en el Cash Flow'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                style={{
                                    color: 'var(--text-dim)',
                                    background: 'var(--surface-hover)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                className="close-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tipo de Movimiento</label>
                                    <select
                                        className="input"
                                        style={{ width: '100%', height: '42px', fontSize: '14px' }}
                                        value={newTx.type}
                                        onChange={e => setNewTx({ ...newTx, type: e.target.value as any, category: '' })}
                                    >
                                        <option value="EGRESO">EGRESO (Pago / Gasto)</option>
                                        <option value="INGRESO">INGRESO (Cobro)</option>
                                        <option value="INFORMATIVO">INFORMATIVO (No afecta utilidad)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Estado</label>
                                    <select
                                        className="input"
                                        style={{
                                            width: '100%',
                                            height: '42px',
                                            fontSize: '14px',
                                            color: newTx.status === 'PAGADO' ? 'var(--green)' : 'var(--orange)',
                                            fontWeight: 600
                                        }}
                                        value={newTx.status}
                                        onChange={e => setNewTx({ ...newTx, status: e.target.value as any })}
                                    >
                                        <option value="PENDIENTE">PENDIENTE</option>
                                        <option value="PAGADO">PAGADO</option>
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                        {newTx.status === 'PAGADO' ? 'Fecha de Pago' : 'Agendar'}
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                        <input
                                            type="date"
                                            className="input"
                                            style={{
                                                width: '100%',
                                                paddingLeft: '38px',
                                                height: '42px',
                                                fontSize: '14px'
                                            }}
                                            value={newTx.dueDate}
                                            onChange={e => setNewTx({ ...newTx, dueDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                {newTx.status !== 'PAGADO' && (
                                    <div>
                                        <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fecha de Documento</label>
                                        <div style={{ position: 'relative' }}>
                                            <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            <input
                                                type="date"
                                                className="input"
                                                style={{ width: '100%', paddingLeft: '38px', height: '42px', fontSize: '14px' }}
                                                value={newTx.date}
                                                onChange={e => setNewTx({ ...newTx, date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Categoría</label>
                                    <select
                                        className="input"
                                        style={{ width: '100%', height: '42px', fontSize: '14px' }}
                                        value={newTx.category}
                                        onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                                    >
                                        <option value="">Seleccionar Categoría...</option>
                                        {newTx.type === 'EGRESO' ? (
                                            <>
                                                <option value="Flete">Flete</option>
                                                <option value="Courier">Courier (DHL, Documentos)</option>
                                                <option value="Pago A">Pago A</option>
                                                <option value="Pago B">Pago B</option>
                                                <option value="Comisiones de Terceros">Comisiones de Terceros</option>
                                                <option value="Otros">Otros</option>
                                            </>
                                        ) : newTx.type === 'INFORMATIVO' ? (
                                            <>
                                                <option value="Flete">Flete</option>
                                                <option value="Otros">Otros</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Cobro">Cobro</option>
                                                <option value="Otros">Otros</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Importe (USD)</label>
                                    <div style={{ position: 'relative' }}>
                                        <DollarSign size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            className="input"
                                            style={{
                                                width: '100%',
                                                paddingLeft: '34px',
                                                height: '42px',
                                                fontSize: '16px',
                                                fontWeight: 800,
                                                color: newTx.type === 'INGRESO' ? 'var(--cyan)' : newTx.type === 'INFORMATIVO' ? 'var(--blue)' : 'var(--red)',
                                                cursor: 'text',
                                                caretColor: 'transparent'
                                            }}
                                            value={formatAmountDisplay(amountCents)}
                                            onKeyDown={handleAmountKeyDown}
                                            onChange={() => { }} // controlled via onKeyDown
                                            title="Ingresá los dígitos de derecha a izquierda (estilo banco)"
                                        />
                                    </div>
                                    {amountCents === 0 && (
                                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                                            💡 Escribí los dígitos de derecha a izquierda · Delete para borrar todo
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="input-label" style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Descripción / Referencia</label>
                                <input
                                    type="text"
                                    className="input"
                                    style={{ width: '100%', height: '42px', fontSize: '14px' }}
                                    placeholder="Escribe el concepto del movimiento..."
                                    value={newTx.description}
                                    onChange={e => setNewTx({ ...newTx, description: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '12px' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0 var(--space-6)', height: '44px', fontWeight: 600, borderRadius: 'var(--radius-md)' }}
                                    onClick={() => setIsFormOpen(false)}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn btn-primary"
                                    style={{
                                        padding: '0 32px',
                                        height: '44px',
                                        borderRadius: '10px'
                                    }}
                                    onClick={editingTxId ? handleUpdateTransaction : handleAddTransaction}
                                    disabled={adding || amountCents === 0}
                                >
                                    {adding ? <RefreshCw className="animate-spin" size={18} /> : (editingTxId ? <Save size={18} /> : <Plus size={18} />)}
                                    <span style={{ marginLeft: '10px' }}>{editingTxId ? 'Actualizar' : 'Guardar Movimiento'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Confirmation Modal for Liquidation */}
                    {showLiquidateConfirm && (
                        <ConfirmModal
                            isOpen={showLiquidateConfirm}
                            onCancel={() => setShowLiquidateConfirm(false)}
                            onConfirm={confirmLiquidate}
                            title="Liquidar Operación"
                            message="¿Estás seguro de que deseas LIQUIDAR esta operación? Esto moverá todos los datos al HISTORIAL y la quitará de la lista de operaciones activas. Esta acción no se puede deshacer fácilmente."
                            confirmText="Liquidar y Archivar"
                            cancelText="Cancelar"
                            isDestructive={true}
                            isProcessing={liquidating}
                        />
                    )}

                    <style jsx>{`
                        @keyframes fadeIn {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes slideUp {
                            from { opacity: 0; transform: translateY(20px) scale(0.98); }
                            to { opacity: 1; transform: translateY(0) scale(1); }
                        }
                        .close-btn:hover {
                            background: var(--red-soft) !important;
                            color: var(--red) !important;
                            transform: rotate(90deg);
                        }
                    `}</style>
                </div>
            )}

            {/* TRANSACTIONS TABLE */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }} className="non-clickable">
                            <th style={{ padding: '12px 8px', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }} title="Fecha de documento">F. Doc</th>
                            <th style={{ padding: '12px 8px', width: '110px', minWidth: '110px', whiteSpace: 'nowrap', color: 'var(--accent)' }} title="Fecha para agendar / Pago">Agendado/Pago</th>
                            <th style={{ padding: '12px 8px', minWidth: '200px' }}>Descripción</th>
                            <th style={{ padding: '12px 8px', width: '110px', minWidth: '110px' }}>Categoría</th>
                            <th style={{ padding: '12px 8px', width: '100px', minWidth: '100px' }}>Estado</th>
                            <th style={{ padding: '12px 8px', width: '100px', minWidth: '100px', textAlign: 'right' }}>Ingreso</th>
                            <th style={{ padding: '12px 8px', width: '100px', minWidth: '100px', textAlign: 'right' }}>Egreso</th>
                            <th style={{ padding: '12px 8px', width: '140px', minWidth: '140px', textAlign: 'right' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                    No hay movimientos registrados
                                </td>
                            </tr>
                        ) : (
                            [...transactions].sort((a, b) => {
                                const dateA = new Date(a.date).getTime() || 0;
                                const dateB = new Date(b.date).getTime() || 0;
                                return dateA - dateB;
                            }).map(tx => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>{formatDateForTable(tx.date)}</td>
                                    <td style={{ padding: '12px 8px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', width: '110px', minWidth: '110px', whiteSpace: 'nowrap' }}>{formatDateForTable(tx.dueDate || tx.date)}</td>
                                    <td style={{ padding: '12px 8px', minWidth: '200px' }}>{tx.description}</td>
                                    <td style={{ padding: '12px 8px', width: '110px', minWidth: '110px' }}>
                                        <span style={{ background: 'var(--surface-raised)', padding: 'var(--space-1) var(--space-2)', borderRadius: 'var(--radius-lg)', fontSize: '11px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                            {tx.category}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 8px', width: '100px', minWidth: '100px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ color: tx.status === 'PAGADO' ? 'var(--green)' : 'var(--orange)', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                {tx.status}
                                            </span>
                                            {tx.type === 'INFORMATIVO' && (
                                                <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Informativo</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: tx.type === 'INFORMATIVO' ? 'var(--text-dim)' : 'var(--cyan)', width: '100px', minWidth: '100px', fontFamily: 'var(--font-mono)' }}>
                                        {tx.type === 'INGRESO' ? `$${tx.amount.toLocaleString()}` : tx.type === 'INFORMATIVO' ? `$${tx.amount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', color: tx.type === 'INFORMATIVO' ? 'var(--text-dim)' : 'var(--red)', width: '100px', minWidth: '100px', fontFamily: 'var(--font-mono)' }}>
                                        {tx.type === 'EGRESO' ? `$${tx.amount.toLocaleString()}` : tx.type === 'INFORMATIVO' ? `$${tx.amount.toLocaleString()}` : '-'}
                                    </td>
                                    <td style={{ padding: '12px 8px', textAlign: 'right', width: '140px', minWidth: '140px' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                                            {tx.status === 'PENDIENTE' && (
                                                <button
                                                    onClick={() => handleQuickPay(tx)}
                                                    style={{ background: 'var(--green-soft)', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--green)', fontSize: '11px', flexShrink: 0 }}
                                                    title="Marcar como Pago"
                                                >
                                                    <Check size={12} />
                                                </button>
                                            )}
                                            <button onClick={() => handleEditTransaction(tx)} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }} title="Editar">
                                                <Edit2 size={12} />
                                            </button>
                                            <button onClick={() => handleDeleteTransaction(tx)} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0 }} title="Eliminar">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* QUICK PAY MODAL */}
            {/* CONFIRMATION MODAL (Refined to Brand Manual) */}
            {confirmModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '440px',
                        padding: '0',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        boxShadow: 'var(--shadow-xl)',
                        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{
                            padding: 'var(--space-8) var(--space-8) var(--space-4) var(--space-8)',
                            position: 'relative'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-5)' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'var(--surface-raised)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: confirmModal.type === 'DELETE' ? 'var(--red)' : 'var(--green)',
                                    border: '1px solid var(--border)'
                                }}>
                                    {confirmModal.type === 'DELETE' ? <AlertTriangle size={24} /> : <DollarSign size={24} />}
                                </div>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    style={{
                                        background: 'var(--surface-raised)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-muted)',
                                        cursor: 'pointer',
                                        padding: '6px',
                                        borderRadius: 'var(--radius-md)',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    className="hover-bright"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.3px' }}>
                                {confirmModal.type === 'PAY' ? 'Confirmar Pago' : 'Eliminar Movimiento'}
                            </h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                                {confirmModal.type === 'PAY'
                                    ? `¿Estás segura de marcar este movimiento como PAGADO? Impactará en el flujo de caja real.`
                                    : `¿Estás segura de eliminar este movimiento? Esta acción no se puede deshacer.`}
                            </p>
                        </div>

                        <div style={{ padding: 'var(--space-6) var(--space-8) var(--space-8) var(--space-8)' }}>
                            <div style={{
                                background: 'var(--surface-raised)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-5)',
                                border: '1px solid var(--border)',
                                marginBottom: 'var(--space-6)'
                            }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '4px' }}>
                                    MONTO DE LA TRANSACCIÓN
                                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 700,
                                    color: confirmModal.type === 'DELETE' ? 'var(--text)' : 'var(--green)',
                                    fontFamily: 'var(--font-mono)',
                                    marginBottom: '4px',
                                    letterSpacing: '-1px'
                                }}>
                                    ${confirmModal.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <div style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'var(--accent)',
                                        flexShrink: 0
                                    }} />
                                    {confirmModal.description}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    className="btn btn-secondary"
                                    style={{
                                        height: '44px',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirmModal.type === 'PAY') confirmQuickPayment()
                                        else executeDelete()
                                    }}
                                    disabled={adding}
                                    className={confirmModal.type === 'DELETE' ? "btn btn-danger" : "btn btn-primary"}
                                    style={{
                                        height: '44px',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    {adding ? <RefreshCw className="animate-spin" size={16} /> : (confirmModal.type === 'DELETE' ? <Trash2 size={16} /> : <Check size={16} />)}
                                    {confirmModal.type === 'PAY' ? (adding ? 'Procesando...' : 'Confirmar') : (adding ? 'Eliminando...' : 'Eliminar')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUCCESS MODAL */}
            {showSuccess && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '0',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        boxShadow: 'var(--shadow-xl)',
                        animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{
                            padding: 'var(--space-10) var(--space-8)',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            position: 'relative'
                        }}>
                            <button
                                onClick={() => setShowSuccess(null)}
                                style={{
                                    position: 'absolute',
                                    top: 'var(--space-4)',
                                    right: 'var(--space-4)',
                                    background: 'var(--surface-raised)',
                                    border: '1px solid var(--border)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: 'var(--radius-md)',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                className="hover-bright"
                            >
                                <X size={18} />
                            </button>

                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: 'var(--green-soft)',
                                borderRadius: 'var(--radius-md)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--green)',
                                border: '1px solid rgba(34, 197, 94, 0.2)',
                                marginBottom: 'var(--space-6)',
                                boxShadow: '0 8px 16px -4px rgba(34, 197, 94, 0.2)'
                            }}>
                                <Check size={32} strokeWidth={2.5} />
                            </div>

                            <h3 style={{
                                fontSize: '20px',
                                fontWeight: 700,
                                margin: '0 0 8px 0',
                                color: 'var(--text)',
                                letterSpacing: '-0.3px'
                            }}>
                                ¡Listo!
                            </h3>

                            <p style={{
                                color: 'var(--text-muted)',
                                fontSize: '13px',
                                margin: '0',
                                lineHeight: 1.5,
                                maxWidth: '280px'
                            }}>
                                {showSuccess.message}
                            </p>

                            <button
                                onClick={() => setShowSuccess(null)}
                                className="btn btn-primary"
                                style={{
                                    marginTop: 'var(--space-8)',
                                    height: '40px',
                                    padding: '0 var(--space-8)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: 'var(--radius-md)',
                                    width: 'auto'
                                }}
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* LIQUIDATION SECTION (Admin Only) */}
            {isAdmin && (
                <div style={{
                    marginTop: 'var(--space-8)',
                    padding: '24px',
                    borderRadius: 'var(--radius-xl)',
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '24px'
                }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <CheckCircle size={20} style={{ color: 'var(--green)' }} /> Liquidación y Cierre de Operación
                        </h4>
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>
                            Si la operación ya fue cobrada y pagada en su totalidad, puedes liquidarla para moverla al archivo histórico. Esto mantendrá los datos para tus reportes anuales pero limpiará tu lista de trabajo.
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Balance de Cierre</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: equity >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--font-mono)' }}>
                                ${equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <button
                            className="btn btn-cyan"
                            style={{
                                padding: '12px 24px'
                            }}
                            onClick={handleLiquidate}
                            disabled={liquidating}
                        >
                            {liquidating ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                            <span style={{ marginLeft: '10px' }}>LIQUIDAR Y ARCHIVAR</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
