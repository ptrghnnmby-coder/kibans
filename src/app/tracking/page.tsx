'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    Navigation2, RefreshCw, Ship, MapPin, Clock, ArrowRight,
    ChevronUp, ChevronDown, ChevronsUpDown, Search, Filter,
    CheckCircle2, AlertTriangle, Clock3, HelpCircle, Anchor
} from 'lucide-react'
import { USER_MAP } from '@/lib/sheets-types'
import { UserAvatar } from '@/components/ui/UserAvatar'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackingRow {
    opId: string
    userId: string
    cliente: string
    puertoDestino: string
    booking: string
    container: string
    etd: string
    eta: string
    status: string
    location: string
    vessel: string
    voyage: string
    updatedAt: string
}

type SortKey = 'opId' | 'cliente' | 'puertoDestino' | 'etd' | 'eta' | 'daysRemaining' | 'status'
type SortDir = 'asc' | 'desc'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(dateStr?: string) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    } catch { return dateStr }
}

function getDaysRemaining(eta?: string, etd?: string): { elapsed: number; total: number } | null {
    if (!eta) return null
    const now = Date.now()
    const etaMs = new Date(eta).getTime()
    if (isNaN(etaMs)) return null

    const totalMs = etd ? etaMs - new Date(etd).getTime() : null
    const remainingMs = etaMs - now
    const remaining = Math.ceil(remainingMs / 86400000)
    const totalDays = totalMs ? Math.ceil(totalMs / 86400000) : null
    const elapsed = totalDays !== null ? totalDays - remaining : null

    return {
        elapsed: elapsed !== null ? Math.max(0, elapsed) : 0,
        total: totalDays ?? 0
    }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
    IN_TRANSIT: { label: 'En Tránsito', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.25)', icon: Ship },
    ARRIVED: { label: 'Llegó', color: '#22c55e', bg: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.25)', icon: CheckCircle2 },
    DELAYED: { label: 'Demorado', color: '#ef4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', icon: AlertTriangle },
    DEPARTED: { label: 'Zarpó', color: '#38bdf8', bg: 'rgba(56,189,248,0.10)', border: 'rgba(56,189,248,0.25)', icon: Anchor },
    LOADING: { label: 'En Carga', color: '#f59e0b', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', icon: Clock3 },
    EMPTY: { label: 'Vacío', color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.25)', icon: HelpCircle },
    UNKNOWN: { label: 'Sin Datos', color: '#4a5b73', bg: 'rgba(74,91,115,0.10)', border: 'rgba(74,91,115,0.25)', icon: HelpCircle },
}

function StatusBadge({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN
    const Icon = cfg.icon
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
            color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
            whiteSpace: 'nowrap'
        }}>
            <Icon size={11} />
            {cfg.label}
        </span>
    )
}

function DaysBar({ eta, etd }: { eta?: string; etd?: string }) {
    const info = getDaysRemaining(eta, etd)
    if (!info || info.total === 0) return <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>

    const pct = Math.min(100, Math.max(0, (info.elapsed / info.total) * 100))
    const remaining = info.total - info.elapsed
    const isLate = new Date(eta!).getTime() < Date.now()

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '90px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700,
                    color: isLate ? '#ef4444' : 'var(--text)'
                }}>
                    {isLate ? `+${Math.abs(remaining)}d` : `${remaining}/${info.total}d`}
                </span>
            </div>
            <div style={{ height: '4px', background: 'var(--surface-raised)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: '2px',
                    width: `${pct}%`,
                    background: isLate ? '#ef4444' : pct > 80 ? '#f59e0b' : '#38bdf8',
                    transition: 'width 0.3s ease'
                }} />
            </div>
        </div>
    )
}

function SortIcon({ field, sortKey, sortDir }: { field: SortKey; sortKey: SortKey; sortDir: SortDir }) {
    if (field !== sortKey) return <ChevronsUpDown size={13} color="var(--text-dim)" />
    return sortDir === 'asc'
        ? <ChevronUp size={13} color="var(--accent)" />
        : <ChevronDown size={13} color="var(--accent)" />
}

