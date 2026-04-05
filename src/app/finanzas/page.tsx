'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, BarChart3, AlertCircle, Activity, CheckCircle, Clock, ChevronRight, X, Edit2, Check, RefreshCw, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useToast } from '@/components/ui/Toast'
import { useSession } from 'next-auth/react'
import { USER_MAP } from '@/lib/sheets-types'
import { AIFeatureBadge } from '@/components/AIFeatureBadge'

interface OperationFinancial {
    id: string
    cliente: string
    exportador: string
    estado: string
    fechaEmbarque: string
    totalSales: number
    totalPurchases: number
    totalIncome: number
    totalExpense: number
    balance: number
    margin: number
    pendingToCollect: number
    pendingToPay: number
    freightPaid: boolean
    freightAmount: number
    freightTxId: string | null
    trading: string
}

interface GastoGeneral {
    id: string
    date: string
    responsable: string
    category: string
    description: string
    amount: number
    timestamp: string
}

interface AgendaItem {
    id: string
    operationId: string
    date: string
    type: 'INGRESO' | 'EGRESO'
    category: string
    description: string
    amount: number
    status: 'PENDIENTE' | 'PAGADO'
    dueDate?: string
    cliente: string
    operationEstado: string
}

interface FinancialTotals {
    totalItemsInAgenda: number
    totalSales: number
    totalPurchases: number
    totalIncome: number
    totalExpense: number
    totalBalance: number
    totalPendingToCollect: number
    totalPendingToPay: number
}

