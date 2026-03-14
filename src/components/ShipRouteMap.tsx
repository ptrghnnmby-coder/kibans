'use client'

import { useMemo } from 'react'

interface ShipRouteMapProps {
    portOfLoading: string
    portOfDischarge: string
    etd?: string
    eta?: string
    vessel?: string
    carrierColor?: string
    waypoints?: string[]
    arrived?: boolean  // true only when status === 'ARRIVED'
}

function calcProgress(etd?: string, eta?: string): number {
    if (!etd || !eta) return 0
    const start = new Date(etd).getTime()
    const end = new Date(eta).getTime()
    const now = Date.now()
    if (now <= start) return 0
    if (now >= end) return 1
    return (now - start) / (end - start)
}

function daysRemaining(eta?: string): number | null {
    if (!eta) return null
    const diff = new Date(eta).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function daysElapsed(etd?: string): number | null {
    if (!etd) return null
    const diff = Date.now() - new Date(etd).getTime()
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

export function ShipRouteMap({
    portOfLoading,
    portOfDischarge,
    etd,
    eta,
    vessel,
    carrierColor = '#3B82F6',
    waypoints = [],
    arrived = false
}: ShipRouteMapProps) {
    const rawProgress = useMemo(() => calcProgress(etd, eta), [etd, eta])
    // Cap at 95% if not confirmed arrived — avoids "100% / 0 days left" when ship is still at sea
    const progress = arrived ? rawProgress : Math.min(rawProgress, 0.95)
    const isDelayed = !arrived && rawProgress >= 1  // ETA passed but not arrived

    const remaining = daysRemaining(eta)
    const elapsed = daysElapsed(etd)
    const totalDays = (etd && eta)
        ? Math.ceil((new Date(eta).getTime() - new Date(etd).getTime()) / (1000 * 60 * 60 * 24))
        : null

    const pct = Math.round(progress * 100)

    // SVG dimensions
    const W = 600, H = 110
    const PAD_L = 60, PAD_R = 60
    const routeW = W - PAD_L - PAD_R
    const midY = 54
    const curveH = 32 // how high the arc goes above the line

    // Path: cubic bezier arc from left to right
    const x0 = PAD_L, y0 = midY
    const x1 = W - PAD_R, y1 = midY
    const cx1 = PAD_L + routeW * 0.3, cy1 = midY - curveH
    const cx2 = PAD_L + routeW * 0.7, cy2 = midY - curveH

    // Ship position along the bezier curve
    const t = progress
    // Cubic bezier formula
    const shipX = useMemo(() => {
        const t2 = t * t, t3 = t2 * t
        const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt
        return mt3 * x0 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x1
    }, [t])
    const shipY = useMemo(() => {
        const t2 = t * t, t3 = t2 * t
        const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt
        return mt3 * y0 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y1
    }, [t])

    const pathD = `M ${x0} ${y0} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x1} ${y1}`

    // Waypoint positions along curve (spread evenly)
    const waypointTs = waypoints.length > 0
        ? waypoints.map((_, i) => (i + 1) / (waypoints.length + 1))
        : []

    const getPointOnCurve = (t: number) => {
        const t2 = t * t, t3 = t2 * t
        const mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt
        return {
            x: mt3 * x0 + 3 * mt2 * t * cx1 + 3 * mt * t2 * cx2 + t3 * x1,
            y: mt3 * y0 + 3 * mt2 * t * cy1 + 3 * mt * t2 * cy2 + t3 * y1,
        }
    }

    const isArrived = arrived || false
    const isDeparted = progress > 0

    return (
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '16px', border: '1px solid var(--border)' }}>

            {/* Progress stats row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Posición Aproximada del Envío
                </div>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {elapsed !== null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: carrierColor }}>{elapsed}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>días en ruta</div>
                        </div>
                    )}
                    {totalDays !== null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-muted)' }}>{totalDays}</div>
                            <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>días totales</div>
                        </div>
                    )}
                    {remaining !== null && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: remaining <= 5 ? 'var(--green)' : 'var(--text-muted)' }}>
                                {remaining > 0 ? remaining : '—'}
                            </div>
                            <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>días restantes</div>
                        </div>
                    )}
                    <div style={{
                        padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 800,
                        background: isDelayed ? 'rgba(239,68,68,0.15)' : `${carrierColor}20`,
                        color: isDelayed ? '#EF4444' : carrierColor,
                        border: `1px solid ${isDelayed ? 'rgba(239,68,68,0.4)' : carrierColor + '40'}`
                    }}>
                        {isArrived ? '✓ Llegó' : isDelayed ? 'Demorado' : `${pct}%`}
                    </div>
                </div>
            </div>

            {/* SVG Route */}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                style={{ width: '100%', height: 'auto', overflow: 'visible' }}
                preserveAspectRatio="xMidYMid meet"
            >
                <defs>
                    <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={carrierColor} stopOpacity="0.8" />
                        <stop offset={`${pct}%`} stopColor={carrierColor} stopOpacity="0.8" />
                        <stop offset={`${pct}%`} stopColor="#374151" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#374151" stopOpacity="0.4" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                        <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>

                {/* Background route (dashed, full path grey) */}
                <path d={pathD} fill="none" stroke="#374151" strokeWidth="2.5" strokeDasharray="6,4" />

                {/* Progress overlay (solid, colored) */}
                {isDeparted && (
                    <path
                        d={pathD}
                        fill="none"
                        stroke={carrierColor}
                        strokeWidth="2.5"
                        strokeDasharray={`${pct * routeW / 100 * 1.15} 9999`}
                        filter="url(#glow)"
                    />
                )}

                {/* Origin port dot */}
                <circle cx={x0} cy={y0} r="8" fill={carrierColor} />
                <circle cx={x0} cy={y0} r="4" fill="white" />

                {/* Destination port dot */}
                <circle cx={x1} cy={y1} r="8" fill="none" stroke={isArrived ? carrierColor : '#4B5563'} strokeWidth="2.5" />
                {isArrived && <circle cx={x1} cy={y1} r="4" fill={carrierColor} />}

                {/* Waypoints */}
                {waypointTs.map((wt, i) => {
                    const pt = getPointOnCurve(wt)
                    return (
                        <g key={i}>
                            <circle cx={pt.x} cy={pt.y} r="5" fill={wt <= progress ? carrierColor : '#1F2937'} stroke={carrierColor} strokeWidth="1.5" opacity="0.85" />
                        </g>
                    )
                })}

                {/* Ship icon at current position */}
                {isDeparted && !isArrived && (
                    <g transform={`translate(${shipX}, ${shipY})`}>
                        {/* Glow circle */}
                        <circle cx="0" cy="0" r="14" fill={carrierColor} opacity="0.15" />
                        <circle cx="0" cy="0" r="10" fill={carrierColor} opacity="0.25" />
                        {/* Ship body */}
                        <g transform="translate(-9, -9)" fill={carrierColor} filter="url(#glow)">
                            <path d="M9 2 L14 14 L9 12 L4 14 Z" />
                            <rect x="7" y="8" width="4" height="6" rx="1" fill="white" opacity="0.6" />
                        </g>
                    </g>
                )}

                {/* Port labels */}
                <text x={x0} y={y0 + 22} textAnchor="middle" fontSize="9" fill={carrierColor} fontWeight="700" fontFamily="system-ui">
                    {portOfLoading.split(',')[0].toUpperCase()}
                </text>
                <text x={x1} y={y1 + 22} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="700" fontFamily="system-ui">
                    {portOfDischarge.split(',')[0].toUpperCase()}
                </text>

                {/* Waypoint labels */}
                {waypointTs.map((wt, i) => {
                    const pt = getPointOnCurve(wt)
                    return (
                        <text key={i} x={pt.x} y={pt.y + 16} textAnchor="middle" fontSize="8" fill="#6B7280" fontFamily="system-ui">
                            {waypoints[i].split(',')[0].length > 10 ? waypoints[i].split(',')[0].slice(0, 10) + '…' : waypoints[i].split(',')[0]}
                        </text>
                    )
                })}
            </svg>

            {/* Footer: vessel + note */}
            {vessel && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
                    🚢 <strong style={{ color: 'var(--text-muted)' }}>{vessel}</strong>
                    <span style={{ marginLeft: '6px', opacity: 0.6 }}>· Posición estimada según ETD/ETA</span>
                </div>
            )}
        </div>
    )
}