function getResponsableName(email?: string) {
    if (!email) return '—'
    const entry = (USER_MAP as any)[email.toLowerCase()]
    return entry?.name || email.split('@')[0]
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackingPage() {
    const router = useRouter()
    const [rows, setRows] = useState<TrackingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [sortKey, setSortKey] = useState<SortKey>('etd')
    const [sortDir, setSortDir] = useState<SortDir>('asc')

    async function load(isRefresh = false) {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/tracking/cache-list')
            const json = await res.json()
            if (json.success) setRows(json.data || [])
        } catch (e) {
            console.error('Tracking load error:', e)
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => { load() }, [])

    // ─ Filter & Sort ────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        // Only show ops that have a booking/BL — without one, tracking is impossible
        let result = rows.filter(r => r.booking)
        if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(r =>
                r.opId?.toLowerCase().includes(q) ||
                r.cliente?.toLowerCase().includes(q) ||
                r.puertoDestino?.toLowerCase().includes(q) ||
                r.booking?.toLowerCase().includes(q) ||
                r.container?.toLowerCase().includes(q) ||
                getResponsableName(r.userId).toLowerCase().includes(q)
            )
        }

        result.sort((a, b) => {
            let av: any, bv: any
            if (sortKey === 'daysRemaining') {
                av = getDaysRemaining(a.eta, a.etd)?.elapsed ?? 999
                bv = getDaysRemaining(b.eta, b.etd)?.elapsed ?? 999
            } else if (sortKey === 'etd' || sortKey === 'eta') {
                av = new Date(a[sortKey] || '9999').getTime()
                bv = new Date(b[sortKey] || '9999').getTime()
            } else {
                av = (a as any)[sortKey] || ''
                bv = (b as any)[sortKey] || ''
            }
            const dir = sortDir === 'asc' ? 1 : -1
            return av < bv ? -dir : av > bv ? dir : 0
        })

        return result
    }, [rows, search, statusFilter, sortKey, sortDir])

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
        else { setSortKey(key); setSortDir('asc') }
    }

    // ─ Stats ────────────────────────────────────────────────────────────────
    const stats = useMemo(() => ({
        total: rows.length,
        inTransit: rows.filter(r => r.status === 'IN_TRANSIT' || r.status === 'DEPARTED').length,
        arrived: rows.filter(r => r.status === 'ARRIVED').length,
        delayed: rows.filter(r => r.status === 'DELAYED').length,
        noData: rows.filter(r => r.status === 'UNKNOWN' || !r.status).length,
    }), [rows])

    const TH = ({ label, field }: { label: string; field?: SortKey }) => (
        <th
            onClick={field ? () => toggleSort(field) : undefined}
            style={{
                padding: '8px 10px', textAlign: 'left', fontSize: '10px', fontWeight: 700,
                color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.8px',
                whiteSpace: 'nowrap', cursor: field ? 'pointer' : 'default',
                borderBottom: '1px solid var(--border)', background: 'var(--surface-raised)',
                userSelect: 'none', position: 'sticky', top: 0, zIndex: 1
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                {label}
                {field && <SortIcon field={field} sortKey={sortKey} sortDir={sortDir} />}
            </div>
        </th>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', minHeight: '100vh' }}>


            {/* ═══ HEADER ═══ */}
            <div style={{
                padding: '20px 28px 16px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'
            }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                        Centro de Cargas
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0, lineHeight: 1.2 }}>
                        Tracking
                    </h1>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '3px' }}>
                        Seguimiento en tiempo real de tus embarques
                    </p>
                </div>

                <button
                    onClick={() => load(true)}
                    disabled={refreshing}
                    className="btn btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                    <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? 'Actualizando...' : 'Actualizar'}
                </button>
            </div>


            {/* ═══ STATS BAR ═══ */}
            <div style={{
                padding: '12px 28px',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
                display: 'flex', gap: '8px', flexWrap: 'wrap'
            }}>
                {[
                    { key: 'all', label: `Todos (${stats.total})`, color: 'var(--text-muted)' },
                    { key: 'IN_TRANSIT', label: `🚢 En Tránsito (${stats.inTransit})`, color: '#38bdf8' },
                    { key: 'ARRIVED', label: `✅ Llegados (${stats.arrived})`, color: '#22c55e' },
                    { key: 'DELAYED', label: `⚠️ Demorados (${stats.delayed})`, color: '#ef4444' },
                    { key: 'UNKNOWN', label: `❓ Sin Datos (${stats.noData})`, color: '#4a5b73' },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key)}
                        style={{
                            padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                            background: statusFilter === tab.key ? `${tab.color}18` : 'transparent',
                            border: `1px solid ${statusFilter === tab.key ? tab.color : 'var(--border)'}`,
                            color: statusFilter === tab.key ? tab.color : 'var(--text-dim)',
                            cursor: 'pointer', transition: 'all 0.18s'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 12px' }}>
                    <Search size={13} color="var(--text-dim)" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar op, cliente, booking..."
                        style={{ background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text)', width: '190px' }}
                    />
                </div>
            </div>

            {/* ═══ TABLE ═══ */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                            <p style={{ fontSize: '14px', margin: 0 }}>Cargando datos de tracking...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                            <Navigation2 size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                            <p style={{ fontSize: '14px', margin: 0 }}>
                                {search || statusFilter !== 'all' ? 'No hay resultados para ese filtro.' : 'No hay operaciones con datos de tracking.'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', minWidth: '740px', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr>
                                        <TH label="OP ID" field="opId" />
                                        <TH label="Responsable" />
                                        <TH label="Cliente" field="cliente" />
                                        <TH label="Destino" field="puertoDestino" />
                                        <TH label="Booking / Contenedor" />
                                        <TH label="ETD" field="etd" />
                                        <TH label="ETA" field="eta" />
                                        <TH label="Días Faltantes" field="daysRemaining" />
                                        <TH label="Estado" field="status" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((row, idx) => (
                                        <TrackingRow
                                            key={row.opId}
                                            row={row}
                                            idx={idx}
                                            total={filtered.length}
                                            onNavigate={() => router.push(`/operaciones/${row.opId}?tab=logistica`)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ─── Row component ─────────────────────────────────────────────────────────────

function TrackingRow({ row, idx, total, onNavigate }: {
    row: TrackingRow
    idx: number
    total: number
    onNavigate: () => void
}) {
    const [hovered, setHovered] = useState(false)
    const isLast = idx === total - 1

    const tdStyle: React.CSSProperties = {
        padding: '10px 10px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        verticalAlign: 'middle',
        background: hovered ? 'rgba(56,189,248,0.03)' : 'transparent',
        transition: 'background 0.15s'
    }

    return (
        <tr
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{ cursor: 'pointer' }}
        >
            {/* N° Op */}
            <td style={tdStyle} onClick={onNavigate}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
                    color: 'var(--text)'
                }}>
                    {row.opId}
                </span>
            </td>

            {/* Responsable */}
            <td style={tdStyle} onClick={onNavigate}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <UserAvatar email={row.userId} size={26} variant="outlined" />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {getResponsableName(row.userId)}
                    </span>
                </div>
            </td>

            {/* Cliente */}
            <td style={tdStyle} onClick={onNavigate}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '13px' }}>
                    {row.cliente || '—'}
                </span>
            </td>

            {/* Destino */}
            <td style={tdStyle} onClick={onNavigate}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={12} color="var(--text-dim)" />
                    <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: 500 }}>
                        {row.puertoDestino || '—'}
                    </span>
                </div>
            </td>

            {/* Booking / Contenedor */}
            <td style={tdStyle} onClick={onNavigate}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {row.booking && (
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700,
                            color: 'var(--text)', background: 'var(--surface-raised)',
                            padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--border)'
                        }}>
                            🏷 {row.booking}
                        </span>
                    )}
                    {row.container && (
                        <span style={{
                            fontFamily: 'var(--font-mono)', fontSize: '10px',
                            color: 'var(--text-dim)', fontWeight: 500
                        }}>
                            📦 {row.container}
                        </span>
                    )}
                    {!row.booking && !row.container && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>—</span>
                    )}
                </div>
            </td>

            {/* ETD */}
            <td style={tdStyle} onClick={onNavigate}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    color: row.etd ? '#f97316' : 'var(--text-dim)', fontWeight: row.etd ? 700 : 400
                }}>
                    {fmt(row.etd)}
                </span>
            </td>

            {/* ETA */}
            <td style={tdStyle} onClick={onNavigate}>
                <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '12px',
                    color: row.eta ? '#22c55e' : 'var(--text-dim)', fontWeight: row.eta ? 700 : 400
                }}>
                    {fmt(row.eta)}
                </span>
            </td>

            {/* Días Faltantes */}
            <td style={tdStyle} onClick={onNavigate}>
                {row.status === 'UNKNOWN'
                    ? <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>—</span>
                    : <DaysBar eta={row.eta} etd={row.etd} />
                }
            </td>

            {/* Estado */}
            <td style={tdStyle} onClick={onNavigate}>
                <StatusBadge status={row.status} />
            </td>

        </tr>
    )
}
