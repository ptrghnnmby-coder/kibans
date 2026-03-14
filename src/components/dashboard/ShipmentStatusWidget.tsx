'use client'

import { useState, useEffect } from 'react'
import { Ship, MapPin, AlertTriangle, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface ShipmentStatus {
    opId: string
    container: string
    status: string
    location: string
    etd: string
    eta: string
    vessel: string
    updatedAt: string
}

// Map API statuses to display info using brand CSS variables
const STATUS_META: Record<string, { label: string; varColor: string; dot: string }> = {
    DELAYED: { label: 'Demorada', varColor: 'var(--red)', dot: '#ef4444' },
    LOADING: { label: 'En Carga', varColor: 'var(--orange)', dot: '#f97316' },
    DEPARTED: { label: 'Zarpó', varColor: 'var(--accent)', dot: '#1a3b5c' },
    IN_TRANSIT: { label: 'En Tránsito', varColor: 'var(--cyan)', dot: '#06b6d4' },
    ARRIVED: { label: 'Llegó', varColor: 'var(--green)', dot: '#22c55e' },
    UNKNOWN: { label: 'Sin datos', varColor: 'var(--text-dim)', dot: '#6b7280' },
}

const STATUS_ORDER = ['DELAYED', 'LOADING', 'DEPARTED', 'IN_TRANSIT', 'ARRIVED', 'UNKNOWN']

function getMeta(status: string) {
    return STATUS_META[status] || STATUS_META.UNKNOWN
}

function fmtShort(dateStr?: string) {
    if (!dateStr) return '—'
    try {
        const d = new Date(dateStr)
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    } catch { return dateStr }
}

/** Days until ETA (negative = already past) */
function daysUntil(eta?: string) {
    if (!eta) return null
    try {
        const diff = new Date(eta).getTime() - Date.now()
        return Math.round(diff / 86400000)
    } catch { return null }
}

/** Progress 0–100 based on ETD→ETA window */
function progress(etd?: string, eta?: string) {
    if (!etd || !eta) return 0
    try {
        const start = new Date(etd).getTime()
        const end = new Date(eta).getTime()
        const now = Date.now()
        if (end <= start) return 0
        return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))
    } catch { return 0 }
}

const MAX_VISIBLE = 6

