'use client'

import { useState, useEffect } from 'react'
import {
    MessageSquare,
    Plus,
    Clock,
    AlertCircle,
    CheckCircle,
    X,
    Loader2,
    FileText,
    DollarSign,
    User,
    ArrowRight,
    Search,
    ShieldCheck,
    Calendar,
    ChevronRight,
    Tag,
    ClipboardList
} from 'lucide-react'
import { Claim, USER_MAP, getResponsableName } from '@/lib/sheets-types'
import { parseNumeric } from '@/lib/numbers'
import { SearchableSelect } from './ui/SearchableSelect'
import { useToast } from './ui/Toast'

interface ClaimsSectionProps {
    operationId: string
    clienteId: string
    allContacts: any[]
}

const CLAIM_STATES = [
    '1. Reclamo Reportado',
    '2. En Análisis',
    '3. Evidencia Requerida',
    '4. En Negociación',
    '5A. Aprobado',
    '5B. Rechazado',
    '6. Ajuste Económico Definido',
    '7. Cerrado'
]

const CLAIM_TYPES = [
    'Calidad',
    'Cantidad',
    'Documentación',
    'Logística',
    'Temperatura / cadena de frío',
    'Daños'
]

export function ClaimsSection({ operationId, clienteId, allContacts }: ClaimsSectionProps) {
    const [claims, setClaims] = useState<Claim[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingClaim, setEditingClaim] = useState<Claim | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const { showToast } = useToast()

    // Form State
    const [formData, setFormData] = useState<Partial<Claim>>({
        operationId,
        cliente: clienteId,
        tipo: 'Calidad',
        estado: '1. Reclamo Reportado',
        fechaReporte: new Date().toISOString().split('T')[0],
        impactoEstimado: 0,
        impactoFinal: 0,
        responsable: '',
        descripcion: '',
        evidencia: '',
        resolucionPropuesta: ''
    })

    useEffect(() => {
        fetchClaims()
    }, [operationId])

    const fetchClaims = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/reclamos?operationId=${operationId}`)
            if (res.ok) {
                const data = await res.json()
                setClaims(data)
            }
        } catch (error) {
            console.error('Error fetching claims:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const url = editingClaim ? `/api/reclamos/${editingClaim.id}` : '/api/reclamos'
            const method = editingClaim ? 'PATCH' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                const claimData = await res.json()

                // Automatización: Crear carpeta en Drive para nuevo reclamo
                if (!editingClaim) {
                    try {
                        const folderRes = await fetch('/api/reclamos/folder', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ operationId })
                        })
                        if (folderRes.ok) {
                            const folderData = await folderRes.json()
                            // Actualizar el reclamo con el link de la carpeta
                            await fetch(`/api/reclamos/${claimData.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ evidencia: folderData.folderUrl })
                            })
                            showToast('Carpeta de Drive creada automáticamente para el reclamo', 'success')
                        }
                    } catch (folderErr) {
                        console.error('Error creating claim folder:', folderErr)
                    }
                }

                setIsModalOpen(false)
                setEditingClaim(null)
                fetchClaims()
                if (!editingClaim) {
                    window.location.reload()
                }
            } else {
                const err = await res.json()
                showToast(err.error || 'Error al guardar el reclamo', 'error')
            }
        } catch (error) {
            console.error('Error saving claim:', error)
            showToast('Error crítico al conectar con el servidor', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const getStateColor = (state: string) => {
        if (state.startsWith('7')) return 'var(--text-dim)'
        if (state.startsWith('5A')) return 'var(--green)'
        if (state.startsWith('5B')) return 'var(--red)'
        if (state.startsWith('6')) return 'var(--cyan)'
        return 'var(--accent)'
    }

    return (
        <div className="animate-in" style={{ padding: '20px 0' }}>
            {/* Header Ultra-Premium */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '40px',
                padding: '24px 32px',
                background: 'rgba(var(--surface-raised-rgb), 0.3)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                border: '1px solid var(--border-light)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(var(--accent-rgb), 0.3)'
                        }}>
                            <MessageSquare size={20} color="white" />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>
                            Centro de Reclamos
                        </h2>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-dim)', marginLeft: '52px' }}>
                        Supervisión técnica, trazabilidad de evidencia y resolución económica.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setEditingClaim(null)
                        setFormData({
                            operationId,
                            cliente: clienteId,
                            tipo: 'Calidad',
                            estado: '1. Reclamo Reportado',
                            fechaReporte: new Date().toISOString().split('T')[0],
                            impactoEstimado: 0,
                            impactoFinal: 0,
                            responsable: '',
                            descripcion: '',
                            evidencia: '',
                            resolucionPropuesta: ''
                        })
                        setIsModalOpen(true)
                    }}
                    className="btn btn-primary hover-scale"
                    style={{
                        padding: '12px 28px',
                        borderRadius: '14px'
                    }}
                >
                    <Plus size={18} /> Nuevo Reporte
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '80px', textAlign: 'center' }}>
                    <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.5 }} />
                </div>
            ) : claims.length === 0 ? (
                <div className="card-hover" style={{
                    padding: '120px 40px',
                    textAlign: 'center',
                    background: 'linear-gradient(145deg, rgba(var(--surface-rgb), 0.4), rgba(var(--accent-rgb), 0.05))',
                    borderRadius: '48px',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '24px',
                    boxShadow: 'inset 0 0 40px rgba(var(--accent-rgb), 0.02)'
                }}>
                    <div style={{
                        background: 'var(--surface-raised)',
                        width: '100px',
                        height: '100px',
                        borderRadius: '35px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-light)',
                        animation: 'float 6s ease-in-out infinite'
                    }}>
                        <ShieldCheck size={48} style={{ color: 'var(--green)', opacity: 0.8 }} />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--text)', marginBottom: '12px', letterSpacing: '-0.02em' }}>Operación sin Pendientes</h3>
                        <p style={{ fontSize: '15px', color: 'var(--text-dim)', maxWidth: '400px', lineHeight: '1.7' }}>
                            No se registran incidencias de calidad ni discrepancias logísticas en este embarque. Todo fluye según lo planeado.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-secondary hover-scale"
                        style={{ padding: '14px 32px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(5px)' }}
                    >
                        Reportar Primera Incidencia
                    </button>

                    <style jsx>{`
                        @keyframes float {
                            0% { transform: translateY(0px); }
                            50% { transform: translateY(-10px); }
                            100% { transform: translateY(0px); }
                        }
                    `}</style>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {claims.map(claim => (
                        <div
                            key={claim.id}
                            className="card-hover-bright"
                            style={{
                                padding: '28px 32px',
                                display: 'grid',
                                gridTemplateColumns: '140px 1fr 240px 180px 60px',
                                alignItems: 'center',
                                gap: '32px',
                                background: 'rgba(var(--surface-raised-rgb), 0.4)',
                                backdropFilter: 'blur(8px)',
                                borderRadius: '28px',
                                border: '1px solid var(--border-light)',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onClick={() => {
                                setEditingClaim(claim)
                                setFormData(claim)
                                setIsModalOpen(true)
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>REFERENCIA</div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{claim.id}</div>
                            </div>

                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                                    <span style={{
                                        fontSize: '10px',
                                        background: 'rgba(var(--accent-rgb), 0.1)',
                                        padding: '5px 12px',
                                        borderRadius: '8px',
                                        fontWeight: 800,
                                        color: 'var(--accent)',
                                        textTransform: 'uppercase'
                                    }}>
                                        {claim.tipo}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Calendar size={12} /> {claim.fechaReporte}
                                    </span>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '450px' }}>
                                    {claim.descripcion}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>ESTADO ACTUAL</div>
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '8px 18px',
                                    borderRadius: '100px',
                                    background: `${getStateColor(claim.estado)}15`,
                                    color: getStateColor(claim.estado),
                                    fontSize: '12px',
                                    fontWeight: 900,
                                    border: `1px solid ${getStateColor(claim.estado)}30`
                                }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: getStateColor(claim.estado), boxShadow: `0 0 10px ${getStateColor(claim.estado)}` }}></div>
                                    {claim.estado.split('. ')[1] || claim.estado}
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>LIQUIDACIÓN</div>
                                <div style={{ fontSize: '20px', fontWeight: 900, color: claim.impactoFinal > 0 ? 'var(--red)' : claim.impactoEstimado > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
                                    {claim.impactoFinal > 0
                                        ? `-$${claim.impactoFinal.toLocaleString()}`
                                        : claim.impactoEstimado > 0
                                            ? `~$${claim.impactoEstimado.toLocaleString()}`
                                            : '$0.00'
                                    }
                                </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    background: 'var(--surface)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-dim)',
                                    border: '1px solid var(--border-light)'
                                }}>
                                    <ChevronRight size={22} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal Ultra-Premium Centrado */}
            {isModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999, // Super high to avoid overlapping
                    backgroundColor: 'rgba(5, 10, 20, 0.9)',
                    backdropFilter: 'blur(20px)',
                    padding: '24px'
                }}>
                    <div className="modal-content animate-in" style={{
                        width: '100%',
                        maxWidth: '850px',
                        background: 'var(--surface)',
                        borderRadius: '35px',
                        overflow: 'hidden',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 60px 150px rgba(0,0,0,0.8)',
                        position: 'relative',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                        {/* Brillo Top Decorativo */}
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: '40%',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                            opacity: 0.6
                        }} />

                        {/* Header Moderno-Premium */}
                        <div style={{
                            padding: '40px 48px',
                            background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), transparent)',
                            borderBottom: '1px solid var(--border-light)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexShrink: 0
                        }}>
                            <div>
                                <h1 style={{
                                    fontSize: '28px',
                                    fontWeight: 900,
                                    color: 'var(--text)',
                                    letterSpacing: '-0.04em',
                                    margin: 0,
                                    lineHeight: 1
                                }}>
                                    {editingClaim ? 'Gestionar Incidencia' : 'Reportar Nueva Incidencia'}
                                </h1>
                                <p style={{
                                    fontSize: '14px',
                                    color: 'var(--text-dim)',
                                    marginTop: '8px',
                                    fontWeight: 500,
                                    letterSpacing: '0.01em'
                                }}>
                                    {editingClaim ? `Expediente de Resolución #${editingClaim.id}` : 'Complete el protocolo técnico para el seguimiento de calidad.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="hover-scale"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-light)',
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Scrollable Content Body */}
                        <div style={{
                            padding: '48px',
                            overflowY: 'auto',
                            background: 'radial-gradient(circle at top right, rgba(var(--accent-rgb), 0.03), transparent 40%)'
                        }}>
                            {/* Control Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1.2fr) 1fr', gap: '32px', marginBottom: '40px' }}>
                                <div className="input-group">
                                    <label className="input-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Naturaleza del Reclamo</label>
                                    <div style={{ position: 'relative' }}>
                                        <Tag size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)', opacity: 0.6 }} />
                                        <select
                                            className="input"
                                            style={{ paddingLeft: '56px', height: '56px', fontSize: '16px', fontWeight: 700, borderRadius: '16px', background: 'var(--surface-raised)', border: '1px solid var(--border-light)' }}
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                                        >
                                            {CLAIM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label className="input-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Estado Operativo</label>
                                    <div style={{ position: 'relative' }}>
                                        <ClipboardList size={18} style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', color: getStateColor(formData.estado || ''), opacity: 0.6 }} />
                                        <select
                                            className="input"
                                            style={{ paddingLeft: '56px', height: '56px', fontSize: '15px', fontWeight: 800, borderRadius: '16px', background: 'var(--surface-raised)', color: getStateColor(formData.estado || ''), border: `1px solid ${getStateColor(formData.estado || '')}30` }}
                                            value={formData.estado}
                                            onChange={e => setFormData({ ...formData, estado: e.target.value })}
                                        >
                                            {CLAIM_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: '40px' }}>
                                <label className="input-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Responsable de Gestión</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />
                                    <select
                                        className="input"
                                        style={{ paddingLeft: '56px', height: '58px', fontSize: '16px', borderRadius: '16px', background: 'var(--surface-raised)', fontWeight: 600 }}
                                        value={formData.responsable}
                                        onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                                    >
                                        <option value="">Seleccionar responsable...</option>
                                        {Object.values(USER_MAP).map(u => (
                                            <option key={u.name} value={u.name}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="input-group" style={{ marginBottom: '40px' }}>
                                <label className="input-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Detalle Técnico & Evidencia</label>
                                <textarea
                                    className="input"
                                    style={{ minHeight: '160px', padding: '24px', lineHeight: '1.8', fontSize: '16px', borderRadius: '20px', background: 'var(--surface-raised)', border: '1px solid var(--border-light)', resize: 'none' }}
                                    placeholder="Describa la incidencia con precisión técnica: lotes, temperaturas, discrepancias de peso..."
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>

                            {/* Panel Financiero */}
                            <div style={{
                                background: 'linear-gradient(145deg, rgba(var(--surface-raised-rgb), 0.5), rgba(var(--accent-rgb), 0.05))',
                                padding: '40px',
                                borderRadius: '28px',
                                border: '1px solid var(--border-light)',
                                marginBottom: '40px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <DollarSign size={18} color="white" />
                                    </div>
                                    <h4 style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text)', letterSpacing: '0.05em', margin: 0 }}>IMPACTO FINANCIERO</h4>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                    <div className="input-group">
                                        <label className="input-label" style={{ color: 'var(--text-dim)', fontSize: '12px', fontWeight: 700, marginBottom: '10px' }}>Reserva Estimada (USD)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: 800 }}>$</span>
                                            <input
                                                className="input"
                                                style={{ paddingLeft: '40px', fontWeight: 700, height: '54px', borderRadius: '14px', background: 'var(--surface)', fontSize: '18px' }}
                                                type="number"
                                                value={formData.impactoEstimado}
                                                onChange={e => setFormData({ ...formData, impactoEstimado: parseNumeric(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label" style={{ color: 'var(--cyan)', fontSize: '12px', fontWeight: 900, marginBottom: '10px' }}>Ajuste Final Negociado (USD)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--cyan)', fontWeight: 900 }}>$</span>
                                            <input
                                                className="input"
                                                style={{ paddingLeft: '40px', fontWeight: 900, color: 'var(--cyan)', height: '54px', borderRadius: '14px', background: 'var(--surface)', border: '1px solid rgba(var(--cyan-rgb), 0.4)', fontSize: '20px' }}
                                                type="number"
                                                value={formData.impactoFinal}
                                                onChange={e => setFormData({ ...formData, impactoFinal: parseNumeric(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="input-label" style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--text-dim)', marginBottom: '12px', display: 'block' }}>Repositorio de Archivos</label>
                                <div style={{ position: 'relative' }}>
                                    <FileText size={20} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', opacity: 0.6 }} />
                                    <input
                                        className="input"
                                        style={{ paddingLeft: '56px', height: '58px', borderRadius: '16px', background: 'var(--surface-raised)', fontSize: '14px' }}
                                        type="text"
                                        placeholder="Enlace a Carpeta de Google Drive con Fotos y Reportes"
                                        value={formData.evidencia}
                                        onChange={e => setFormData({ ...formData, evidencia: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Footer con Glassmorphism Extremo */}
                        <div style={{
                            padding: '40px 48px',
                            background: 'rgba(var(--surface-raised-rgb), 0.8)',
                            backdropFilter: 'blur(30px)',
                            borderTop: '1px solid var(--border-light)',
                            display: 'flex',
                            gap: '20px',
                            justifyContent: 'flex-end',
                            flexShrink: 0
                        }}>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="btn btn-secondary hover-scale"
                                style={{ padding: '16px 32px', borderRadius: '18px', fontWeight: 600, border: '1px solid var(--border-light)' }}
                            >
                                Descartar Cambios
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary hover-scale"
                                disabled={isSaving || !formData.descripcion || !formData.responsable}
                                style={{
                                    padding: '16px 48px',
                                    borderRadius: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px'
                                }}
                            >
                                {isSaving ? <Loader2 size={24} className="animate-spin" /> : <CheckCircle size={24} />}
                                <span>{editingClaim ? 'Actualizar Expediente' : 'Someter Reporte'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
