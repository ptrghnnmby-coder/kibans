'use client'

import { useState, useEffect } from 'react'
import { Ship, MapPin, RefreshCw, Database, ExternalLink, Package, AlertTriangle, MoveRight, Clock, Anchor, ChevronUp, ChevronDown } from 'lucide-react'
import { detectCarrier, type TrackingData, type Carrier, getCarrierTrackingURL } from '@/lib/containerTracking'
import { ShipTrackingTimeline } from './ShipTrackingTimeline'

import type { CachedTrackingRow } from '@/lib/googleSheets'

interface ContainerTrackingWidgetProps {
    trackingIdentifier?: string // Now defaults to booking/BL
    bookingNumber?: string
    containerNumber?: string // Display only
    operationId?: string
    fallbackPol?: string
    fallbackPod?: string
    onTrackingLoaded?: (data: TrackingData) => void
    onDatesUpdated?: (etd: string, eta: string) => void
}

const CARRIER_COLORS: Record<Carrier, string> = {
    MSC: '#3B82F6', MAERSK: '#06B6D4', HAPAG: '#F97316', ZIM: '#A855F7',
    ONE: '#22C55E', CMA_CGM: '#F59E0B', EVERGREEN: '#10B981', COSCO: '#EF4444',
    YANG_MING: '#3B82F6', HMM: '#06B6D4', PIL: '#A855F7', UNKNOWN: '#6B7280'
}

const CARRIER_NAMES: Record<Carrier, string> = {
    MSC: 'MSC', MAERSK: 'Maersk', HAPAG: 'Hapag-Lloyd', ZIM: 'ZIM',
    ONE: 'Ocean Network Express', CMA_CGM: 'CMA CGM', EVERGREEN: 'Evergreen',
    COSCO: 'COSCO Shipping', YANG_MING: 'Yang Ming', HMM: 'HMM', PIL: 'PIL', UNKNOWN: 'Desconocida'
}

const STATUS_LABELS: Record<string, string> = {
    IN_TRANSIT: 'En Tránsito', ARRIVED: 'Llegó al destino', DELAYED: 'Demorado',
    DEPARTED: 'Zarpó', LOADING: 'En Carga', EMPTY: 'Vacío', UNKNOWN: 'Sin datos'
}
const STATUS_COLORS: Record<string, string> = {
    IN_TRANSIT: '#3B82F6', ARRIVED: '#22C55E', DELAYED: '#EF4444',
    DEPARTED: '#06B6D4', LOADING: '#F97316', EMPTY: '#6B7280', UNKNOWN: '#6B7280'
}

function fmt(dateStr?: string) {
    if (!dateStr) return '—'
    try { return new Date(dateStr).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
    catch { return dateStr }
}
function fmtFull(dateStr?: string) {
    if (!dateStr) return '—'
    try { return new Date(dateStr).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) }
    catch { return dateStr }
}

function getProgress(status: string, etd?: string, eta?: string): number {
    if (status === 'DEPARTED' || status === 'LOADING' || status === 'EMPTY') return 10;
    if (status === 'ARRIVED') return 100;
    if (!etd || !eta) return 50;
    
    const start = new Date(etd).getTime();
    const end = new Date(eta).getTime();
    const now = Date.now();
    
    if (now <= start) return 5;
    if (now >= end) return 100;
    
    return Math.max(10, Math.min(95, ((now - start) / (end - start)) * 100));
}
function fmtRelative(dateStr?: string) {
    if (!dateStr) return null
    try {
        const diff = Date.now() - new Date(dateStr).getTime()
        const hours = Math.floor(diff / 3600000)
        if (hours < 1) return 'hace menos de 1h'
        if (hours < 24) return `hace ${hours}h`
        const days = Math.floor(hours / 24)
        return `hace ${days}d`
    } catch { return null }
}