export function ShipmentStatusWidget() {
    const [shipments, setShipments] = useState<ShipmentStatus[]>([])
    const [loading, setLoading] = useState(true)
    const [showAll, setShowAll] = useState(false)
    // filterKey is a display-group key, not a raw API status
    const [filterKey, setFilterKey] = useState<string | null>(null)

    // Maps display group key -> array of raw statuses it covers
    const FILTER_GROUP_STATUSES: Record<string, string[]> = {
        DELAYED: ['DELAYED'],
        LOADING: ['LOADING'],
        EN_VIAJE: ['DEPARTED', 'IN_TRANSIT'],
        ARRIVED: ['ARRIVED'],
        UNKNOWN: ['UNKNOWN'],
    }

    useEffect(() => {
        fetch('/api/tracking/cache-list')
            .then(r => r.json())
            .then(d => { if (d.success) setShipments(d.data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    // Sort: DELAYED first, then by ETA ascending (earliest first), ARRIVED last
    const sorted = [...shipments].sort((a, b) => {
        const oa = STATUS_ORDER.indexOf(a.status)
        const ob = STATUS_ORDER.indexOf(b.status)
        if (oa !== ob) return oa - ob
        if (!a.eta && !b.eta) return 0
        if (!a.eta) return 1
        if (!b.eta) return -1
        return new Date(a.eta).getTime() - new Date(b.eta).getTime()
    })

    const activeStatuses = filterKey ? FILTER_GROUP_STATUSES[filterKey] ?? [] : null
    const filtered = activeStatuses ? sorted.filter(s => activeStatuses.includes(s.status)) : sorted
    const visible = showAll ? filtered : filtered.slice(0, MAX_VISIBLE)
    const hiddenCount = Math.max(0, filtered.length - MAX_VISIBLE)

    // Count per display group
    const groupCounts: Record<string, number> = {}
    for (const [groupKey, statuses] of Object.entries(FILTER_GROUP_STATUSES)) {
        groupCounts[groupKey] = shipments.filter(x => statuses.includes(x.status)).length
    }

    const summaryGroups = [
        { key: 'DELAYED', label: 'Demoradas', dot: '#ef4444', color: 'var(--red)' },
        { key: 'LOADING', label: 'En Carga', dot: '#f97316', color: 'var(--orange)' },
        { key: 'EN_VIAJE', label: 'En Viaje', dot: '#06b6d4', color: 'var(--cyan)' },
        { key: 'ARRIVED', label: 'Llegaron', dot: '#22c55e', color: 'var(--green)' },
        { key: 'UNKNOWN', label: 'Sin Información', dot: '#6b7280', color: 'var(--text-dim)' },
    ].filter(g => groupCounts[g.key] > 0)

    return (
        <div className="card flex flex-col" style={{ gap: 0 }}>
            {/* ── Header ── */}
            <div className="card-header pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="card-title">
                    <Ship size={17} color="var(--accent)" />
                    Estado de Cargas
                </h2>
                <Link href="/operaciones" className="btn btn-secondary btn-small" style={{ fontSize: '11px' }}>
                    Ver todas <ChevronRight size={12} />
                </Link>
            </div>

            {loading ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                    Cargando…
                </div>
            ) : shipments.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <Ship size={28} style={{ margin: '0 auto 8px', opacity: 0.25 }} />
                    <p style={{ fontSize: '13px' }}>Sin cargas con tracking activo</p>
                </div>
            ) : (
                <>
                    {/* ── Status summary pills ── */}
                    {summaryGroups.length > 0 && (
                        <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border)',
                        }}>
                            {summaryGroups.map(g => {
                                const isActive = filterKey === g.key
                                return (
                                    <button
                                        key={g.key}
                                        onClick={() => {
                                            setFilterKey(prev => prev === g.key ? null : g.key)
                                            setShowAll(false)
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            padding: '4px 10px',
                                            borderRadius: '20px',
                                            border: isActive ? `1.5px solid ${g.dot}` : '1px solid var(--border)',
                                            background: isActive ? `color-mix(in srgb, ${g.dot} 14%, var(--surface-raised))` : 'var(--surface-raised)',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: 'var(--text)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: g.dot, display: 'inline-block', flexShrink: 0 }} />
                                        <span style={{ color: g.color, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{groupCounts[g.key]}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{g.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {/* ── Operation rows ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 0' }}>
                        {visible.map(s => {
                            const meta = getMeta(s.status)
                            const days = daysUntil(s.eta)
                            const pct = progress(s.etd, s.eta)
                            const isDelayed = s.status === 'DELAYED'
                            const isArrived = s.status === 'ARRIVED'
                            const daysLabel = days === null ? ''
                                : days < 0 ? `hace ${Math.abs(days)}d`
                                    : days === 0 ? 'hoy'
                                        : `en ${days}d`

                            return (
                                <Link
                                    key={s.opId}
                                    href={`/operaciones/${s.opId}?tab=logistica`}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'auto 1fr auto',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '9px 16px',
                                        textDecoration: 'none',
                                        borderLeft: isDelayed ? '3px solid var(--red)' : '3px solid transparent',
                                        transition: 'background 0.12s',
                                    }}
                                    className="hover:bg-surface-raised"
                                >
                                    {/* Status dot */}
                                    <span style={{
                                        width: 8, height: 8, borderRadius: '50%',
                                        background: meta.dot, flexShrink: 0,
                                        boxShadow: isDelayed ? `0 0 6px ${meta.dot}` : 'none',
                                    }} />

                                    {/* Center: ID + location + progress */}
                                    <div style={{ overflow: 'hidden', minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                                                {s.opId}
                                            </span>
                                            <span style={{
                                                fontSize: '10px', fontWeight: 700,
                                                color: meta.varColor,
                                                background: `color-mix(in srgb, ${meta.dot} 12%, transparent)`,
                                                padding: '1px 6px', borderRadius: '8px', flexShrink: 0,
                                            }}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        {s.location && (
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                <MapPin size={9} style={{ display: 'inline', marginRight: '2px', verticalAlign: 'middle' }} />
                                                {s.location}
                                            </div>
                                        )}
                                        {/* Progress bar — only for non-arrived ops with ETD+ETA */}
                                        {!isArrived && s.etd && s.eta && (
                                            <div style={{ marginTop: '5px', height: '3px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%',
                                                    width: `${pct}%`,
                                                    background: isDelayed ? 'var(--red)' : 'var(--accent)',
                                                    borderRadius: '2px',
                                                    transition: 'width 0.3s',
                                                }} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: ETA */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {s.eta ? (
                                            <>
                                                <div style={{ fontSize: '11px', fontWeight: 800, color: isDelayed ? 'var(--red)' : isArrived ? 'var(--green)' : 'var(--text)' }}>
                                                    {fmtShort(s.eta)}
                                                </div>
                                                <div style={{ fontSize: '10px', color: isDelayed ? 'var(--red)' : 'var(--text-dim)', marginTop: '1px' }}>
                                                    {daysLabel}
                                                </div>
                                            </>
                                        ) : (
                                            <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>—</span>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>

                    {/* ── Show more / show less ── */}
                    {filtered.length > MAX_VISIBLE && (
                        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)' }}>
                            <button
                                onClick={() => setShowAll(p => !p)}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--accent)', fontSize: '11px', fontWeight: 700,
                                    padding: 0, display: 'flex', alignItems: 'center', gap: '4px',
                                }}
                            >
                                {showAll
                                    ? 'Mostrar menos ↑'
                                    : `Ver ${hiddenCount} más ↓`}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
