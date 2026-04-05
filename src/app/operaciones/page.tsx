'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { FileText, ArrowRight, Download, Plus, Search, Ship, Clock, Filter, ChevronRight, MapPin, Calendar, Building, User, ArrowLeft, Package, ExternalLink, TrendingUp, Anchor, Loader2, Box, History, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getResponsableName, Operacion, Contacto, USER_MAP } from '@/lib/sheets-types'
import ProformaModal from '@/components/ProformaModal'
import { detectCarrier, getCarrierTrackingURL } from '@/lib/containerTracking'
import { UserAvatar } from '@/components/ui/UserAvatar'
import { ResizableTh } from '@/components/ui/ResizableTh'
import { AIFeatureBadge } from '@/components/AIFeatureBadge'
const ADMIN_EMAILS = ['hm@southmarinetrading.com', 'admin@southmarinetrading.com']

type TabType = 'todas' | 'por_cargar' | 'cargadas' | 'liquidadas'

// Robust date formatter: always dd/mm/yyyy regardless of server locale
const formatDateES = (val: string | undefined | null): string => {
    if (!val) return 'N/A'
    // If already dd/mm/yyyy
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(val)) return val
    // Avoid UTC shift for YYYY-MM-DD by treating as local midnight
    const dateStr = val.includes('-') && !val.includes('T') ? `${val}T00:00:00` : val
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return val
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}


export default function OperacionesPage() {
    return (
        <Suspense fallback={
            <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <Loader2 className="animate-spin text-accent" size={48} />
            </div>
        }>
            <OperacionesContent />
        </Suspense>
    )
}

function OperacionesContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const tabParam = searchParams.get('tab') as TabType
    const { data: session } = useSession()

    // isAdmin: hide Liquidadas tab if actual session OR impersonated user is an admin
    const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null)
    useEffect(() => {
        const saved = localStorage.getItem('smt_impersonated_user')
        setImpersonatedEmail(saved)
        const handler = (e: CustomEvent) => setImpersonatedEmail(e.detail?.email || null)
        window.addEventListener('smt-impersonation-changed', handler as any)
        return () => window.removeEventListener('smt-impersonation-changed', handler as any)
    }, [])

    const effectiveEmail = (impersonatedEmail || session?.user?.email || '').toLowerCase()
    const isAdmin = ADMIN_EMAILS.includes(effectiveEmail)

    const [operaciones, setOperaciones] = useState<Operacion[]>([])
    const [historial, setHistorial] = useState<Operacion[]>([])
    const [contactos, setContactos] = useState<Contacto[]>([])

    const [loading, setLoading] = useState(true)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedResponsable, setSelectedResponsable] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabType>(tabParam || 'todas')
    const [visibleCount, setVisibleCount] = useState(20)
    const [isProformaModalOpen, setIsProformaModalOpen] = useState(false)
    const [selectedOpForProforma, setSelectedOpForProforma] = useState<Operacion | null>(null)
    const [sortConfig, setSortConfig] = useState<{ key: 'id' | 'ld', direction: 'asc' | 'desc' | null }>({
        key: 'id',
        direction: null
    })
    const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    useEffect(() => {
        // 1. Load from Cache immediately
        const cachedOps = localStorage.getItem('tess_operaciones')
        const cachedHist = localStorage.getItem('tess_historial')
        const cachedCont = localStorage.getItem('tess_contactos')

        if (cachedOps && cachedHist && cachedCont) {
            try {
                setOperaciones(JSON.parse(cachedOps))
                setHistorial(JSON.parse(cachedHist))
                setContactos(JSON.parse(cachedCont))
                setLoading(false) // Found cache, stop main spinner
                console.log('[Cache] Loaded data from localStorage')
            } catch (e) {
                console.error('[Cache] Error parsing localStorage', e)
            }
        }

        const fetchData = async () => {
            setIsRefreshing(true)
            try {
                const [resOps, resHistorial, resContacts] = await Promise.all([
                    fetch('/api/operaciones/all').then(r => r.json()),
                    fetch('/api/operaciones/historial').then(r => r.json()),
                    fetch('/api/contactos').then(r => r.json())
                ])

                if (resOps.success) {
                    setOperaciones(resOps.data)
                    localStorage.setItem('tess_operaciones', JSON.stringify(resOps.data))
                }
                if (resHistorial.success) {
                    setHistorial(resHistorial.data)
                    localStorage.setItem('tess_historial', JSON.stringify(resHistorial.data))
                }
                if (resContacts.success) {
                    setContactos(resContacts.data)
                    localStorage.setItem('tess_contactos', JSON.stringify(resContacts.data))
                }

            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
                setIsRefreshing(false)
            }
        }
        fetchData()
    }, [])

    const responsables = useMemo(() =>
        Array.from(new Set(operaciones.map(op => getResponsableName(op.userId)))).sort()
        , [operaciones])

    const filteredAndSortedOps = useMemo(() => {
        let filtered = (activeTab === 'todas' ? [...operaciones, ...historial] : operaciones).filter(op => {
            const matchesSearch = (op.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (op.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (op.exportador || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchesResponsable = selectedResponsable ? getResponsableName(op.userId) === selectedResponsable : true

            // Tab filtering criteria
            const isLoaded = op.containerNumber && op.containerNumber.trim() !== ''
            let matchesTab = true
            if (activeTab === 'por_cargar') matchesTab = !isLoaded
            if (activeTab === 'cargadas') matchesTab = !!isLoaded
            if (activeTab === 'liquidadas') matchesTab = false // We handle liquidadas separately

            return matchesSearch && matchesResponsable && matchesTab
        })

        if (activeTab === 'liquidadas') {
            filtered = historial.filter(op => {
                const matchesSearch = (op.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (op.cliente || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (op.exportador || '').toLowerCase().includes(searchTerm.toLowerCase())
                const matchesResponsable = selectedResponsable ? getResponsableName(op.userId) === selectedResponsable : true
                return matchesSearch && matchesResponsable
            })
        }


        if (sortConfig.direction && sortConfig.key === 'id') {
            return filtered.sort((a, b) => {
                const parseNumericId = (idStr?: string) => {
                    if (!idStr) return 0
                    const firstPart = idStr.split('-')[0]
                    return parseInt(firstPart) || 0
                }
                const numA = parseNumericId(a.id), numB = parseNumericId(b.id)
                return sortConfig.direction === 'asc' ? numA - numB : numB - numA
            })
        }

        if (sortConfig.direction && sortConfig.key === 'ld') {
            return filtered.sort((a, b) => {
                const dateA = a.loadedDate ? new Date(a.loadedDate).getTime() : Infinity
                const dateB = b.loadedDate ? new Date(b.loadedDate).getTime() : Infinity
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
            })
        }

        if (activeTab === 'cargadas') {
            // "Cargadas": Default Ascending by Loaded Date (Oldest to Newest)
            return filtered.sort((a, b) => {
                const dateA = a.loadedDate ? new Date(a.loadedDate).getTime() : Infinity
                const dateB = b.loadedDate ? new Date(b.loadedDate).getTime() : Infinity
                return dateA - dateB
            })
        } else {
            // "Todas" & "Por Cargar": Standard ID-based descending sorting (Newest first)
            return filtered.sort((a, b) => {
                const parseId = (idStr?: string) => {
                    if (!idStr) return { num: 0, year: 0 }
                    const parts = idStr.split('-')
                    if (parts.length < 2) return { num: 0, year: 0 }
                    return { num: parseInt(parts[0]) || 0, year: parseInt(parts[1]) || 0 }
                }
                const idA = parseId(a.id), idB = parseId(b.id)
                if (idA.year !== idB.year) return idB.year - idA.year
                return idB.num - idA.num
            })
        }
    }, [operaciones, historial, searchTerm, selectedResponsable, activeTab, sortConfig])


    const displayedOps = filteredAndSortedOps.slice(0, visibleCount)
    const hasMore = filteredAndSortedOps.length > visibleCount

    if (loading) return (
        <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <Loader2 className="animate-spin text-accent" size={48} />
        </div>
    )

    return (
        <div className="dashboard-container animate-in">
            <header className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link href="/" className="btn btn-secondary" style={{ padding: '8px', height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h1 className="label-tess">Operaciones</h1>
                            {isRefreshing && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--surface-raised)', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>
                                    <Loader2 size={10} className="animate-spin" />
                                    ACTUALIZANDO...
                                </div>
                            )}
                        </div>
                        <p className="page-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Gestión integral de logística y cargas</p>
                    </div>
                    <AIFeatureBadge 
                        title="Priorización Inteligente" 
                        description="Tess agrupa las cargas por urgencia cronológica, detecta cuellos de botella en la documentación y alerta proactivamente sobre operaciones que requieren atención inmediata." 
                        position="bottom"
                    />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <Link href="/operaciones/nueva" className="btn btn-primary">
                        <Plus size={18} />
                        Nueva Operación
                    </Link>
                </div>
            </header>

            {/* Tab Selector — brand manual tab-nav, scrollable on mobile */}
            <div className="tab-nav overflow-x-auto whitespace-nowrap hide-scrollbar flex w-full" style={{ marginBottom: 'var(--space-6)' }}>
                {[
                    { id: 'todas', label: 'Todas', icon: Ship },
                    { id: 'por_cargar', label: 'Por Cargar', icon: Clock },
                    { id: 'cargadas', label: 'Cargadas', icon: Box },
                    { id: 'liquidadas', label: 'Liquidadas', icon: History }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as TabType); setVisibleCount(20); }}
                        className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <tab.icon size={15} />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Stats - richer grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 100%)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Ship size={18} color="var(--accent)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {activeTab === 'todas' ? 'Total' : activeTab === 'cargadas' ? 'En Tránsito' : activeTab === 'liquidadas' ? 'Liquidadas' : 'Pendientes'}
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1, color: 'var(--accent)' }}>{filteredAndSortedOps.length}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, transparent 100%)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(34,197,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box size={18} color="var(--green)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cargadas</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1, color: 'var(--green)' }}>{operaciones.filter(o => o.containerNumber?.trim()).length}</div>
                    </div>
                </div>
                <div className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(251,191,36,0.06) 0%, transparent 100%)' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Clock size={18} color="var(--amber)" />
                    </div>
                    <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Por Cargar</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1, color: 'var(--amber)' }}>{operaciones.filter(o => !o.containerNumber?.trim()).length}</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="card flex flex-col sm:flex-row items-center flex-wrap gap-4 mb-6 p-4">
                <div className="search-bar w-full sm:w-auto" style={{ flex: 1 }}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por ID, Cliente o Exportador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full sm:w-auto flex items-center gap-2">
                    <Filter size={16} className="text-gray-500 hidden sm:block" />
                    <select
                        className="input w-full sm:w-auto"
                        style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--font-size-sm)' }}
                        value={selectedResponsable || ''}
                        onChange={(e) => setSelectedResponsable(e.target.value || null)}
                    >
                        <option value="">Todos los Responsables</option>
                        {responsables.map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="ops-table-mobile" style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', minWidth: '600px', borderCollapse: 'separate', borderSpacing: '0' }}>
                            <thead>
                                {activeTab === 'cargadas' ? (
                                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                        <th>OP ID</th>
                                        <th>Resp.</th>
                                        <th>LD</th>
                                        <th>Forwarder</th>
                                        <th>Entidades</th>
                                        <th>Destino / ETA</th>
                                        <th style={{ width: '48px' }}></th>
                                    </tr>
                                ) : (
                                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                        <th>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                OP ID
                                                <button onClick={(e) => { e.stopPropagation(); setSortConfig(prev => ({ key: 'id', direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' })) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortConfig.direction ? 'var(--accent)' : 'var(--text-dim)', padding: 0, display: 'flex' }}>
                                                    {sortConfig.direction === 'asc' ? <ArrowUp size={13} /> : sortConfig.direction === 'desc' ? <ArrowDown size={13} /> : <ArrowUpDown size={13} />}
                                                </button>
                                            </div>
                                        </th>
                                        <th>Responsable</th>
                                        <th>Entidades</th>
                                        <th className="hide-on-mobile">Destino</th>
                                        <th>Estado</th>
                                        <th style={{ width: '48px' }}></th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {displayedOps.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ padding: 'var(--space-10)', textAlign: 'center', color: 'var(--text-dim)' }}>
                                            <div style={{ opacity: 0.5, marginBottom: 'var(--space-4)' }}>
                                                <Ship size={48} style={{ margin: '0 auto' }} />
                                            </div>
                                            <p>No se encontraron operaciones.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedOps.map((op) => (
                                        activeTab === 'cargadas' ? (
                                            <LoadedRow key={op.id} op={op} router={router} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} onLiquidate={() => {
                                                setOperaciones(prev => prev.filter(o => o.id !== op.id))
                                                setHistorial(prev => [op, ...prev])
                                            }} />
                                        ) : (
                                            <StandardRow key={op.id} op={op} router={router} navigatingTo={navigatingTo} setNavigatingTo={setNavigatingTo} />
                                        )
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {hasMore && (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
                            <button className="btn btn-secondary" onClick={() => setVisibleCount(prev => prev + 50)} style={{ width: '200px' }}>
                                Ver Más ({filteredAndSortedOps.length - visibleCount} restantes)
                            </button>
                        </div>
                    )}
                </div>

            {isProformaModalOpen && selectedOpForProforma && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999 }}>
                    <ProformaModal
                        isOpen={isProformaModalOpen}
                        onClose={() => setIsProformaModalOpen(false)}
                        operationId={selectedOpForProforma.id || ''}
                        clientName={selectedOpForProforma.cliente}
                    />
                </div>
            )}
        </div>
    )
}

function LoadedRow({ op, router, onLiquidate, navigatingTo, setNavigatingTo }: { op: Operacion, router: any, onLiquidate: () => void, navigatingTo: string | null, setNavigatingTo: (id: string | null) => void }) {
    const carrier = detectCarrier(op.containerNumber!)
    const trackingURL = getCarrierTrackingURL(op.containerNumber!, carrier)
    const [liquidating, setLiquidating] = useState(false)

    const handleLiquidate = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Estás seguro de liquidar esta operación? Se moverá al historial.')) return

        setLiquidating(true)
        try {
            const res = await fetch(`/api/operaciones/${op.id}/liquidate`, { method: 'POST' })
            const data = await res.json()
            if (data.success) {
                onLiquidate()
            } else {
                alert(data.error || 'Error al liquidar')
            }
        } catch (err) {
            console.error(err)
            alert('Error al liquidar')
        } finally {
            setLiquidating(false)
        }
    }

    return (
        <tr className="clickable-row group loaded-row" onClick={() => router.push(`/operaciones/${op.id}`)}>
            <td className="cell-op-id">{op.id}</td>
            <td>
                <UserAvatar email={op.userId || ''} size={24} variant="outlined" />
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px' }}>
                    <Calendar size={14} className="text-accent" />
                    {formatDateES(op.loadedDate)}
                </div>
            </td>
            <td>
                {op.forwarder ? (
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{op.forwarder}</div>
                ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>Sin forwarder</span>
                )}
            </td>
            <td className="cell-entities">
                <div className="cell-entities-importer">{op.cliente}</div>
                <div className="cell-entities-exporter">{op.exportador}</div>
            </td>
            <td>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{op.puertoDestino || '—'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>ETA: {op.eta ? new Date(op.eta).toLocaleDateString() : 'N/A'}</div>
            </td>
            <td className="sticky-column-right" style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                    {navigatingTo === op.id ? (
                        <Loader2 size={18} className="animate-spin text-accent" />
                    ) : (
                        <ChevronRight size={18} className="opacity-30 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </td>

        </tr>
    )
}

function StandardRow({ op, router, navigatingTo, setNavigatingTo }: { op: Operacion, router: any, navigatingTo: string | null, setNavigatingTo: (id: string | null) => void }) {
    // Color-code status badge by stage group
    const getStatusStyle = (estado: string) => {
        const s = estado || ''
        if (s.includes('Liquidada') || s.includes('14.')) return { bg: 'rgba(34,197,94,0.12)', color: 'var(--green)', border: 'rgba(34,197,94,0.25)' }
        if (s.includes('Tránsito') || s.includes('9.') || s.includes('10.') || s.includes('11.')) return { bg: 'rgba(6,182,212,0.12)', color: 'var(--cyan)', border: 'rgba(6,182,212,0.25)' }
        if (s.includes('Carga') || s.includes('8.') || s.includes('Booking') || s.includes('7.')) return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', border: 'rgba(59,130,246,0.25)' }
        if (s.includes('Flete') || s.includes('6.') || s.includes('Producción') || s.includes('5.')) return { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: 'rgba(139,92,246,0.25)' }
        if (s.includes('Cancelada')) return { bg: 'rgba(239,68,68,0.1)', color: 'var(--red)', border: 'rgba(239,68,68,0.2)' }
        return { bg: 'rgba(99,102,241,0.1)', color: 'var(--accent)', border: 'rgba(99,102,241,0.2)' }
    }
    const ss = getStatusStyle(op.estado)

    // Abbreviate entity name smartly — skip entity ID prefix like "E057-"
    const abbrev = (name: string) => {
        if (!name) return '?'
        // Strip leading entity ID prefix: E001-, E131-, etc.
        const stripped = name.replace(/^[A-Z]\d+[-–]/, '').trim() || name
        const words = stripped.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().split(/\s+/)
        return words.length >= 2 ? (words[0][0] + words[1][0]).toUpperCase() : stripped.slice(0, 2).toUpperCase()
    }

    return (
        <tr
            className="clickable-row"
            onClick={() => { setNavigatingTo(op.id || null); router.push(`/operaciones/${op.id}`) }}
            style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s', cursor: 'pointer' }}
        >
            {/* ID */}
            <td className="cell-op-id">{op.id}</td>

            {/* Responsable */}
            <td style={{ whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserAvatar email={op.userId || ''} size={28} variant="outlined" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{getResponsableName(op.userId)}</span>
                </div>
            </td>

            {/* Entidades */}
            <td className="cell-entities" style={{ minWidth: '220px' }}>
                {/* Importador */}
                <div className="cell-entities-importer">{op.cliente || 'Desconocido'}</div>
                {/* Exportador */}
                {op.exportador && (
                    <div className="cell-entities-exporter">{op.exportador}</div>
                )}
            </td>

            {/* Destino */}
            <td style={{ whiteSpace: 'nowrap' }} className="hide-on-mobile">
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '3px' }}>
                    {op.puertoDestino || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontWeight: 400 }}>Sin destino</span>}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={10} />
                    <span>Carga: {op.fechaEmbarque || 'Sin fecha'}</span>
                </div>
            </td>

            {/* Estado */}
            <td style={{ whiteSpace: 'nowrap' }}>
                <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    background: ss.bg,
                    color: ss.color,
                    border: `1px solid ${ss.border}`,
                    lineHeight: 1.4,
                    maxWidth: '180px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}>
                    {op.estado}
                </span>
            </td>

            {/* Arrow */}
            <td style={{ textAlign: 'right', width: '48px' }}>
                {navigatingTo === op.id
                    ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)', display: 'inline' }} />
                    : <ChevronRight size={18} style={{ color: 'var(--text-dim)', display: 'inline', transition: 'color 0.15s' }} />
                }
            </td>
        </tr>
    )
}


function LiquidadasRow({ op, router, navigatingTo, setNavigatingTo }: { op: Operacion, router: any, navigatingTo: string | null, setNavigatingTo: (id: string | null) => void }) {
    return (
        <tr className="clickable-row group liquidadas-row" onClick={() => {
            setNavigatingTo(op.id || null)
            router.push(`/operaciones/${op.id}?tab=finanzas&historial=1`)
        }}>
            {/* Importador */}
            <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>{op.cliente || '—'}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{op.id}</div>
            </td>
            {/* Exportador */}
            <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{op.exportador || '—'}</div>
            </td>
            {/* Productor */}
            <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{(op as any).productor || '—'}</div>
            </td>
            {/* Destino */}
            <td style={{ padding: '12px 16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>{op.puertoDestino || '—'}</div>
            </td>
            {/* Flecha */}
            <td style={{ padding: '12px 16px', textAlign: 'right', width: '40px' }}>
                {navigatingTo === op.id
                    ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    : <ChevronRight size={18} style={{ color: 'var(--text-dim)', transition: 'color 0.15s' }} className="group-hover:text-accent" />
                }
            </td>
        </tr>
    )
}
