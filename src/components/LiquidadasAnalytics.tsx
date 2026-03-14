'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, DollarSign, Package, Filter, ArrowUp, ArrowDown, Loader2, AlertTriangle, BarChart2, Users, Building, MapPin, ChevronRight } from 'lucide-react'
import { getResponsableName, Operacion } from '@/lib/sheets-types'
import { UserAvatar } from '@/components/ui/UserAvatar'

export interface EnrichedOp extends Operacion {
    ingreso: number
    costo: number
    ganancia: number
    margen: number
}

// ─────────────────────────── helpers ───────────────────────────

function fmt(n: number): string {
    if (!isFinite(n) || n === 0) return '$0'
    const abs = Math.abs(n)
    const sign = n < 0 ? '-' : ''
    return `${sign}$${Math.abs(Math.round(n)).toLocaleString('es-AR')}`
}

function fmtExact(n: number): string {
    if (!isFinite(n)) return '$0'
    const sign = n < 0 ? '-' : ''
    return `${sign}$${Math.abs(Math.round(n)).toLocaleString('es-AR')}`
}

function pctColor(m: number) {
    if (m >= 20) return 'var(--green)'
    if (m >= 10) return 'var(--cyan)'
    if (m >= 0) return 'var(--amber)'
    return 'var(--red)'
}

function pctBg(m: number) {
    if (m >= 20) return 'rgba(52,211,153,0.12)'
    if (m >= 10) return 'rgba(34,211,238,0.12)'
    if (m >= 0) return 'rgba(251,191,36,0.12)'
    return 'rgba(248,113,113,0.12)'
}

// ─────────────────────── SVG Bar Chart ───────────────────────

function BarChart({ data, height = 120, color = 'var(--accent)' }: {
    data: { label: string; value: number }[]
    height?: number
    color?: string
}) {
    if (!data.length) return null
    const max = Math.max(...data.map(d => d.value), 1)
    const BAR_W = Math.min(40, Math.floor(280 / data.length) - 6)
    const GAP = Math.max(6, Math.floor(20 / data.length))
    const W = data.length * (BAR_W + GAP) + GAP
    return (
        <svg width="100%" viewBox={`0 0 ${W} ${height + 24}`} style={{ overflow: 'visible' }}>
            {data.map((d, i) => {
                const barH = Math.max(4, (d.value / max) * height)
                const x = i * (BAR_W + GAP) + GAP
                const y = height - barH
                return (
                    <g key={i}>
                        <rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill={color} opacity={0.85} />
                        <text x={x + BAR_W / 2} y={height + 14} textAnchor="middle" fontSize={8} fill="var(--text-dim)">
                            {d.label.length > 7 ? d.label.slice(0, 6) + '…' : d.label}
                        </text>
                    </g>
                )
            })}
        </svg>
    )
}

// ─────────────────── Mini Sparkline ───────────────────

