'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Calendar, Clock, CheckCircle2, Circle, Plus,
    X, User, ChevronRight, ChevronLeft,
    Trash2, AlertCircle, ExternalLink
} from 'lucide-react'
import { USER_MAP, Producto, Contacto } from '@/lib/sheets-types'
import { Package } from 'lucide-react'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import { AgendaItem } from '@/lib/sheets-types'
import { UnifiedCreationModal } from './UnifiedCreationModal'

const SimpleCard = ({ children, className, style }: any) => (
    <div className={`card ${className}`} style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        position: 'relative',
        ...style
    }}>
        {children}
    </div>
)

const SimpleButton = ({ children, onClick, className, disabled, variant = 'primary', size = 'md' }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            padding: size === 'sm' ? '5px 10px' : '8px 14px',
            background: variant === 'ghost' ? 'transparent' : variant === 'secondary' ? 'var(--surface-raised)' : 'var(--accent)',
            color: variant === 'ghost' ? 'var(--text-muted)' : 'white',
            border: variant === 'secondary' ? '1px solid var(--border)' : 'none',
            borderRadius: 'var(--radius-md)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
            fontSize: size === 'sm' ? '11px' : '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1
        }}
    >
        {children}
    </button>
)

export function AgendaWidget({ userName, userEmail = '', hideFinancials = false }: { userName: string, userEmail?: string, hideFinancials?: boolean }) {
    const router = useRouter()
    const { showToast } = useToast()
    const [items, setItems] = useState<AgendaItem[]>([])
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<Producto[]>([])
    const [contacts, setContacts] = useState<Contacto[]>([])
    const [modalInitialType, setModalInitialType] = useState<'NOTE' | 'TASK' | 'MEETING'>('TASK')
    const [editItem, setEditItem] = useState<AgendaItem | undefined>()
    const [dayOffset, setDayOffset] = useState(0)
    const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
    const [showOverdue, setShowOverdue] = useState(false)
    const [itemToDelete, setItemToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [selectedResponsible, setSelectedResponsible] = useState<string>('todos')
    const [viewType, setViewType] = useState<'ALL' | 'PAYMENTS' | 'COLLECTIONS' | 'EVENTS'>('ALL')

    // Initialize from localStorage
    useEffect(() => {
        const savedResponsible = localStorage.getItem('agenda_selected_responsible')
        const savedViewType = localStorage.getItem('agenda_view_type') as 'ALL' | 'PAYMENTS' | 'COLLECTIONS' | 'EVENTS'
        if (savedResponsible) setSelectedResponsible(savedResponsible)
        else if (userEmail) setSelectedResponsible(userEmail.toLowerCase())
        if (savedViewType) setViewType(savedViewType)
    }, [userEmail])

    useEffect(() => {
        if (selectedResponsible) localStorage.setItem('agenda_selected_responsible', selectedResponsible)
    }, [selectedResponsible])

    useEffect(() => {
        if (viewType) localStorage.setItem('agenda_view_type', viewType)
    }, [viewType])

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => new Set(Array.from(prev).concat(id)))
    }

    // === COMPUTED DAY ===
    const today = new Date()
    const currentDate = new Date(today)
    currentDate.setDate(today.getDate() + dayOffset)
    const currentDateStr = currentDate.toISOString().split('T')[0]
    const isThisToday = currentDate.toDateString() === today.toDateString()
    const isTomorrow = currentDate.toDateString() === new Date(new Date().setDate(today.getDate() + 1)).toDateString()
    const isYesterday = currentDate.toDateString() === new Date(new Date().setDate(today.getDate() - 1)).toDateString()
    const dayLabel = isThisToday ? 'HOY'
        : isTomorrow ? 'MAÑANA'
            : isYesterday ? 'AYER'
                : currentDate.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase()
    const dayNum = currentDate.getDate()
    const monthLabel = currentDate.toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()

    // === DATA FETCHING ===
    const fetchItems = async () => {
        setLoading(true)
        try {
            // Fetch wide range so navigating days doesn't require re-fetch
            const start = new Date(today); start.setDate(today.getDate() - 14)
            const end = new Date(today); end.setDate(today.getDate() + 30)
            const startDate = start.toISOString().split('T')[0]
            const endDate = end.toISOString().split('T')[0]

            const [agendaRes, cashFlowRes] = await Promise.all([
                fetch(`/api/dashboard/agenda?startDate=${startDate}&endDate=${endDate}&responsibleEmail=${encodeURIComponent(selectedResponsible)}`),
                fetch(`/api/dashboard/cashflow?responsibleEmail=${encodeURIComponent(selectedResponsible)}`)
            ])
            const [agendaData, cashFlowData] = await Promise.all([agendaRes.json(), cashFlowRes.json()])

            let combinedItems: AgendaItem[] = []
            if (agendaData.success) combinedItems = [...agendaData.data]

            if (cashFlowData.success && !hideFinancials) {
                const financialItems: AgendaItem[] = cashFlowData.data.map((tx: any) => ({
                    id: tx.id,
                    date: tx.dueDate || tx.date,
                    title: `${tx.description} (${tx.operationId || 'S/ID'})`,
                    type: tx.type === 'INGRESO' ? 'COLLECTION' : 'PAYMENT',
                    status: tx.status === 'PAGADO' ? 'DONE' : 'PENDING',
                    amount: tx.amount,
                    operationId: tx.operationId,
                    creator: 'Sistema'
                }))
                combinedItems = [...combinedItems, ...financialItems]
            }
            setItems(combinedItems)
        } catch (error) {
            console.error('Error fetching agenda:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchLookups = async () => {
        try {
            const [pRes, cRes] = await Promise.all([fetch('/api/productos'), fetch('/api/contactos')])
            const [pData, cData] = await Promise.all([pRes.json(), cRes.json()])
            if (pData.success) setProducts(pData.data)
            if (cData.success) setContacts(cData.data)
        } catch (e) { console.error('Error fetching lookups:', e) }
    }

    useEffect(() => {
        fetchItems()
        fetchLookups()
    }, [selectedResponsible])

    // === ACTIONS ===
    const handleToggleStatus = async (item: AgendaItem) => {
        if (item.type === 'PAYMENT' || item.type === 'COLLECTION') {
            router.push('/finanzas?tab=pending'); return
        }
        const newStatus = item.status === 'DONE' ? 'PENDING' : 'DONE'
        try {
            const res = await fetch('/api/dashboard/agenda', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...item, status: newStatus })
            })
            if (res.ok) setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
        } catch (error) { console.error('Error toggling status:', error) }
    }

    const handleOpenModal = (type: 'NOTE' | 'TASK' | 'MEETING', item?: AgendaItem) => {
        setModalInitialType(type); setEditItem(item); setShowModal(true)
    }

    const confirmDelete = async () => {
        if (!itemToDelete) return
        setIsDeleting(true)
        try {
            const res = await fetch(`/api/dashboard/agenda?id=${itemToDelete}&userEmail=${encodeURIComponent(userEmail)}`, { method: 'DELETE' })
            if (res.ok) { setItems(items.filter(i => i.id !== itemToDelete)); showToast('Ocultado de la agenda', 'success') }
            else showToast('Error al eliminar el pendiente', 'error')
        } catch (error) { showToast('Error de conexión', 'error') }
        finally { setIsDeleting(false); setItemToDelete(null) }
    }

    // === FILTERED ITEMS ===
    const filterByView = (i: AgendaItem) => {
        if (viewType === 'PAYMENTS') return i.type === 'PAYMENT'
        if (viewType === 'COLLECTIONS') return i.type === 'COLLECTION'
        if (viewType === 'EVENTS') return i.type === 'TASK' || i.type === 'MEETING'
        return true
    }

    const overdueItems = items.filter(i =>
        (i.type === 'PAYMENT' || i.type === 'COLLECTION') &&
        i.status === 'PENDING' &&
        i.date < currentDateStr &&
        filterByView(i)
    ).sort((a, b) => a.date.localeCompare(b.date))

    const dayItems = items.filter(i =>
        i.date === currentDateStr &&
        !dismissedIds.has(i.id) &&
        filterByView(i)
    ).sort((a, b) => {
        const timeA = a.time || '99:99', timeB = b.time || '99:99'
        if (timeA !== timeB) return timeA.localeCompare(timeB)
        const typeRank = { 'MEETING': 1 as const, 'TASK': 2 as const, 'PAYMENT': 3 as const, 'COLLECTION': 4 as const }
        return (typeRank[a.type] || 99) - (typeRank[b.type] || 99)
    })

    return (
        <SimpleCard className="">
            {/* ===== HEADER ===== */}
            <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--border)',
                background: 'var(--surface-raised)',
                display: 'flex', flexDirection: 'column', gap: '10px'
            }}>
                {/* Row 1: Title + Responsible + Nuevo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Calendar size={15} color="var(--accent)" />
                        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
                            AGENDA
                        </span>
                        <select
                            value={selectedResponsible}
                            onChange={(e) => setSelectedResponsible(e.target.value)}
                            style={{
                                background: 'var(--bg)', border: '1px solid var(--border)',
                                color: 'var(--text-muted)', fontSize: '10px',
                                padding: '3px 7px', borderRadius: 'var(--radius-md)',
                                outline: 'none', cursor: 'pointer', maxWidth: '120px'
                            }}
                        >
                            <option value="todos">Todos</option>
                            {Object.entries(USER_MAP)
                                .filter(([email]) => !['info@southmarinetrading.com', 'demo@southmarinetrading.com', 'marta@southmarinetrading.com'].includes(email.toLowerCase()))
                                .map(([email, user]) => (
                                    <option key={email} value={email.toLowerCase()}>{(user as any).name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        {overdueItems.length > 0 && (
                            <button onClick={() => setShowOverdue(true)} style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                                borderRadius: 'var(--radius-md)', color: 'var(--red)',
                                padding: '4px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                            }}>
                                <AlertCircle size={11} /> {overdueItems.length} atras.
                            </button>
                        )}
                        <SimpleButton size="sm" onClick={() => handleOpenModal('TASK')}>
                            <Plus size={13} /> Nuevo
                        </SimpleButton>
                    </div>
                </div>

                {/* Row 2: Day navigator + View tabs (brand manual) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* ← [6 MAR · HOY] → */}
                    <div style={{
                        display: 'flex', alignItems: 'stretch',
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0
                    }}>
                        <button onClick={() => setDayOffset(dayOffset - 1)} style={{
                            background: 'transparent', border: 'none', borderRight: '1px solid var(--border)',
                            color: 'var(--text-muted)', padding: '6px 10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', transition: 'background 0.15s'
                        }}>
                            <ChevronLeft size={15} />
                        </button>
                        <button
                            onClick={() => setDayOffset(0)}
                            title="Volver a hoy"
                            style={{
                                background: 'transparent', border: 'none',
                                padding: '6px 14px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                minWidth: '130px', justifyContent: 'center'
                            }}
                        >
                            <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
                                {dayNum} {monthLabel}
                            </span>
                            <span style={{
                                fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em',
                                color: isThisToday ? 'var(--accent)' : 'var(--text-dim)',
                                background: isThisToday ? 'rgba(100,160,255,0.15)' : 'transparent',
                                padding: '1px 6px', borderRadius: '20px',
                                border: isThisToday ? '1px solid rgba(100,160,255,0.3)' : 'none'
                            }}>
                                {dayLabel}
                            </span>
                        </button>
                        <button onClick={() => setDayOffset(dayOffset + 1)} style={{
                            background: 'transparent', border: 'none', borderLeft: '1px solid var(--border)',
                            color: 'var(--text-muted)', padding: '6px 10px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', transition: 'background 0.15s'
                        }}>
                            <ChevronRight size={15} />
                        </button>
                    </div>

                    {/* Brand Manual Tabs */}
                    <div className="tab-nav" style={{ margin: 0, padding: '2px', gap: '2px', flexWrap: 'wrap' }}>
                        {(['ALL', 'EVENTS', 'PAYMENTS', 'COLLECTIONS'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setViewType(t)}
                                className={`tab-btn${viewType === t ? ' active' : ''}`}
                                style={{ padding: '4px 9px', fontSize: '11px' }}
                            >
                                {t === 'ALL' ? 'Todo' : t === 'EVENTS' ? 'Eventos' : t === 'PAYMENTS' ? 'Pagos' : 'Cobros'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== DAY CONTENT ===== */}
            <div className="agenda-scroll" style={{
                flex: 1, overflowY: 'auto',
                padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px',
                minHeight: '160px'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '10px', color: 'var(--text-dim)' }}>
                        <div className="agenda-spinner" />
                        <span style={{ fontSize: '12px' }}>Cargando...</span>
                    </div>
                ) : dayItems.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', gap: '10px' }}>
                        <Calendar size={30} color="var(--text-dim)" style={{ opacity: 0.3 }} />
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0, textAlign: 'center' }}>
                            Sin eventos para este día
                        </p>
                        <button
                            onClick={() => handleOpenModal('TASK')}
                            style={{
                                fontSize: '12px', color: 'var(--accent)',
                                background: 'transparent', border: '1px dashed rgba(100,160,255,0.4)',
                                padding: '6px 16px', borderRadius: 'var(--radius-md)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                                marginTop: '4px', fontWeight: 500
                            }}
                        >
                            <Plus size={13} /> Agregar tarea
                        </button>
                    </div>
                ) : (
                    dayItems.map(item => (
                        <div key={item.id} className="agenda-item-card" style={{
                            padding: '10px 12px',
                            background: item.type === 'PAYMENT'
                                ? 'rgba(239,68,68,0.05)'
                                : item.type === 'COLLECTION'
                                    ? 'rgba(34,197,94,0.05)'
                                    : 'var(--surface-raised)',
                            borderRadius: 'var(--radius-md)',
                            border: `1px solid ${item.type === 'PAYMENT'
                                ? 'rgba(239,68,68,0.2)'
                                : item.type === 'COLLECTION'
                                    ? 'rgba(34,197,94,0.2)'
                                    : 'var(--border)'}`,
                            display: 'flex', flexDirection: 'column', gap: '6px',
                            opacity: item.status === 'DONE' ? 0.55 : 1,
                            transition: 'all 0.15s', position: 'relative'
                        }}>
                            {/* Dismiss button for financial items */}
                            {(item.type === 'PAYMENT' || item.type === 'COLLECTION') && (
                                <button onClick={() => handleDismiss(item.id)} className="dismiss-btn" title="Ocultar" style={{
                                    position: 'absolute', top: '6px', right: '6px',
                                    background: 'transparent', border: 'none', color: 'var(--text-dim)',
                                    cursor: 'pointer', padding: '2px', opacity: 0.45, display: 'flex'
                                }}>
                                    <X size={11} />
                                </button>
                            )}

                            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                {/* Status toggle */}
                                <button onClick={() => handleToggleStatus(item)} style={{
                                    background: 'transparent', border: 'none', padding: 0, marginTop: '2px',
                                    cursor: (item.type === 'TASK' || item.type === 'MEETING') ? 'pointer' : 'default',
                                    color: item.status === 'DONE' ? 'var(--green)' : 'var(--text-dim)', flexShrink: 0
                                }}>
                                    {item.type === 'PAYMENT' ? <ExternalLink size={14} color="var(--red)" /> :
                                        item.type === 'COLLECTION' ? <ExternalLink size={14} color="var(--green)" /> :
                                            item.status === 'DONE' ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                                </button>

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p 
                                        onClick={() => (item.type === 'TASK' || item.type === 'MEETING') ? handleOpenModal(item.type, item) : null}
                                        style={{
                                        fontSize: '12px', margin: 0, fontWeight: 600, wordBreak: 'break-word',
                                        textDecoration: item.status === 'DONE' ? 'line-through' : 'none',
                                        color: item.type === 'MEETING' ? 'var(--cyan)'
                                            : item.type === 'PAYMENT' ? 'var(--red)'
                                                : item.type === 'COLLECTION' ? 'var(--green)'
                                                    : 'var(--text)',
                                        cursor: (item.type === 'TASK' || item.type === 'MEETING') ? 'pointer' : 'default'
                                    }}>
                                        {item.title}
                                    </p>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px', flexWrap: 'wrap' }}>
                                        {item.time && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '10px', color: 'var(--text-dim)' }}>
                                                <Clock size={10} /> {item.time}
                                            </span>
                                        )}
                                        {item.amount !== undefined && (
                                            <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: item.type === 'PAYMENT' ? 'var(--red)' : 'var(--green)' }}>
                                                {item.type === 'PAYMENT' ? '-' : '+'}${item.amount.toLocaleString()}
                                            </span>
                                        )}
                                        {item.productId && (
                                            <span style={{ fontSize: '10px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                                <Package size={9} /> {products.find(p => p.id === item.productId)?.especie || 'Producto'}
                                            </span>
                                        )}
                                        {item.contactId && (
                                            <span style={{ fontSize: '10px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                                <User size={9} /> {contacts.find(c => c.id === item.contactId)?.empresa || 'Contacto'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Delete for tasks/meetings */}
                                {(item.type !== 'PAYMENT' && item.type !== 'COLLECTION') && (
                                    <button
                                        onClick={() => setItemToDelete(item.id)}
                                        className="dismiss-btn hover-visible"
                                        title="Ocultar de mi agenda"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', opacity: 0.15, flexShrink: 0, padding: '2px' }}
                                    >
                                        <X size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Link for financial items */}
                            {(item.type === 'PAYMENT' || item.type === 'COLLECTION') && (
                                <div
                                    onClick={() => item.operationId ? router.push(`/operaciones/${item.operationId}`) : router.push('/finanzas?tab=pending')}
                                    style={{ fontSize: '10px', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px', cursor: 'pointer', opacity: 0.8 }}
                                >
                                    {item.operationId ? `Ver Op. ${item.operationId}` : 'Ver en Finanzas'}
                                    <ChevronRight size={10} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* ===== OVERDUE SIDE PANEL ===== */}
            {showOverdue && (
                <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}
                    onClick={() => setShowOverdue(false)}
                >
                    <div
                        style={{ width: '300px', maxWidth: '90vw', background: 'var(--surface-raised)', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', animation: 'slideInRight 0.3s cubic-bezier(0.16,1,0.3,1)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239,68,68,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertCircle size={14} color="var(--red)" />
                                <h3 style={{ fontSize: '12px', fontWeight: 700, margin: 0, color: 'var(--red)', letterSpacing: '0.05em' }}>PAGOS ATRASADOS</h3>
                            </div>
                            <button onClick={() => setShowOverdue(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="agenda-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {overdueItems.map(pay => (
                                <div key={pay.id} style={{
                                    background: 'var(--surface)', border: '1px solid var(--border)',
                                    borderLeft: `3px solid ${pay.type === 'PAYMENT' ? 'var(--red)' : 'var(--green)'}`,
                                    padding: '10px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '4px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)' }}>{pay.title}</span>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: pay.type === 'PAYMENT' ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                                            {pay.type === 'PAYMENT' ? '-' : '+'}${pay.amount?.toLocaleString()}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            Vencido {new Date(pay.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                        <button onClick={() => router.push('/finanzas?tab=pending')} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '10px', cursor: 'pointer', padding: 0 }}>
                                            Ir a Finanzas →
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <UnifiedCreationModal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setEditItem(undefined) }}
                onSuccess={() => { fetchItems(); setShowModal(false); setEditItem(undefined) }}
                userEmail={userEmail}
                userName={userName}
                initialType={modalInitialType}
                editItem={editItem}
            />

            {itemToDelete && (
                <ConfirmModal
                    isOpen={!!itemToDelete}
                    onCancel={() => setItemToDelete(null)}
                    onConfirm={confirmDelete}
                    title="Eliminar Pendiente"
                    message="¿Deseas eliminar este pendiente? Esta acción no se puede deshacer."
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    isDestructive={true}
                    isProcessing={isDeleting}
                />
            )}

            <style jsx>{`
                .agenda-item-card:hover .hover-visible { opacity: 0.8 !important; }
                .dismiss-btn:hover { opacity: 1 !important; color: var(--red) !important; }
                .agenda-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent; }
                .agenda-scroll::-webkit-scrollbar { width: 4px; }
                .agenda-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 10px; }
                .agenda-spinner {
                    width: 20px; height: 20px;
                    border: 2px solid var(--border);
                    border-top-color: var(--accent);
                    border-radius: 50%;
                    animation: agendaSpin 0.8s linear infinite;
                }
                @keyframes agendaSpin { to { transform: rotate(360deg); } }
                @keyframes slideInRight {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
            `}</style>
        </SimpleCard>
    )
}
