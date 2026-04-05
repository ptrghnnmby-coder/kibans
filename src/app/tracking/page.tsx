'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
    RefreshCw, Ship, MapPin, CheckCircle2, AlertTriangle,
    Clock3, HelpCircle, Anchor, Package, Navigation2, Search,
    ExternalLink, RotateCcw, ArrowRight
} from 'lucide-react'
import { ShipTrackingTimeline } from '@/components/ShipTrackingTimeline'
import { AIFeatureBadge } from '@/components/AIFeatureBadge'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TrackingRow {
    opId: string
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
    pol?: string
    pod?: string
    updatedAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr?: string) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: '2-digit' })
    } catch { return dateStr }
}

function getDaysRemaining(eta?: string, etd?: string) {
    if (!eta) return null
    const etaMs = new Date(eta).getTime()
    const now = Date.now()
    if (isNaN(etaMs)) return null
    const totalMs = etd ? etaMs - new Date(etd).getTime() : null
    const remaining = Math.ceil((etaMs - now) / 86400000)
    const total = totalMs ? Math.ceil(totalMs / 86400000) : null
    const elapsed = total !== null ? Math.max(0, total - remaining) : 0
    return { remaining, elapsed, total: total ?? 0 }
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; dot: string; trackStatus: string }> = {
    IN_TRANSIT: { label: 'En Tránsito', color: '#dca64b', bg: 'rgba(220,166,75,0.12)', border: 'rgba(220,166,75,0.3)', dot: '#dca64b', trackStatus: 'IN_TRANSIT' },
    ARRIVED:    { label: 'Llegó al destino', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', dot: '#22c55e', trackStatus: 'ARRIVED' },
    DELAYED:    { label: 'Demorado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', dot: '#ef4444', trackStatus: 'DELAYED' },
    DEPARTED:   { label: 'Zarpó', color: '#dca64b', bg: 'rgba(220,166,75,0.12)', border: 'rgba(220,166,75,0.3)', dot: '#dca64b', trackStatus: 'DEPARTED' },
    LOADING:    { label: 'En Carga', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', dot: '#f59e0b', trackStatus: 'LOADING' },
    UNKNOWN:    { label: 'Sin Datos', color: '#64748b', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.3)', dot: '#64748b', trackStatus: 'EMPTY' },
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TrackingPage() {
    const router = useRouter()
    const [rows, setRows] = useState<TrackingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [expanded, setExpanded] = useState<string | null>(null)

    async function load(isRefresh = false) {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await fetch('/api/tracking/cache-list')
            const json = await res.json()
            if (json.success) setRows(json.data || [])
        } catch (e) { console.error(e) }
        finally { setLoading(false); setRefreshing(false) }
    }

    useEffect(() => { load() }, [])

    const filtered = useMemo(() => {
        let result = rows.filter(r => r.booking)
        if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)
        if (search.trim()) {
            const q = search.toLowerCase()
            result = result.filter(r =>
                r.opId?.toLowerCase().includes(q) ||
                r.cliente?.toLowerCase().includes(q) ||
                r.container?.toLowerCase().includes(q) ||
                r.booking?.toLowerCase().includes(q) ||
                r.vessel?.toLowerCase().includes(q)
            )
        }
        return result
    }, [rows, search, statusFilter])

    const stats = useMemo(() => ({
        total: rows.length,
        inTransit: rows.filter(r => r.status === 'IN_TRANSIT' || r.status === 'DEPARTED').length,
        arrived: rows.filter(r => r.status === 'ARRIVED').length,
        delayed: rows.filter(r => r.status === 'DELAYED').length,
    }), [rows])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>

            {/* ── HEADER ── */}
            <div style={{
                padding: '20px 28px 0',
                background: 'var(--surface)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
                            Centro de Cargas
                        </div>
                        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', margin: 0 }}>
                            Tracking en Tiempo Real
                        </h1>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0' }}>
                            Seguimiento visual de tus embarques activos
                        </p>
                    </div>
                    <AIFeatureBadge 
                        title="Predicción de Arribo" 
                        description="Tess analiza el historial de rutas, congestión portuaria en tiempo real y patrones de navegación para predecir el ETA con una precisión superior a la de las navieras." 
                        position="bottom"
                    />
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

                {/* Stat pills + search */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingBottom: '14px' }}>
                    {[
                        { key: 'all',        label: `Todos (${stats.total})`,          color: 'var(--text-muted)' },
                        { key: 'IN_TRANSIT', label: `🚢 En Tránsito (${stats.inTransit})`, color: '#dca64b' },
                        { key: 'ARRIVED',    label: `✅ Llegados (${stats.arrived})`,   color: '#22c55e' },
                        { key: 'DELAYED',    label: `⚠️ Demorados (${stats.delayed})`,  color: '#ef4444' },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setStatusFilter(tab.key)} style={{
                            padding: '5px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                            background: statusFilter === tab.key ? `${tab.color}18` : 'transparent',
                            border: `1px solid ${statusFilter === tab.key ? tab.color : 'var(--border)'}`,
                            color: statusFilter === tab.key ? tab.color : 'var(--text-dim)',
                            cursor: 'pointer', transition: 'all 0.18s'
                        }}>
                            {tab.label}
                        </button>
                    ))}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '5px 12px' }}>
                        <Search size={13} color="var(--text-dim)" />
                        <input
                            value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar op, cliente, buque..."
                            style={{ background: 'none', border: 'none', outline: 'none', fontSize: '12px', color: 'var(--text)', width: '190px' }}
                        />
                    </div>
                </div>
            </div>

            {/* ── CARDS ── */}
            <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                        <p style={{ fontSize: '14px', margin: 0 }}>Cargando datos de tracking...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
                        <Navigation2 size={40} style={{ opacity: 0.2, marginBottom: '16px' }} />
                        <p style={{ fontSize: '14px', margin: 0 }}>No hay operaciones con datos de tracking.</p>
                    </div>
                ) : (
                    filtered.map(row => (
                        <TrackingCard
                            key={row.opId}
                            row={row}
                            isExpanded={expanded === row.opId}
                            onToggle={() => setExpanded(prev => prev === row.opId ? null : row.opId)}
                            onNavigate={() => router.push(`/operaciones/${row.opId}?tab=logistica`)}
                        />
                    ))
                )}
            </div>
        </div>
    )
}