function Sparkline({ values, color = 'var(--accent)' }: { values: number[], color?: string }) {
    if (values.length < 2) return null
    const max = Math.max(...values, 1)
    const min = Math.min(...values, 0)
    const range = max - min || 1
    const W = 80, H = 28
    const pts = values.map((v, i) => {
        const x = (i / (values.length - 1)) * W
        const y = H - ((v - min) / range) * H
        return `${x.toFixed(1)},${y.toFixed(1)}`
    }).join(' ')
    return (
        <svg width={W} height={H} style={{ overflow: 'visible' }}>
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// ─────────────────── Donut chart ───────────────────

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
    const total = segments.reduce((s, d) => s + Math.max(d.value, 0), 0) || 1
    const R = 36, CX = 40, CY = 40, stroke = 18
    let cumulative = 0
    const circumference = 2 * Math.PI * R
    return (
        <svg width={80} height={80} viewBox="0 0 80 80">
            {segments.map((seg, i) => {
                const pct = Math.max(seg.value, 0) / total
                const offset = circumference - pct * circumference
                const rotation = cumulative * 360 - 90
                cumulative += pct
                return (
                    <circle
                        key={i}
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={stroke}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        transform={`rotate(${rotation} ${CX} ${CY})`}
                        opacity={0.85}
                    />
                )
            })}
            <circle cx={CX} cy={CY} r={R - stroke / 2 - 1} fill="var(--surface)" />
        </svg>
    )
}

// ─────────────────────────── Main ───────────────────────────

export function LiquidadasAnalytics() {
    const [ops, setOps] = useState<EnrichedOp[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()

    // Filters
    const [filterResponsable, setFilterResponsable] = useState('')
    const [filterCliente, setFilterCliente] = useState('')
    const [filterProductor, setFilterProductor] = useState('')
    const [filterDestino, setFilterDestino] = useState('')
    const [filterYear, setFilterYear] = useState('')
    const [filterMinMargen, setFilterMinMargen] = useState<number | ''>('')

    // Sort
    const [sortField, setSortField] = useState<'id' | 'ganancia' | 'margen' | 'ingreso'>('ganancia')
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

    // Filter panel
    const [showFilters, setShowFilters] = useState(false)

    // View
    const [activeView, setActiveView] = useState<'resumen' | 'tabla' | 'clientes' | 'responsables' | 'productores'>('resumen')

    useEffect(() => {
        fetch('/api/operaciones/historial-analytics')
            .then(r => r.json())
            .then(d => {
                if (d.success) setOps(d.data)
                else setError(d.error || 'Error al cargar datos')
            })
            .catch(() => setError('Error de red'))
            .finally(() => setLoading(false))
    }, [])

    // ── Derived lists for filters
    const years = useMemo(() =>
        Array.from(new Set(ops.map(op => {
            const m = (op.id || '').match(/-(\d{2,4})$/)
            return m ? (m[1].length === 2 ? `20${m[1]}` : m[1]) : ''
        }).filter(Boolean) as string[])).sort().reverse()
        , [ops])

    const responsables = useMemo(() => Array.from(new Set(ops.map(op => getResponsableName(op.userId)))).sort(), [ops])
    const clientes = useMemo(() => Array.from(new Set(ops.map(op => op.cliente).filter(Boolean) as string[])).sort(), [ops])
    const productores = useMemo(() => Array.from(new Set(ops.map(op => op.productor).filter(Boolean) as string[])).sort(), [ops])
    const destinos = useMemo(() => Array.from(new Set(ops.map(op => op.puertoDestino).filter(Boolean) as string[])).sort(), [ops])

    // ── Filtered set
    const filtered = useMemo(() => ops.filter(op => {
        if (filterResponsable && getResponsableName(op.userId) !== filterResponsable) return false
        if (filterCliente && op.cliente !== filterCliente) return false
        if (filterProductor && op.productor !== filterProductor) return false
        if (filterDestino && op.puertoDestino !== filterDestino) return false
        if (filterYear) {
            const m = (op.id || '').match(/-(\d{2,4})$/)
            const yr = m ? (m[1].length === 2 ? `20${m[1]}` : m[1]) : ''
            if (yr !== filterYear) return false
        }
        if (filterMinMargen !== '' && op.margen < filterMinMargen) return false
        return true
    }), [ops, filterResponsable, filterCliente, filterProductor, filterDestino, filterYear, filterMinMargen])

    const sorted = useMemo(() => [...filtered].sort((a, b) => {
        const va = sortField === 'id' ? (a.id || '') : (a as any)[sortField]
        const vb = sortField === 'id' ? (b.id || '') : (b as any)[sortField]
        if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
        return sortDir === 'asc' ? va - vb : vb - va
    }), [filtered, sortField, sortDir])

    // ── KPIs
    const totalIngreso = filtered.reduce((s, o) => s + o.ingreso, 0)
    const totalCosto = filtered.reduce((s, o) => s + o.costo, 0)
    const totalGanancia = filtered.reduce((s, o) => s + o.ganancia, 0)
    const avgMargen = filtered.length > 0 ? filtered.reduce((s, o) => s + o.margen, 0) / filtered.length : 0
    const bestMargen = filtered.length > 0 ? Math.max(...filtered.map(o => o.margen)) : 0
    const withData = filtered.filter(o => o.ingreso > 0)

    // ── Group by helper
    function groupBy(field: 'cliente' | 'responsable' | 'productor' | 'puertoDestino') {
        const map: Record<string, { count: number; ingreso: number; ganancia: number; costo: number }> = {}
        for (const op of filtered) {
            const key = field === 'responsable' ? getResponsableName(op.userId) : ((op as any)[field] || '—')
            if (!map[key]) map[key] = { count: 0, ingreso: 0, ganancia: 0, costo: 0 }
            map[key].count++
            map[key].ingreso += op.ingreso
            map[key].costo += op.costo
            map[key].ganancia += op.ganancia
        }
        return Object.entries(map)
            .map(([name, d]) => ({ name, ...d, margen: d.ingreso > 0 ? (d.ganancia / d.ingreso) * 100 : 0 }))
            .sort((a, b) => b.ganancia - a.ganancia)
    }

    // Sort toggle button
    const SortBtn = ({ field }: { field: typeof sortField }) => (
        <button onClick={() => {
            if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
            else { setSortField(field); setSortDir('desc') }
        }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'inline-flex', alignItems: 'center', color: sortField === field ? 'var(--accent)' : 'var(--text-dim)' }}>
            {sortField === field && sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
        </button>
    )

    const hasFilters = filterResponsable || filterCliente || filterProductor || filterDestino || filterYear || filterMinMargen !== ''
    const clearFilters = () => { setFilterResponsable(''); setFilterCliente(''); setFilterProductor(''); setFilterDestino(''); setFilterYear(''); setFilterMinMargen('') }

    // ── Loading / Error
    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '16px' }}>
            <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent)' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Cargando análisis de operaciones liquidadas...</p>
        </div>
    )

    if (error) return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '32px', color: 'var(--red)', background: 'rgba(248,113,113,0.08)', borderRadius: '12px' }}>
            <AlertTriangle size={18} /><span style={{ fontSize: '13px' }}>{error}</span>
        </div>
    )

    // ── Filter pill row
    const FilterSelect = ({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: string[] }) => (
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
                value={value}
                onChange={e => set(e.target.value)}
                className="input"
                style={{
                    padding: '6px 28px 6px 10px', fontSize: '11px', borderRadius: '20px',
                    minWidth: 0, appearance: 'none', cursor: 'pointer',
                    background: value ? 'var(--accent)' : 'var(--surface-raised)',
                    color: value ? 'white' : 'var(--text-muted)',
                    border: value ? '1px solid var(--accent)' : '1px solid var(--border)',
                    fontWeight: value ? 700 : 400,
                    whiteSpace: 'nowrap'
                }}
            >
                <option value="">{label}</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <ChevronRight size={10} style={{ position: 'absolute', right: '8px', color: value ? 'white' : 'var(--text-dim)', pointerEvents: 'none', transform: 'rotate(90deg)' }} />
        </div>
    )

    // ── Charts for Resumen view
    const topClientes = groupBy('cliente').slice(0, 6)
    const topResponsables = groupBy('responsable').slice(0, 5)
    const topDestinos = groupBy('puertoDestino').slice(0, 5)

    // Margin distribution buckets
    const margenBuckets = [
        { label: '<0%', value: withData.filter(o => o.margen < 0).length, color: 'var(--red)' },
        { label: '0-10%', value: withData.filter(o => o.margen >= 0 && o.margen < 10).length, color: 'var(--amber)' },
        { label: '10-20%', value: withData.filter(o => o.margen >= 10 && o.margen < 20).length, color: 'var(--cyan)' },
        { label: '>20%', value: withData.filter(o => o.margen >= 20).length, color: 'var(--green)' },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* ── Filter button + counter bar ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '7px 14px', borderRadius: '20px', cursor: 'pointer',
                            border: hasFilters ? '1px solid var(--accent)' : '1px solid var(--border)',
                            background: hasFilters ? 'var(--accent-soft)' : 'var(--surface-raised)',
                            color: hasFilters ? 'var(--accent)' : 'var(--text-muted)',
                            fontSize: '12px', fontWeight: 600, transition: 'all 0.15s'
                        }}
                    >
                        <Filter size={13} />
                        Filtros
                        {hasFilters && (
                            <span style={{
                                width: 16, height: 16, borderRadius: '50%',
                                background: 'var(--accent)', color: 'white',
                                fontSize: '9px', fontWeight: 800,
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {[filterResponsable, filterCliente, filterProductor, filterDestino, filterYear, filterMinMargen !== '' ? '1' : ''].filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    {/* Filter Panel */}
                    {showFilters && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50,
                            background: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-lg)', padding: '16px', minWidth: '280px',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                                Aplicar Filtros
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: 'Responsable', value: filterResponsable, set: setFilterResponsable, options: responsables },
                                    { label: 'Importador (Cliente)', value: filterCliente, set: setFilterCliente, options: clientes },
                                    { label: 'Productor', value: filterProductor, set: setFilterProductor, options: productores },
                                    { label: 'Destino', value: filterDestino, set: setFilterDestino, options: destinos },
                                    { label: 'Año', value: filterYear, set: setFilterYear, options: years },
                                ].map(f => (
                                    <div key={f.label}>
                                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.label}</div>
                                        <select
                                            value={f.value}
                                            onChange={e => f.set(e.target.value)}
                                            style={{
                                                width: '100%', padding: '6px 10px', borderRadius: '8px',
                                                border: f.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                                                background: 'var(--surface-raised)', color: 'var(--text)',
                                                fontSize: '12px', outline: 'none', cursor: 'pointer'
                                            }}
                                        >
                                            <option value=''>Todos</option>
                                            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                                        </select>
                                    </div>
                                ))}
                                <div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Margen Mínimo (%)</div>
                                    <input
                                        type='number' value={filterMinMargen}
                                        onChange={e => setFilterMinMargen(e.target.value === '' ? '' : Number(e.target.value))}
                                        placeholder='ej: 5'
                                        min={-100} max={100}
                                        style={{
                                            width: '100%', padding: '6px 10px', borderRadius: '8px',
                                            border: filterMinMargen !== '' ? '1px solid var(--accent)' : '1px solid var(--border)',
                                            background: 'var(--surface-raised)', color: 'var(--text)',
                                            fontSize: '12px', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>
                            {hasFilters && (
                                <button onClick={clearFilters} style={{
                                    marginTop: '12px', width: '100%', padding: '7px', borderRadius: '8px',
                                    border: '1px solid var(--border)', background: 'transparent',
                                    color: 'var(--text-dim)', fontSize: '12px', cursor: 'pointer'
                                }}>Limpiar filtros</button>
                            )}
                        </div>
                    )}
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginLeft: 'auto' }}>
                    {filtered.length} / {ops.length} ops
                </div>
            </div>

            {/* ── KPI Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                {[
                    {
                        label: 'Ganancia Neta', value: fmtExact(totalGanancia), sub: `${withData.length} ops con datos`,
                        icon: <DollarSign size={16} />, color: totalGanancia >= 0 ? 'var(--green)' : 'var(--red)',
                        spark: withData.slice(-8).map(o => o.ganancia)
                    },
                    {
                        label: 'Margen Promedio', value: `${avgMargen.toFixed(1)}%`, sub: `Máx ${bestMargen.toFixed(0)}%`,
                        icon: <BarChart2 size={16} />, color: pctColor(avgMargen),
                        spark: withData.slice(-8).map(o => o.margen)
                    },
                    {
                        label: 'Operaciones', value: `${filtered.length}`, sub: `${withData.length} con CashFlow`,
                        icon: <Package size={16} />, color: 'var(--cyan)',
                        spark: null
                    },
                ].map((kpi, i) => (
                    <div key={i} className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '8px', background: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                                {kpi.icon}
                            </div>
                            {kpi.spark && kpi.spark.length >= 2 && <Sparkline values={kpi.spark} color={kpi.color} />}
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 900, color: kpi.color, lineHeight: 1.1, marginTop: '8px' }}>{kpi.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{kpi.label}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: '1px' }}>{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* ── View tabs ── */}
            <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'var(--surface-raised)', borderRadius: '12px', width: 'fit-content' }}>
                {([
                    { id: 'resumen', label: 'Resumen', icon: <BarChart2 size={12} /> },
                    { id: 'tabla', label: 'Por Operación', icon: <Package size={12} /> },
                    { id: 'clientes', label: 'Clientes', icon: <Users size={12} /> },
                    { id: 'responsables', label: 'Responsables', icon: <Users size={12} /> },
                    { id: 'productores', label: 'Productores', icon: <Building size={12} /> },
                ] as const).map(t => (
                    <button key={t.id} onClick={() => setActiveView(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: activeView === t.id ? 700 : 400,
                        background: activeView === t.id ? 'var(--accent)' : 'transparent',
                        color: activeView === t.id ? 'white' : 'var(--text-muted)',
                        transition: 'all 0.15s'
                    }}>
                        {t.icon}{t.label}
                    </button>
                ))}
            </div>

            {/* ── RESUMEN view ── */}
            {activeView === 'resumen' && (
                <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>

                    {/* Top Clientes bar chart */}
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                            Top Clientes — Ganancia
                        </div>
                        {topClientes.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Sin datos</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {topClientes.map((c, i) => {
                                    const maxG = topClientes[0].ganancia || 1
                                    const pct = Math.max(0, (c.ganancia / maxG) * 100)
                                    return (
                                        <div key={c.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{c.name}</span>
                                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{c.count} op</span>
                                                    <span style={{ fontSize: '12px', fontWeight: 800, color: c.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>{c.ingreso > 0 ? fmtExact(c.ganancia) : '—'}</span>
                                                    {c.ingreso > 0 && <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '10px', background: pctBg(c.margen), color: pctColor(c.margen), fontWeight: 700 }}>{c.margen.toFixed(0)}%</span>}
                                                </div>
                                            </div>
                                            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: c.ganancia >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: '2px', transition: 'width 0.4s' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Top Responsables */}
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                            Por Responsable
                        </div>
                        {topResponsables.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Sin datos</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {topResponsables.map((r, i) => (
                                    <div key={r.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '12px', fontWeight: 700 }}>{r.name}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{r.count} ops · {r.ingreso > 0 ? fmtExact(r.ingreso) : '—'} ventas</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '13px', fontWeight: 900, color: r.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>{r.ingreso > 0 ? fmtExact(r.ganancia) : '—'}</div>
                                            {r.ingreso > 0 && <div style={{ fontSize: '10px', color: pctColor(r.margen), fontWeight: 700 }}>{r.margen.toFixed(1)}%</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Margin distribution donut */}
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>
                            Distribución de Margen
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <DonutChart segments={margenBuckets.map(b => ({ label: b.label, value: b.value, color: b.color }))} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {margenBuckets.map(b => (
                                    <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: b.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.label}</span>
                                        <span style={{ fontSize: '12px', fontWeight: 800, marginLeft: 'auto', color: b.color }}>{b.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Top Destinos */}
                    <div className="card" style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                            <MapPin size={12} style={{ color: 'var(--text-dim)' }} />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Top Destinos</span>
                        </div>
                        {topDestinos.length === 0 ? (
                            <p style={{ color: 'var(--text-dim)', fontSize: '12px' }}>Sin datos</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {topDestinos.map((d, i) => {
                                    const maxC = topDestinos[0].count || 1
                                    return (
                                        <div key={d.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{d.name}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{d.count} contenedores</span>
                                            </div>
                                            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${(d.count / maxC) * 100}%`, background: 'var(--accent)', borderRadius: '2px' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ─ Tabla de operaciones liquidadas ─ */}
                <LiquidadasTable ops={filtered} />
                </>
            )}

            {/* ── TABLA view ── */}
            {activeView === 'tabla' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', minWidth: '780px' }}>
                            <thead>
                                <tr>
                                    <th style={{ padding: '10px 14px' }}>OP ID <SortBtn field="id" /></th>
                                    <th style={{ padding: '10px 16px' }}>Responsable</th>
                                    <th style={{ padding: '10px 16px' }}>Entidades</th>
                                    <th style={{ padding: '10px 16px' }}>Destino</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Ingreso <SortBtn field="ingreso" /></th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Costo</th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Ganancia <SortBtn field="ganancia" /></th>
                                    <th style={{ padding: '10px 16px', textAlign: 'right' }}>Margen <SortBtn field="margen" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.length === 0 ? (
                                    <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-dim)' }}>Sin operaciones en este rango</td></tr>
                                ) : sorted.map(op => (
                                    <tr 
                                        key={op.id}
                                        className="clickable-row group"
                                        onClick={() => router.push(`/operaciones/${op.id}?tab=finanzas&historial=1`)}
                                        style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                                    >
                                        <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{op.id}</td>
                                        <td style={{ padding: '9px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <UserAvatar email={op.userId || ''} size={18} variant="outlined" />
                                                <span style={{ fontSize: '12px' }}>{getResponsableName(op.userId)}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '9px 16px', minWidth: '180px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{op.cliente || '—'}</div>
                                                {op.exportador && (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{op.exportador}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '9px 16px', fontSize: '12px', color: 'var(--text-muted)' }}>{op.puertoDestino || '—'}</td>
                                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 700, fontSize: '12px', color: 'var(--green)' }}>
                                            {op.ingreso > 0 ? fmt(op.ingreso) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '9px 16px', textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {op.costo > 0 ? fmt(op.costo) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '9px 16px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: op.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                            {op.ingreso > 0 ? fmt(op.ganancia) : <span style={{ color: 'var(--text-dim)', fontSize: '11px' }}>Sin datos</span>}
                                        </td>
                                        <td style={{ padding: '9px 16px', textAlign: 'right' }}>
                                            {op.ingreso > 0 ? (
                                                <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, background: pctBg(op.margen), color: pctColor(op.margen) }}>
                                                    {op.margen.toFixed(1)}%
                                                </span>
                                            ) : <span style={{ color: 'var(--text-dim)' }}>—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {sorted.length > 0 && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span>{sorted.length} operaciones</span>
                            <div style={{ display: 'flex', gap: '20px', fontWeight: 700 }}>
                                <span>Total: <span style={{ color: 'var(--green)' }}>{fmt(totalIngreso)}</span></span>
                                <span>Ganancia: <span style={{ color: totalGanancia >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmt(totalGanancia)}</span></span>
                                <span>Margen: <span style={{ color: pctColor(avgMargen) }}>{avgMargen.toFixed(1)}%</span></span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── GROUP views ── */}
            {(activeView === 'clientes' || activeView === 'responsables' || activeView === 'productores') && (() => {
                const field = activeView === 'clientes' ? 'cliente' : activeView === 'responsables' ? 'responsable' : 'productor'
                const data = groupBy(field as any)
                const maxG = Math.max(...data.map(d => Math.max(d.ganancia, 0)), 1)
                return (
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table className="table" style={{ width: '100%', minWidth: '580px' }}>
                                <thead>
                                    <tr>
                                        <th style={{ padding: '10px 16px' }}>{activeView === 'clientes' ? 'Cliente' : activeView === 'responsables' ? 'Responsable' : 'Productor'}</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Ops</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Ingresos</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Ganancia</th>
                                        <th style={{ padding: '10px 16px', textAlign: 'right' }}>Margen</th>
                                        <th style={{ padding: '10px 16px' }}>Participación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((row, i) => (
                                        <tr key={row.name}>
                                            <td style={{ padding: '10px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent-soft)', color: 'var(--accent)', fontSize: '9px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                                                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{row.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 700 }}>{row.count}</td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 700, color: 'var(--green)' }}>{row.ingreso > 0 ? fmt(row.ingreso) : '—'}</td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 800, fontSize: '13px', color: row.ganancia >= 0 ? 'var(--green)' : 'var(--red)' }}>
                                                {row.ingreso > 0 ? fmt(row.ganancia) : <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Sin datos</span>}
                                            </td>
                                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                                                {row.ingreso > 0 ? <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 800, background: pctBg(row.margen), color: pctColor(row.margen) }}>{row.margen.toFixed(1)}%</span> : '—'}
                                            </td>
                                            <td style={{ padding: '10px 16px', minWidth: '100px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <div style={{ flex: 1, height: '5px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', borderRadius: '3px', background: row.ganancia >= 0 ? 'var(--green)' : 'var(--red)', width: `${Math.max(0, (row.ganancia / maxG) * 100)}%`, transition: 'width 0.4s' }} />
                                                    </div>
                                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)', width: '26px', textAlign: 'right' }}>
                                                        {totalGanancia > 0 ? `${((row.ganancia / totalGanancia) * 100).toFixed(0)}%` : '—'}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            })()}
        </div>
    )
}

// ─── LiquidadasTable: tabla clickeable solo en Resumen ─────────────────────────

function LiquidadasTable({ ops }: { ops: EnrichedOp[] }) {
    const router = useRouter()
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

    if (!ops || ops.length === 0) return null

    return (
        <div className="card" style={{ padding: 0, marginTop: 'var(--space-4)' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={14} style={{ color: 'var(--text-dim)' }} />
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Operaciones Liquidadas ({ops.length})
                </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '520px', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '9px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', background: 'var(--surface-raised)' }}>OP ID</th>
                            <th style={{ padding: '9px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', background: 'var(--surface-raised)' }}>Responsable</th>
                            <th style={{ padding: '9px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', background: 'var(--surface-raised)' }}>Entidades</th>
                            <th style={{ padding: '9px 16px', fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', background: 'var(--surface-raised)' }}>Destino</th>
                            <th style={{ padding: '9px 16px', background: 'var(--surface-raised)', width: '36px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {ops.map(op => (
                            <tr
                                key={op.id}
                                className="clickable-row group"
                                onClick={() => {
                                    setNavigatingTo(op.id || null)
                                    router.push(`/operaciones/${op.id}?tab=finanzas&historial=1`)
                                }}
                                style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                            >
                                <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{op.id}</span>
                                </td>
                                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <UserAvatar email={op.userId || ''} size={28} variant="outlined" />
                                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{getResponsableName(op.userId)}</span>
                                    </div>
                                </td>
                                <td style={{ padding: '14px 16px', minWidth: '220px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{op.cliente || '—'}</span>
                                        </div>
                                        {op.exportador && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{op.exportador}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)', fontSize: '13px', whiteSpace: 'nowrap' }}>{op.puertoDestino || '—'}</td>
                                <td style={{ padding: '11px 16px', textAlign: 'right', width: '36px' }}>
                                    {navigatingTo === op.id
                                        ? <Loader2 size={15} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                        : <ChevronRight size={16} style={{ color: 'var(--text-dim)' }} />
                                    }
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