export default function FinanciasPage() {
    const router = useRouter()
    const { showToast } = useToast()
    const [loading, setLoading] = useState(true)
    const [operations, setOperations] = useState<OperationFinancial[]>([])
    const [agenda, setAgenda] = useState<AgendaItem[]>([])
    const [movements, setMovements] = useState<AgendaItem[]>([])
    const [gastosGenerales, setGastosGenerales] = useState<GastoGeneral[]>([])
    const [totals, setTotals] = useState<FinancialTotals | null>(null)
    const { data: session } = useSession()

    const userEmail = session?.user?.email?.toLowerCase()
    const isRestricted = userEmail === 'hm@southmarinetrading.com' || userEmail === 'admin@southmarinetrading.com'

    useEffect(() => {
        if (isRestricted) {
            router.push('/')
        }
    }, [isRestricted, router])

    // Tabs state
    const [activeTab, setActiveTab] = useState<'operations' | 'pending' | 'movements' | 'gastos'>('operations')
    const [selectedTrading, setSelectedTrading] = useState<string>('Todas')

    // Modal State
    const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; opId: string; txId: string; amount: number; description?: string } | null>(null)
    const [freightModal, setFreightModal] = useState<{ isOpen: boolean; opId: string; cliente: string } | null>(null)
    const [freightAmount, setFreightAmount] = useState('')
    const [freightDate, setFreightDate] = useState('')
    const [freightType, setFreightType] = useState<'EGRESO' | 'INFORMATIVO'>('EGRESO')
    const [savingFreight, setSavingFreight] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [userName, setUserName] = useState('Tess')
    const [selectedResponsible, setSelectedResponsible] = useState<string>('todos')

    // Inline movement editing state
    const [editingMovementId, setEditingMovementId] = useState<string | null>(null)
    const [editingMovementData, setEditingMovementData] = useState<{ date: string; description: string; category: string; amount: string; type: string }>({ date: '', description: '', category: '', amount: '', type: '' })
    const [savingMovement, setSavingMovement] = useState(false)

    // Gastos Generales State
    const [gastoModal, setGastoModal] = useState(false)
    const [savingGasto, setSavingGasto] = useState(false)
    const [newGasto, setNewGasto] = useState({ date: new Date().toISOString().split('T')[0], category: 'Oficina', amount: '', description: '' })
    const [deletingGasto, setDeletingGasto] = useState<string | null>(null)

    // Initialize from localStorage and default to userEmail if not found
    useEffect(() => {
        const savedResponsible = localStorage.getItem('agenda_selected_responsible')
        if (savedResponsible) {
            setSelectedResponsible(savedResponsible)
        } else if (userEmail) {
            setSelectedResponsible(userEmail)
        }
    }, [userEmail])

    // Save to localStorage
    useEffect(() => {
        if (selectedResponsible) {
            localStorage.setItem('agenda_selected_responsible', selectedResponsible)
        }
    }, [selectedResponsible])

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('user-profile')
            if (stored) {
                try {
                    const profile = JSON.parse(stored)
                    if (profile.name) setUserName(profile.name)
                } catch (e) {
                    console.error('Error parsing user-profile', e)
                }
            }
        }
    }, [])

    const fetchFinancials = async (responsible?: string) => {
        setLoading(true)
        try {
            const resp = responsible || selectedResponsible
            const res = await fetch(`/api/financials?responsibleEmail=${encodeURIComponent(resp)}`)
            const data = await res.json()
            if (data.success) {
                // Sort operations from newest to oldest (descending)
                const sorted = data.data.operations.sort((a: OperationFinancial, b: OperationFinancial) => {
                    const parseId = (idStr: string) => {
                        const parts = idStr.split('-')
                        if (parts.length < 2) return { num: 0, year: 0 }
                        return { num: parseInt(parts[0]) || 0, year: parseInt(parts[1]) || 0 }
                    }
                    const idA = parseId(a.id)
                    const idB = parseId(b.id)
                    if (idA.year !== idB.year) return idB.year - idA.year
                    return idB.num - idA.num
                })
                setOperations(sorted)
                setAgenda(data.data.agenda || [])
                setMovements(data.data.movements || [])
                setGastosGenerales(data.data.gastosGenerales || [])
                setTotals(data.data.totals)
            }
        } catch (error) {
            console.error('Error fetching financial data:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (selectedResponsible) {
            fetchFinancials()
        }
    }, [selectedResponsible])

    const handleActionClick = (item: AgendaItem) => {
        setConfirmModal({
            isOpen: true,
            opId: item.operationId,
            txId: item.id,
            amount: item.amount,
            description: item.description
        })
    }

    const handleFreightClick = (op: OperationFinancial) => {
        if (op.freightPaid || !op.freightTxId) return
        setConfirmModal({
            isOpen: true,
            opId: op.id,
            txId: op.freightTxId,
            amount: op.freightAmount,
            description: 'Flete'
        })
    }

    const confirmPayment = async () => {
        if (!confirmModal) return
        setConfirming(true)
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
                fetchFinancials()
                showToast('Pago registrado correctamente', 'success')
            } else {
                showToast(data.error || 'Error al actualizar el pago', 'error')
            }
        } catch (error) {
            console.error('Error updating payment:', error)
            showToast('Ocurrió un error al procesar el pago', 'error')
        } finally {
            setConfirming(false)
        }
    }

    const saveFreight = async () => {
        if (!freightModal || !freightAmount || !freightDate) {
            showToast('Por favor complete todos los campos', 'warning')
            return
        }

        setSavingFreight(true)
        try {
            const res = await fetch('/api/operaciones/freight', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId: freightModal.opId,
                    amount: parseFloat(freightAmount),
                    date: freightDate,
                    type: freightType
                })
            })

            const data = await res.json()
            if (data.success) {
                setFreightModal(null)
                setFreightAmount('')
                setFreightDate('')
                setFreightType('EGRESO')
                // Refresh data
                fetchFinancials()
                showToast('Flete guardado correctamente', 'success')
            } else {
                showToast(data.error || 'Error al crear la transacción', 'error')
            }
        } catch (error) {
            console.error('Error saving freight:', error)
            showToast('Ocurrió un error al guardar el flete', 'error')
        } finally {
            setSavingFreight(false)
        }
    }

    const saveGasto = async () => {
        if (!newGasto.amount || !newGasto.category || !newGasto.description) {
            showToast('Faltan campos obligatorios', 'warning')
            return
        }

        setSavingGasto(true)
        try {
            const res = await fetch('/api/finanzas/gastos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: newGasto.date,
                    responsable: selectedResponsible === 'todos' ? userEmail : selectedResponsible,
                    category: newGasto.category,
                    description: newGasto.description,
                    amount: newGasto.amount
                })
            })
            const data = await res.json()
            if (res.ok) {
                showToast('Gasto agregado exitosamente', 'success')
                setGastoModal(false)
                setNewGasto({ date: new Date().toISOString().split('T')[0], category: 'Oficina', amount: '', description: '' })
                fetchFinancials()
            } else {
                showToast(data.error || 'Error al guardar gasto', 'error')
            }
        } catch (error) {
            console.error('Error adding gasto:', error)
            showToast('Error de red al guardar el gasto', 'error')
        } finally {
            setSavingGasto(false)
        }
    }

    const deleteGasto = async (id: string) => {
        if (!confirm('¿Realmente desea eliminar este gasto?')) return
        setDeletingGasto(id)
        try {
            const res = await fetch(`/api/finanzas/gastos/${id}`, { method: 'DELETE' })
            if (res.ok) {
                showToast('Gasto eliminado', 'success')
                fetchFinancials()
            } else {
                showToast('Error al eliminar', 'error')
            }
        } catch (error) {
            console.error('Error deleting gasto:', error)
            showToast('Error de red', 'error')
        } finally {
            setDeletingGasto(null)
        }
    }

    const startEditingMovement = (item: AgendaItem) => {
        setEditingMovementId(item.id)
        setEditingMovementData({
            date: item.date,
            description: item.description,
            category: item.category,
            amount: String(item.amount),
            type: (item as any).type || 'EGRESO',
        })
    }

    const cancelEditingMovement = () => {
        setEditingMovementId(null)
    }

    const saveMovementEdit = async (item: AgendaItem) => {
        setSavingMovement(true)
        try {
            const res = await fetch(`/api/operaciones/${item.operationId}/cashflow`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    txId: item.id,
                    date: editingMovementData.date,
                    description: editingMovementData.description,
                    category: editingMovementData.category,
                    amount: parseFloat(editingMovementData.amount) || item.amount,
                    type: editingMovementData.type || undefined,
                })
            })
            const data = await res.json()
            if (data.success) {
                setEditingMovementId(null)
                await fetchFinancials()
                showToast('Movimiento actualizado correctamente', 'success')
            } else {
                showToast(data.error || 'Error al guardar el movimiento', 'error')
            }
        } catch (error) {
            console.error('Error saving movement edit:', error)
            showToast('Error de conexión al guardar', 'error')
        } finally {
            setSavingMovement(false)
        }
    }

    if (loading || isRestricted) return (
        <div className="dashboard-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="spinner"></div>
            <p className="mt-4 text-gray-500 animate-pulse">{isRestricted ? 'Redirigiendo...' : 'Consolidando datos financieros...'}</p>
        </div>
    )

    // Trading Unique Values
    const tradingTypes = ['Todas', ...Array.from(new Set(operations.map(op => op.trading).filter(t => t && t.trim() !== '')))]

    // Filtered Operations
    const filteredOperations = selectedTrading === 'Todas'
        ? operations
        : operations.filter(op => op.trading === selectedTrading)

    // Dynamic Totals based on filtered operations
    const filteredTotals = {
        totalIncome: filteredOperations.reduce((sum, op) => sum + op.totalIncome, 0),
        totalExpense: filteredOperations.reduce((sum, op) => sum + op.totalExpense, 0),
        totalBalance: filteredOperations.reduce((sum, op) => sum + op.balance, 0),
        totalSales: filteredOperations.reduce((sum, op) => sum + op.totalSales, 0),
        totalPurchases: filteredOperations.reduce((sum, op) => sum + op.totalPurchases, 0),
    }

    const margin = filteredTotals.totalSales > 0
        ? ((filteredTotals.totalSales - filteredTotals.totalPurchases) / filteredTotals.totalSales) * 100
        : 0

    // Filter movements and agenda based on filtered operations
    const filteredMovements = selectedTrading === 'Todas'
        ? movements
        : movements.filter(m => filteredOperations.some(op => op.id === m.operationId))

    const filteredAgenda = selectedTrading === 'Todas'
        ? agenda
        : agenda.filter(a => filteredOperations.some(op => op.id === a.operationId))

    // Agenda Filtering and Sorting
    const getDaysDifference = (dateStr: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = new Date(dateStr)
        dueDate.setHours(0, 0, 0, 0)
        const diffTime = dueDate.getTime() - today.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    const organizeByTime = (items: AgendaItem[]) => {
        const overdue = items.filter(item => getDaysDifference(item.dueDate || item.date) < 0)
        const thisWeek = items.filter(item => {
            const diff = getDaysDifference(item.dueDate || item.date)
            return diff >= 0 && diff <= 7
        })
        const later = items.filter(item => getDaysDifference(item.dueDate || item.date) > 7)

        return { overdue, thisWeek, later }
    }

    const organizedAgenda = organizeByTime(filteredAgenda)

    return (
        <div className="dashboard-container animate-in">
            {/* Header consistente con brand manual */}
            <header className="dashboard-header flex-col sm:flex-row items-start sm:items-center gap-4 justify-between" style={{ display: 'flex' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link href="/" className="btn btn-secondary" style={{ padding: '8px', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="label-tess">Finanzas</h1>
                        </div>
                        <p className="page-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Panel Financiero: Consolidado de operaciones</p>
                    </div>
                    <AIFeatureBadge 
                        title="Conciliación Proactiva" 
                        description="Tess genera automáticamente el flujo de fondos proyectado analizando los hitos operativos. Detecta discrepancias de fletes y anticipa vencimientos sin carga manual." 
                        position="bottom"
                    />
                </div>

                <div className="w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                        background: 'var(--surface-raised)',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-dim)', fontWeight: 500 }}>Responsable:</span>
                        <select
                            value={selectedResponsible}
                            onChange={(e) => setSelectedResponsible(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text)',
                                fontSize: '14px',
                                fontWeight: 600,
                                outline: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="todos" style={{ background: 'var(--surface)' }}>Todos</option>
                            {Object.entries(USER_MAP).map(([email, info]) => (
                                <option key={email} value={email} style={{ background: 'var(--surface)' }}>
                                    {info.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => fetchFinancials()}
                        disabled={loading}
                        className="btn-secondary"
                        style={{ padding: '8px', borderRadius: 'var(--radius-md)' }}
                        title="Actualizar datos"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Trading Tabs — Brand Manual: tab-nav + tab-btn */}
            <div className="tab-nav hide-scrollbar" style={{ marginBottom: 'var(--space-6)', overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex' }}>
                {tradingTypes.map(type => (
                    <button
                        key={type}
                        onClick={() => setSelectedTrading(type)}
                        className={`tab-btn ${selectedTrading === type ? 'active' : ''}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            {/* Summary Cards */}
            <div className="summary-grid-premium">
                <div className="summary-card-premium">
                    <div className="stat-icon" style={{ color: 'var(--green)', background: 'var(--green-soft)', borderRadius: 'var(--radius-md)' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className="summary-label">Ingresos Totales</div>
                        <div className="h1-premium">
                            ${filteredTotals.totalIncome.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="summary-card-premium">
                    <div className="stat-icon" style={{ color: 'var(--red)', background: 'var(--red-soft)', borderRadius: 'var(--radius-md)' }}>
                        <TrendingDown size={20} />
                    </div>
                    <div>
                        <div className="summary-label">Egresos Totales</div>
                        <div className="h1-premium">
                            ${filteredTotals.totalExpense.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="summary-card-premium">
                    <div className="stat-icon" style={{ color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 'var(--radius-md)' }}>
                        <DollarSign size={20} />
                    </div>
                    <div>
                        <div className="summary-label">Balance Total</div>
                        <div className="h1-premium" style={{ color: filteredTotals.totalBalance >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            ${filteredTotals.totalBalance.toLocaleString()}
                        </div>
                    </div>
                </div>

                <div className="summary-card-premium">
                    <div className="stat-icon" style={{ color: 'var(--purple)', background: 'var(--purple-soft)', borderRadius: 'var(--radius-md)' }}>
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <div className="summary-label">Margen Bruto</div>
                        <div className="h1-premium">
                            {margin.toFixed(1)}%
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN TABS SELECTOR — Brand Manual: tab-nav + tab-btn */}
            <div className="tab-nav hide-scrollbar" style={{ overflowX: 'auto', whiteSpace: 'nowrap', display: 'flex' }}>
                <button
                    onClick={() => setActiveTab('operations')}
                    className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
                >
                    <Activity size={16} />
                    Operaciones
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                >
                    <Clock size={16} />
                    Mov. Pendientes
                    {filteredAgenda.length > 0 && (
                        <span className="tab-badge">
                            {filteredAgenda.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('movements')}
                    className={`tab-btn ${activeTab === 'movements' ? 'active' : ''}`}
                >
                    <TrendingUp size={16} />
                    Últimos Movimientos
                </button>
                <button
                    onClick={() => setActiveTab('gastos')}
                    className={`tab-btn ${activeTab === 'gastos' ? 'active' : ''}`}
                >
                    <DollarSign size={16} />
                    Otros Movimientos
                </button>
            </div>

            {/* TAB CONTENT */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginTop: 'var(--space-4)' }}>
                {activeTab === 'operations' && (
                    <div className="finanzas-table-mobile" style={{ overflowX: 'auto' }}>
                        <table className="table w-full md:min-w-[900px]" style={{ borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th>OP ID</th>
                                    <th>Cliente</th>
                                    <th className="hide-on-mobile text-right">Total Venta</th>
                                    <th className="hide-on-mobile text-right">Total Compra</th>
                                    <th className="text-right">Ingresos</th>
                                    <th className="text-right">Egresos</th>
                                    <th className="hide-on-mobile text-center">Flete</th>
                                    <th className="text-right">Balance</th>
                                    <th className="hide-on-mobile text-right">Margen</th>
                                    <th className="text-right" style={{ width: '72px' }}>Acc.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOperations.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-dim)' }}>
                                            <div style={{ opacity: 0.5, marginBottom: 'var(--space-4)' }}>
                                                <AlertCircle size={48} style={{ margin: '0 auto' }} />
                                            </div>
                                            <p>No hay operaciones registradas</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredOperations.map((op) => (
                                        <tr
                                            key={op.id}
                                            className="group hover:bg-white/5 transition-colors"
                                            style={{ borderBottom: '1px solid var(--border)' }}
                                        >
                                            <td className="cell-op-id">
                                                {String(op.id || '')}
                                            </td>
                                            <td style={{ padding: '6px 10px', maxWidth: '165px' }}>
                                                <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={op.cliente}>
                                                    {op.cliente}
                                                </div>
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--cyan)', fontWeight: 600 }} className="hide-on-mobile">
                                                ${op.totalSales.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--amber)', fontWeight: 600 }} className="hide-on-mobile">
                                                ${op.totalPurchases.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                                                ${op.totalIncome.toLocaleString()}
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--red)', fontWeight: 600 }}>
                                                ${op.totalExpense.toLocaleString()}
                                            </td>
                                            <td style={{ padding: 'var(--space-4)', textAlign: 'center' }} className="hide-on-mobile">
                                                {op.freightPaid ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                                        <CheckCircle size={18} color="var(--green)" />
                                                        <span style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 700 }}>Pagado</span>
                                                    </div>
                                                ) : op.freightTxId ? (
                                                    <div
                                                        onClick={() => handleFreightClick(op)}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: 'var(--amber-soft)',
                                                            border: '1px solid rgba(179, 138, 88, 0.3)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        className="hover:bg-amber-500/20"
                                                        title="Click para marcar como PAGADO"
                                                    >
                                                        <Clock size={16} color="var(--amber)" />
                                                        <span style={{ fontSize: '11px', color: 'var(--amber)', fontWeight: 700 }}>Pendiente</span>
                                                    </div>
                                                ) : (
                                                    <div
                                                        onClick={() => setFreightModal({ isOpen: true, opId: op.id, cliente: op.cliente })}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px',
                                                            cursor: 'pointer',
                                                            padding: '4px 8px',
                                                            borderRadius: '6px',
                                                            background: 'var(--blue-soft)',
                                                            border: '1px solid var(--accent-low)',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        className="hover:bg-accent/20"
                                                        title="Click para cargar el valor de flete"
                                                    >
                                                        <AlertCircle size={16} color="var(--accent)" />
                                                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>Cargar valor</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{
                                                padding: 'var(--space-4)',
                                                textAlign: 'right',
                                                fontWeight: 800,
                                                color: op.balance >= 0 ? 'var(--green)' : 'var(--red)'
                                            }}>
                                                ${op.balance.toLocaleString()}
                                            </td>
                                            <td style={{ padding: 'var(--space-4)', textAlign: 'right', fontWeight: 700 }} className="hide-on-mobile">
                                                {op.margin.toFixed(1)}%
                                            </td>
                                            <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                                                <button
                                                    onClick={() => router.push(`/operaciones/${op.id}?tab=finanzas`)}
                                                    style={{
                                                        padding: '6px 16px',
                                                        borderRadius: '8px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        border: '1px solid var(--border)',
                                                        background: 'var(--surface-raised)',
                                                        color: 'var(--text)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    className="hover:bg-white/10"
                                                >
                                                    <span>Ver</span>
                                                    <ChevronRight size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {activeTab === 'pending' && (
                    <div style={{ padding: 'var(--space-6)' }}>
                        {filteredAgenda.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--text-dim)' }}>
                                <CheckCircle size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                                <p>No hay cobros o pagos pendientes {selectedTrading !== 'Todas' ? `para ${selectedTrading}` : ''}</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
                                {/* OVERDUE SECTION */}
                                {organizedAgenda.overdue.length > 0 && (
                                    <section>
                                        <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <AlertCircle size={16} /> Vencimientos Atrasados
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                                            {organizedAgenda.overdue.map(item => (
                                                <PendingItem key={item.id} item={item} onAction={handleActionClick} isVencido />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* THIS WEEK SECTION */}
                                {organizedAgenda.thisWeek.length > 0 && (
                                    <section>
                                        <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <Clock size={16} /> Vencen esta Semana
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                                            {organizedAgenda.thisWeek.map(item => (
                                                <PendingItem key={item.id} item={item} onAction={handleActionClick} />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* LATER SECTION */}
                                {organizedAgenda.later.length > 0 && (
                                    <section>
                                        <h3 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-4)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                            <ChevronRight size={16} /> Próximos Vencimientos
                                        </h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                                            {organizedAgenda.later.map(item => (
                                                <PendingItem key={item.id} item={item} onAction={handleActionClick} />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'movements' && (
                    <div className="w-full hide-scrollbar" style={{ overflowX: 'auto' }}>
                        <table className="table w-full md:min-w-[800px]" style={{ borderCollapse: 'separate', borderSpacing: '0' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: 'var(--space-4)', width: '120px' }}>Fecha</th>
                                    <th style={{ padding: 'var(--space-4)', width: '120px' }}>ID Carga</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Detalle</th>
                                    <th style={{ padding: 'var(--space-4)' }}>Categoría</th>
                                    <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Monto</th>
                                    <th style={{ padding: 'var(--space-4)', textAlign: 'center', width: '120px' }}>Estado</th>
                                    <th style={{ padding: 'var(--space-4)', textAlign: 'right', width: '100px' }}>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredMovements.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-dim)' }}>
                                            <p>No hay movimientos registrados {selectedTrading !== 'Todas' ? `para ${selectedTrading}` : ''}</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredMovements
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((item) => {
                                            const isEditing = editingMovementId === item.id
                                            const inputStyle = {
                                                background: 'var(--bg)',
                                                border: '1px solid var(--accent)',
                                                borderRadius: '6px',
                                                padding: '4px 8px',
                                                color: 'var(--text)',
                                                fontSize: '13px',
                                                width: '100%',
                                                outline: 'none',
                                            }
                                            return (
                                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', background: isEditing ? 'rgba(var(--accent-rgb, 0 120 255) / 0.05)' : 'transparent', transition: 'background 0.2s' }}>
                                                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="date"
                                                                value={editingMovementData.date}
                                                                onChange={e => setEditingMovementData(d => ({ ...d, date: e.target.value }))}
                                                                style={inputStyle}
                                                            />
                                                        ) : item.date}
                                                    </td>
                                                    <td style={{ padding: 'var(--space-3)', fontWeight: 800, color: 'var(--accent)' }}>{item.operationId}</td>
                                                    <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editingMovementData.description}
                                                                onChange={e => setEditingMovementData(d => ({ ...d, description: e.target.value }))}
                                                                style={inputStyle}
                                                                placeholder="Descripción"
                                                            />
                                                        ) : item.description}
                                                    </td>
                                                    <td style={{ padding: 'var(--space-3)' }}>
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                value={editingMovementData.category}
                                                                onChange={e => setEditingMovementData(d => ({ ...d, category: e.target.value }))}
                                                                style={inputStyle}
                                                                placeholder="Categoría"
                                                            />
                                                        ) : <span className="badge badge-info">{item.category}</span>}
                                                    </td>
                                                    <td style={{
                                                        padding: 'var(--space-3)',
                                                        textAlign: 'right',
                                                        fontWeight: 800,
                                                        color: String(item.type) === 'INGRESO' ? 'var(--green)' : String(item.type) === 'INFORMATIVO' ? 'var(--text-muted)' : 'var(--red)'
                                                    }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                <select
                                                                    value={editingMovementData.type}
                                                                    onChange={e => setEditingMovementData(d => ({ ...d, type: e.target.value }))}
                                                                    style={{ ...inputStyle, fontSize: '11px', fontWeight: 700 }}
                                                                >
                                                                    <option value="EGRESO">EGRESO (resta)</option>
                                                                    <option value="INGRESO">INGRESO (suma)</option>
                                                                    <option value="INFORMATIVO">INFORMATIVO</option>
                                                                </select>
                                                                <input
                                                                    type="number"
                                                                    value={editingMovementData.amount}
                                                                    onChange={e => setEditingMovementData(d => ({ ...d, amount: e.target.value }))}
                                                                    style={{ ...inputStyle, textAlign: 'right' }}
                                                                    placeholder="Monto"
                                                                />
                                                            </div>
                                                        ) : `${String(item.type) === 'INGRESO' ? '+' : String(item.type) === 'INFORMATIVO' ? '~' : '-'}$${item.amount.toLocaleString()}`}
                                                    </td>
                                                    <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                        <span style={{
                                                            padding: '2px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '10px',
                                                            fontWeight: 700,
                                                            background: item.status === 'PAGADO' ? 'var(--green-soft)' : 'var(--amber-soft)',
                                                            color: item.status === 'PAGADO' ? 'var(--green)' : 'var(--amber)',
                                                            border: `1px solid ${item.status === 'PAGADO' ? 'rgba(94, 138, 117, 0.2)' : 'rgba(179, 138, 88, 0.2)'}`
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                                        {isEditing ? (
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                                <button
                                                                    onClick={() => saveMovementEdit(item)}
                                                                    disabled={savingMovement}
                                                                    title="Guardar cambios"
                                                                    style={{
                                                                        background: 'var(--green)',
                                                                        border: 'none',
                                                                        color: 'white',
                                                                        borderRadius: '6px',
                                                                        padding: '4px 10px',
                                                                        cursor: savingMovement ? 'not-allowed' : 'pointer',
                                                                        fontSize: '12px',
                                                                        fontWeight: 700,
                                                                        opacity: savingMovement ? 0.7 : 1,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                    }}
                                                                >
                                                                    {savingMovement ? <RefreshCw size={12} className="animate-spin" /> : <Check size={12} />}
                                                                    {savingMovement ? '' : 'OK'}
                                                                </button>
                                                                <button
                                                                    onClick={cancelEditingMovement}
                                                                    disabled={savingMovement}
                                                                    title="Cancelar"
                                                                    style={{
                                                                        background: 'var(--surface-raised)',
                                                                        border: '1px solid var(--border)',
                                                                        color: 'var(--text-muted)',
                                                                        borderRadius: '6px',
                                                                        padding: '4px 8px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '12px',
                                                                    }}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                                <button
                                                                    onClick={() => startEditingMovement(item)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                                    title="Editar movimiento"
                                                                >
                                                                    <Edit2 size={15} />
                                                                </button>
                                                                <button
                                                                    onClick={() => router.push(`/operaciones/${item.operationId}?tab=finanzas`)}
                                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                                                                    title="Ir a Operación"
                                                                >
                                                                    <ChevronRight size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* GASTOS GENERALES TAB */}
                {activeTab === 'gastos' && (
                    <div className="finanzas-table-mobile" style={{ overflowX: 'auto' }}>
                        <div style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setGastoModal(true)}
                                className="btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                            >
                                <Plus size={16} /> Añadir Gasto
                            </button>
                        </div>
                        <table className="table w-full min-w-[600px]" style={{ borderCollapse: 'separate', borderSpacing: '0', tableLayout: 'fixed' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '6px 10px', width: '100px', fontSize: '11px' }}>Fecha</th>
                                    <th style={{ padding: '6px 10px', width: '120px', fontSize: '11px' }}>Categoría</th>
                                    <th style={{ padding: '6px 10px', width: 'auto', fontSize: '11px' }}>Descripción</th>
                                    <th style={{ padding: '6px 10px', width: '150px', fontSize: '11px' }}>Responsable</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'right', width: '120px', fontSize: '11px' }}>Monto</th>
                                    <th style={{ padding: '6px 10px', textAlign: 'center', width: '80px', fontSize: '11px' }}>Acc.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastosGenerales.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-dim)' }}>
                                            <div style={{ opacity: 0.5, marginBottom: 'var(--space-4)' }}>
                                                <AlertCircle size={48} style={{ margin: '0 auto' }} />
                                            </div>
                                            <p>No hay gastos registrados para los filtros seleccionados</p>
                                        </td>
                                    </tr>
                                ) : (
                                    gastosGenerales.map((g) => (
                                        <tr key={g.id} className="group hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <td style={{ padding: 'var(--space-3)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Clock size={12} color="var(--text-dim)" />
                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                                                        {g.date}
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)' }}>
                                                <span className="badge badge-info">{g.category}</span>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)' }}>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {g.description}
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: 'var(--surface-raised)', display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'var(--text)'
                                                    }}>
                                                        {USER_MAP[g.responsable?.toLowerCase()]?.initial || (g.responsable ? g.responsable.substring(0, 1).toUpperCase() : '?')}
                                                    </div>
                                                    <span style={{ fontSize: '12px' }}>{USER_MAP[g.responsable?.toLowerCase()]?.name || g.responsable}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 800, color: 'var(--red)' }}>
                                                -${g.amount.toLocaleString()}
                                            </td>
                                            <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                                                <button
                                                    onClick={() => deleteGasto(g.id)}
                                                    disabled={deletingGasto === g.id}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', cursor: 'pointer', padding: '4px', opacity: deletingGasto === g.id ? 0.5 : 1 }}
                                                    title="Eliminar gasto"
                                                >
                                                    {deletingGasto === g.id ? <RefreshCw size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="card" style={{
                        width: '420px',
                        padding: '0',
                        border: '1px solid var(--green-soft)',
                        borderRadius: 'var(--radius-lg)',
                        overflow: 'hidden',
                        background: 'var(--surface)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{
                            padding: '24px',
                            background: 'linear-gradient(180deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0) 100%)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(34, 197, 94, 0.1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--green)'
                                }}>
                                    <DollarSign size={24} />
                                </div>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-dim)',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        borderRadius: '50%',
                                        transition: 'background 0.2s'
                                    }}
                                    className="hover:bg-white/10 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                                Confirmar {agenda.find(i => i.id === confirmModal.txId)?.type === 'INGRESO' ? 'Cobro' : 'Pago'}
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                                {userName}, confirmar este movimiento impactará en el flujo de caja real y en los balances de la operación.
                            </p>
                        </div>

                        <div style={{ padding: '0 24px 24px 24px' }}>
                            <div style={{
                                background: 'var(--surface-raised)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4)',
                                border: '1px solid var(--border)',
                                marginBottom: 'var(--space-6)'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    Monto de la transacción
                                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: 800,
                                    color: 'var(--green)',
                                    fontFamily: 'var(--font-mono)',
                                    marginBottom: '4px'
                                }}>
                                    ${confirmModal.amount.toLocaleString()}
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: 'var(--accent)'
                                    }} />
                                    {confirmModal.description}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button
                                    onClick={() => setConfirmModal(null)}
                                    style={{
                                        height: '48px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--surface-hover)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text)',
                                        fontWeight: 600,
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmPayment}
                                    disabled={confirming}
                                    style={{
                                        height: '48px',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--green)',
                                        border: 'none',
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: confirming ? 'not-allowed' : 'pointer',
                                        opacity: confirming ? 0.7 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 12px rgba(34, 197, 94, 0.4)'
                                    }}
                                >
                                    {confirming ? <RefreshCw size={16} className="animate-spin" /> : <Check size={18} />}
                                    {confirming ? 'Procesando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Freight Modal */}
            {freightModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="modal-content animate-in" style={{
                        width: '500px',
                        padding: '24px',
                        border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--surface)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 className="h2-premium" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <DollarSign size={20} color="var(--accent)" />
                                Cargar Valor de Flete
                            </h3>
                            <button
                                onClick={() => setFreightModal(null)}
                                className="icon-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'var(--surface-raised)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                marginBottom: 'var(--space-6)'
                            }}>
                                <div className="financial-stat-label" style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>Operación:</div>
                                <div style={{ fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>
                                    <strong>{freightModal.opId}</strong> - {freightModal.cliente}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                                <div>
                                    <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                        MONTO DEL FLETE (USD)
                                    </label>
                                    <input
                                        type="number"
                                        className="input"
                                        value={freightAmount}
                                        onChange={(e) => setFreightAmount(e.target.value)}
                                        placeholder="Ej: 1500"
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                        FECHA DE VENCIMIENTO
                                    </label>
                                    <input
                                        type="date"
                                        className="input"
                                        value={freightDate}
                                        onChange={(e) => setFreightDate(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                    />
                                </div>
                                <div>
                                    <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                        TIPO DE FLETE
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        {([
                                            { value: 'EGRESO', label: 'Pago (resta del balance)', color: 'var(--red)' },
                                            { value: 'INFORMATIVO', label: 'Informativo (no resta)', color: 'var(--text-muted)' }
                                        ] as const).map(({ value, label, color }) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setFreightType(value)}
                                                style={{
                                                    flex: 1, padding: '10px 12px',
                                                    borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    border: `2px solid ${freightType === value ? color : 'var(--border)'}`,
                                                    background: freightType === value ? `${color}18` : 'var(--surface-raised)',
                                                    color: freightType === value ? color : 'var(--text-muted)',
                                                    transition: 'all 0.15s', textAlign: 'left' as const
                                                }}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                                <button
                                    className="btn"
                                    onClick={() => setFreightModal(null)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                    disabled={savingFreight}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn"
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--accent)',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        opacity: savingFreight ? 0.7 : 1
                                    }}
                                    onClick={saveFreight}
                                    disabled={savingFreight}
                                >
                                    {savingFreight ? 'Guardando...' : 'Guardar Flete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Añadir Gasto Modal */}
            {gastoModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="modal-content animate-in" style={{
                        width: '500px',
                        padding: '24px',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--surface)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 className="h2-premium" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <Plus size={20} color="var(--accent)" />
                                Registrar Gasto (Fijo/Variable)
                            </h3>
                            <button
                                onClick={() => setGastoModal(false)}
                                className="icon-btn"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ color: 'var(--text-muted)', fontSize: '14px', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div>
                                <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                    FECHA
                                </label>
                                <input
                                    type="date"
                                    className="input"
                                    value={newGasto.date}
                                    onChange={(e) => setNewGasto({ ...newGasto, date: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                    CATEGORÍA
                                </label>
                                <select
                                    className="input"
                                    value={newGasto.category}
                                    onChange={(e) => setNewGasto({ ...newGasto, category: e.target.value })}
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                >
                                    <option value="Sueldos">Sueldos</option>
                                    <option value="Honorarios">Honorarios Profesionales</option>
                                    <option value="Tecnología">Suscripciones / Tecnología</option>
                                    <option value="Oficina">Alquiler / Oficina</option>
                                    <option value="Viáticos">Viajes y Viáticos</option>
                                    <option value="Comisiones">Comisiones (Brokers)</option>
                                    <option value="Varios">Gastos Varios</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                    MONTO (USD)
                                </label>
                                <input
                                    type="number"
                                    className="input"
                                    value={newGasto.amount}
                                    onChange={(e) => setNewGasto({ ...newGasto, amount: e.target.value })}
                                    placeholder="Ej: 500"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                />
                            </div>
                            <div>
                                <label className="input-label" style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
                                    DESCRIPCIÓN
                                </label>
                                <input
                                    type="text"
                                    className="input"
                                    value={newGasto.description}
                                    onChange={(e) => setNewGasto({ ...newGasto, description: e.target.value })}
                                    placeholder="Detalle del gasto"
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface-raised)', color: 'white' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                                <button
                                    className="btn"
                                    onClick={() => setGastoModal(false)}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'transparent',
                                        color: 'var(--text)',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                    disabled={savingGasto}
                                >
                                    Cancelar
                                </button>
                                <button
                                    className="btn"
                                    onClick={saveGasto}
                                    disabled={savingGasto || !newGasto.amount || !newGasto.description}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'var(--green)',
                                        color: 'white',
                                        fontWeight: 700,
                                        cursor: (savingGasto || !newGasto.amount || !newGasto.description) ? 'not-allowed' : 'pointer',
                                        opacity: (savingGasto || !newGasto.amount || !newGasto.description) ? 0.7 : 1
                                    }}
                                >
                                    {savingGasto ? 'Guardando...' : 'Registrar Gasto'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function PendingItem({ item, onAction, isVencido }: { item: AgendaItem; onAction: (item: AgendaItem) => void; isVencido?: boolean }) {
    const isIngreso = item.type === 'INGRESO'

    return (
        <div className={`pending-card ${isVencido ? 'vencido' : ''}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div className="label-tess" style={{ fontSize: '10px' }}>{item.operationId}</div>
                    <div className="h2-premium">{item.description}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.cliente}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className="financial-stat-value" style={{ color: isIngreso ? 'var(--green)' : 'var(--red)', fontSize: '16px' }}>
                        {isIngreso ? '+' : '-'}${item.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: isVencido ? 'var(--red)' : 'var(--amber)', marginTop: '2px' }}>
                        {isVencido ? 'VENCIDO: ' : 'Vence: '}{item.dueDate || item.date}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span className="badge badge-info">
                    {item.category}
                </span>
                <button
                    onClick={() => onAction(item)}
                    className="btn btn-small"
                    style={{
                        background: isIngreso ? 'var(--green-soft)' : 'var(--red-soft)',
                        color: isIngreso ? 'var(--green)' : 'var(--red)',
                        border: `1px solid ${isIngreso ? 'rgba(94, 138, 117, 0.2)' : 'rgba(161, 107, 107, 0.2)'}`,
                    }}
                >
                    {isIngreso ? 'Marcar Cobrado' : 'Marcar Pagado'}
                </button>
            </div>
        </div>
    )
}