// ─── Tracking Card ─────────────────────────────────────────────────────────────

function TrackingCard({ row, isExpanded, onToggle, onNavigate }: {
    row: TrackingRow
    isExpanded: boolean
    onToggle: () => void
    onNavigate: () => void
}) {
    const cfg = STATUS_CONFIG[row.status] || STATUS_CONFIG.UNKNOWN
    const days = getDaysRemaining(row.eta, row.etd)
    const isLate = row.eta && new Date(row.eta).getTime() < Date.now()
    const pct = days && days.total > 0 ? Math.min(100, Math.max(0, (days.elapsed / days.total) * 100)) : (row.status === 'ARRIVED' ? 100 : 0)

    return (
        <div style={{
            background: 'var(--surface)',
            border: `1px solid ${isExpanded ? 'rgba(220,166,75,0.3)' : 'var(--border)'}`,
            borderRadius: '16px',
            overflow: 'hidden',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: isExpanded ? '0 8px 32px rgba(0,0,0,0.2)' : 'none'
        }}>
            {/* Card header — always visible */}
            <div
                onClick={onToggle}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}
            >
                {/* Op ID */}
                <div style={{ minWidth: '80px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Operación</div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-mono)' }}>{row.opId}</div>
                </div>

                {/* Cliente */}
                <div style={{ flex: 1, minWidth: '120px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Cliente</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{row.cliente}</div>
                </div>

                {/* Route */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 2, minWidth: '200px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>POL</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{row.pol || 'Buenos Aires'}</div>
                    </div>
                    <div style={{ flex: 1, height: '2px', background: 'linear-gradient(90deg, var(--accent), rgba(220,166,75,0.3))', borderRadius: '1px', position: 'relative' }}>
                        <Ship size={14} color="var(--accent)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--surface)', padding: '1px' }} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginBottom: '2px' }}>POD</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{row.pod || row.puertoDestino}</div>
                    </div>
                </div>

                {/* ETD / ETA */}
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>ETD</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#f97316', fontFamily: 'var(--font-mono)' }}>{fmt(row.etd)}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>ETA</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', fontFamily: 'var(--font-mono)' }}>{fmt(row.eta)}</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{ minWidth: '80px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>Progreso</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: isLate ? '#ef4444' : 'var(--text)' }}>
                            {row.status === 'ARRIVED' ? '100%' : days ? `${Math.round(pct)}%` : '—'}
                        </span>
                    </div>
                    <div style={{ height: '4px', background: 'var(--surface-raised)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: '2px', background: isLate ? '#ef4444' : pct > 80 ? '#f59e0b' : '#dca64b', transition: 'width 0.5s ease' }} />
                    </div>
                </div>

                {/* Status badge */}
                <span style={{
                    padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                    color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.color, boxShadow: `0 0 6px ${cfg.color}`, display: 'inline-block' }} />
                    {cfg.label}
                </span>

                {/* Expand chevron */}
                <div style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </div>

            {/* Expanded detail — timeline + info cards */}
            {isExpanded && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px' }}>
                    {/* Timeline */}
                    <ShipTrackingTimeline
                        status={cfg.trackStatus}
                        etd={row.etd}
                        eta={row.eta}
                        pol={`${row.pol || 'Buenos Aires'}, Argentina`}
                        pod={`${row.pod || row.puertoDestino}`}
                        vessel={row.vessel}
                        currentLocation={row.location}
                        lastUpdated="Hace instantes"
                    />

                    {/* Info pills below timeline */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
                        {[
                            { label: 'ETD (Salida)', value: fmt(row.etd), color: '#f97316' },
                            { label: 'ETA (Llegada)', value: fmt(row.eta), color: '#22c55e' },
                            { label: 'Buque', value: row.vessel || '—' },
                            { label: 'Ubicación Actual', value: row.location || '—' },
                            { label: 'Booking', value: row.booking },
                            { label: 'Contenedor', value: row.container },
                        ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: color || 'var(--text)', fontFamily: label === 'Booking' || label === 'Contenedor' ? 'var(--font-mono)' : 'inherit' }}>{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Open operation button */}
                    <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={onNavigate} className="btn btn-secondary" style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <ExternalLink size={13} />
                            Ver operación {row.opId}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