export function ContainerTrackingWidget({ trackingIdentifier, containerNumber, bookingNumber, operationId, fallbackPol, fallbackPod, onTrackingLoaded, onDatesUpdated }: ContainerTrackingWidgetProps) {
    // cached = data loaded instantly from Tracking_Cache sheet
    const [cached, setCached] = useState<CachedTrackingRow | null>(null)
    // live = full tracking data fetched from external API (only on manual refresh)
    const [liveData, setLiveData] = useState<TrackingData | null>(null)
    const [loadingCache, setLoadingCache] = useState(true)
    const [loadingLive, setLoadingLive] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [timelineOpen, setTimelineOpen] = useState(false)
    const [datesSynced, setDatesSynced] = useState(false)

    // MUST track by BL/Booking only, per the user requirement: "No quiero que haga tracking con el container number"
    const activeId = trackingIdentifier
    const carrier = activeId ? detectCarrier(activeId) : 'UNKNOWN'
    const carrierColor = CARRIER_COLORS[carrier] || '#6B7280'
    const manualURL = activeId ? getCarrierTrackingURL(activeId, carrier) : '#'

    // ── On mount: load from cache instantly ──
    useEffect(() => {
        if (!operationId || !activeId) { setLoadingCache(false); return }
        setLoadingCache(true)
        fetch(`/api/tracking/cached?opId=${encodeURIComponent(operationId)}`)
            .then(r => r.json())
            .then(d => { if (d.success) setCached(d.data) })
            .catch(() => { })
            .finally(() => setLoadingCache(false))
    }, [operationId, activeId])

    // ── Manual refresh: call external API + update cache ──
    const handleRefresh = async () => {
        if (!activeId) return
        setLoadingLive(true); setError(null)
        try {
            const opParam = operationId ? `?opId=${encodeURIComponent(operationId)}` : ''
            // POST first to force cache update, then GET live data
            await fetch(`/api/tracking/${activeId}${opParam}`, { method: 'POST' })
            const res = await fetch(`/api/tracking/${activeId}${opParam}`)
            const data = await res.json()
            if (data.success) {
                setLiveData(data.data)
                onTrackingLoaded?.(data.data)
                // Refresh the cached display too
                if (operationId) {
                    fetch(`/api/tracking/cached?opId=${encodeURIComponent(operationId)}`)
                        .then(r => r.json())
                        .then(d => { if (d.success) setCached(d.data) })
                        .catch(() => { })
                }
                if (operationId && (data.data.etd || data.data.eta)) {
                    try {
                        await fetch(`/api/operaciones/${operationId}/sync-dates`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ etd: data.data.etd, eta: data.data.eta }),
                        })
                        setDatesSynced(true)
                        onDatesUpdated?.(data.data.etd || '', data.data.eta || '')
                    } catch { }
                }
            } else {
                setError(data.error || 'No se pudo obtener información de tracking')
            }
        } catch { setError('Error de conexión') }
        finally { setLoadingLive(false) }
    }

    if (!trackingIdentifier && !containerNumber) return (
        <div style={{ padding: '16px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-dim)' }}>
            <Package size={18} /><span style={{ fontSize: '13px' }}>Sin identificador de Tracking (Falta BL)</span>
        </div>
    )

    if (!trackingIdentifier && containerNumber) return (
        <div style={{ padding: '16px', background: 'rgba(239,68,68,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', gap: '10px', color: '#EF4444' }}>
            <AlertTriangle size={18} /><span style={{ fontSize: '13px', fontWeight: 600 }}>Cargue el BL en la sección Detalles para obtener Tracking real. (No se trackea por contenedor)</span>
        </div>
    )

    // Live data takes priority over cached for display
    const td = liveData
    const status = liveData?.status || cached?.status || 'UNKNOWN'
    const statusColor = STATUS_COLORS[status] || '#6B7280'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--surface)' }}>

            {/* ═══════════ HEADER ═══════════ */}
            <div style={{
                padding: '16px 20px',
                background: `linear-gradient(135deg, ${carrierColor}18 0%, var(--surface-raised) 60%)`,
                borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${carrierColor}20`, border: `1px solid ${carrierColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ship size={20} color={carrierColor} />
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                            Tracking de Embarque
                        </div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
                            {CARRIER_NAMES[carrier]}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {datesSynced && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: '10px' }}>
                            ✓ ETD/ETA actualizado
                        </span>
                    )}
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: `${statusColor}20`, color: statusColor, border: `1px solid ${statusColor}35` }}>
                        {STATUS_LABELS[status]}
                    </span>
                    {bookingNumber && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 700, color: '#f97316', background: 'rgba(249,115,22,0.10)', padding: '3px 10px', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🏷 {bookingNumber}
                        </span>
                    )}
                    {containerNumber && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: carrierColor, background: `${carrierColor}12`, padding: '3px 10px', borderRadius: '6px', border: `1px solid ${carrierColor}28` }}>
                            {containerNumber}
                        </span>
                    )}
                    <button onClick={() => window.open(manualURL, '_blank')} className="btn btn-secondary btn-small" style={{ padding: '6px 8px' }} title="Ver en naviera"><ExternalLink size={13} /></button>
                    <button onClick={handleRefresh} disabled={loadingLive} className="btn btn-secondary btn-small" style={{ padding: '6px 8px' }} title="Actualizar desde naviera"><RefreshCw size={13} className={loadingLive ? 'animate-spin' : ''} /></button>
                </div>
            </div>

            {/* ═══════════ LOADING CACHE ═══════════ */}
            {loadingCache && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <Database size={16} className="animate-spin" style={{ opacity: 0.5 }} />
                    Cargando desde base de datos...
                </div>
            )}

            {/* ═══════════ LOADING LIVE ═══════════ */}
            {loadingLive && (
                <div style={{ padding: '16px', background: 'rgba(6,182,212,0.04)', borderBottom: '1px solid var(--border)', textAlign: 'center', color: 'var(--accent)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <RefreshCw size={13} className="animate-spin" />
                    Actualizando desde la naviera en tiempo real...
                </div>
            )}

            {/* ═══════════ ERROR ═══════════ */}
            {error && !loadingLive && (
                <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ExternalLink size={13} /> {error}
                </div>
            )}

            {/* ═══════════ CACHED SUMMARY (fast, instant) ═══════════ */}
            {!loadingCache && cached && !td && (
                <div style={{ padding: '16px 20px' }}>
                    {/* Source badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px' }}>
                        <Database size={11} style={{ color: 'var(--text-dim)' }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            Datos del caché · actualizado {fmtRelative(cached.updatedAt) || cached.updatedAt}
                            {' · '}
                            <button onClick={handleRefresh} disabled={loadingLive} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer', fontStyle: 'normal', padding: 0, textDecoration: 'underline' }}>
                                actualizar ahora
                            </button>
                        </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                        {cached.etd && (
                            <div style={{ padding: '12px', background: 'rgba(249,115,22,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249,115,22,0.2)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>ETD (Salida)</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#F97316' }}>{fmt(cached.etd)}</div>
                            </div>
                        )}
                        {cached.eta && (
                            <div style={{ padding: '12px', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>ETA (Llegada)</div>
                                <div style={{ fontSize: '16px', fontWeight: 800, color: '#22C55E' }}>{fmt(cached.eta)}</div>
                            </div>
                        )}
                        {cached.vessel && (
                            <div style={{ padding: '12px', background: `${carrierColor}08`, borderRadius: 'var(--radius-md)', border: `1px solid ${carrierColor}20` }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>Buque</div>
                                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{cached.vessel}</div>
                            </div>
                        )}
                        {cached.location && (
                            <div style={{ padding: '12px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>Ubicación</div>
                                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cached.location}</div>
                            </div>
                        )}
                        {!cached.etd && !cached.eta && !cached.vessel && !cached.location && (
                            <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                                Sin datos de tracking en caché. <button onClick={handleRefresh} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline', fontSize: '13px' }}>Obtener tracking ahora</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════ NO CACHE DATA ═══════════ */}
            {!loadingCache && !cached && !td && !loadingLive && (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <Ship size={28} style={{ margin: '0 auto 10px', opacity: 0.2 }} />
                    <p style={{ fontSize: '13px', marginBottom: '12px' }}>Sin datos de tracking disponibles</p>
                    <button onClick={handleRefresh} className="btn btn-secondary btn-small">
                        <RefreshCw size={13} /> Obtener tracking
                    </button>
                </div>
            )}

            {/* ═══════════ LIVE TRACKING DATA (full, after refresh) ═══════════ */}
            {td && !loadingLive && (<>

                {/* Source badge */}
                <div style={{ padding: '6px 20px', background: 'rgba(6,182,212,0.04)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCw size={10} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                        Datos en tiempo real · {fmtFull(td.lastUpdated)}
                    </span>
                </div>

                {/* ── VISUAL ROADMAP (PREMIUM TESS STYLE) ── */}
                <ShipTrackingTimeline 
                    status={td.status}
                    etd={td.etd}
                    eta={td.eta}
                    pol={td.portOfLoading || fallbackPol}
                    pod={td.portOfDischarge || fallbackPod}
                    currentLocation={td.currentLocation}
                    vessel={td.vessel}
                    lastUpdated={td.lastUpdated ? new Date(td.lastUpdated).toLocaleString() : undefined}
                />

                {/* ── CRONOGRAMA ── */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Cronograma</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' }}>
                        {td.etd && (<div style={{ padding: '12px', background: 'rgba(249,115,22,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(249,115,22,0.2)' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>ETD (Salida)</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#F97316' }}>{fmt(td.etd)}</div>
                        </div>)}
                        {td.eta && (<div style={{ padding: '12px', background: 'rgba(34,197,94,0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>ETA (Llegada)</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#22C55E' }}>{fmt(td.eta)}</div>
                        </div>)}
                        <div style={{ padding: '12px', background: `${carrierColor}08`, borderRadius: 'var(--radius-md)', border: `1px solid ${carrierColor}25` }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>Estado</div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: STATUS_COLORS[td.status] }}>{STATUS_LABELS[td.status]}</div>
                        </div>
                    </div>
                </div>

                {/* ── DETALLES ── */}
                <div style={{ padding: '16px 20px', borderBottom: td.vesselMMSI || (td.events && td.events.length) ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Gestión de Tránsito</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px' }}>
                        {[
                            { icon: <Ship size={13} />, label: 'Naviera', value: CARRIER_NAMES[carrier] },
                            { icon: <Anchor size={13} />, label: 'Buque', value: td.vessel },
                            { icon: <MapPin size={13} />, label: 'Viaje', value: td.voyage },
                            { icon: <Package size={13} />, label: 'Tipo Contenedor', value: td.containerType },
                            { icon: <MapPin size={13} />, label: 'Ubicación Actual', value: td.currentLocation },
                        ].filter(r => r.value).map((row, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ color: 'var(--text-dim)', flexShrink: 0, marginTop: '1px' }}>{row.icon}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{row.label}</div>
                                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>



                {/* ── TIMELINE (colapsable) ── */}
                {td.events && td.events.length > 0 && (
                    <div>
                        <button onClick={() => setTimelineOpen(!timelineOpen)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', borderTop: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-dim)' }}>
                                Timeline de Eventos
                                <span style={{ fontWeight: 500, color: 'var(--text-dim)', textTransform: 'none', letterSpacing: 'normal', fontSize: '11px' }}>
                                    · {td.events.filter(e => e.isActual).length} reales · {td.events.filter(e => !e.isActual).length} estimados
                                </span>
                            </div>
                            {timelineOpen ? <ChevronUp size={16} color="var(--text-dim)" /> : <ChevronDown size={16} color="var(--text-dim)" />}
                        </button>
                        {timelineOpen && (
                            <div style={{ padding: '4px 20px 20px', borderTop: '1px solid var(--border)' }}>
                                <div style={{ borderLeft: `2px solid ${carrierColor}40`, paddingLeft: '16px', marginLeft: '4px' }}>
                                    {td.events.map((ev, idx) => (
                                        <div key={idx} style={{ marginBottom: '14px', position: 'relative', paddingTop: '2px' }}>
                                            <div style={{ width: ev.isActual ? 10 : 8, height: ev.isActual ? 10 : 8, background: ev.isActual ? carrierColor : 'var(--surface-raised)', border: `2px solid ${ev.isActual ? carrierColor : 'var(--border)'}`, borderRadius: '50%', position: 'absolute', left: '-22px', top: '4px', boxShadow: ev.isActual ? `0 0 0 3px ${carrierColor}20` : 'none' }} />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{fmtFull(ev.timestamp)}</span>
                                                {ev.isActual && <span style={{ fontSize: '10px', fontWeight: 700, color: carrierColor, background: `${carrierColor}15`, padding: '1px 6px', borderRadius: '4px' }}>REAL</span>}
                                            </div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginTop: '3px' }}>{ev.description}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {ev.location}{ev.vessel && <span style={{ marginLeft: '8px' }}>{ev.vessel}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── FOOTER ── */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', background: 'var(--surface-raised)', fontSize: '11px', color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Fuente: findTEU · {fmtFull(td.lastUpdated)}</span>
                    <button onClick={handleRefresh} disabled={loadingLive} className="btn btn-secondary btn-small" style={{ fontSize: '11px', padding: '4px 10px' }}>
                        <RefreshCw size={11} /> Actualizar
                    </button>
                </div>

            </>)}
        </div>
    )
}
