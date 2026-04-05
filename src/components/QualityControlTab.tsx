'use client'

import { useState, useEffect } from 'react'
import {
    ShieldCheck,
    Plus,
    Calendar,
    User,
    Folder,
    FileText,
    MessageCircle,
    X,
    Loader2,
    Briefcase,
    AlertCircle,
    Sparkles,
    Bot
} from 'lucide-react'
import { useToast } from './ui/Toast'

// Tipos base para la estructura de QC
export interface QCInspection {
    id: string;
    fechaProgramada: string;
    responsable: string;
    estado: 'Pendiente' | 'En Proceso' | 'Completado';
    notas: string;
    rutaCarpetaDrive: string;
    idCarpetaDrive?: string;
}

interface QualityControlTabProps {
    op: any;
    allContacts: any[];
}

export default function QualityControlTab({ op, allContacts }: QualityControlTabProps) {
    const { showToast } = useToast()
    const [inspections, setInspections] = useState<QCInspection[]>([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [formData, setFormData] = useState<Partial<QCInspection>>({
        fechaProgramada: new Date().toISOString().split('T')[0],
        responsable: '',
        estado: 'Pendiente',
        notas: ''
    })

    useEffect(() => {
        const fetchInspections = async () => {
            try {
                const res = await fetch(`/api/operaciones/${op.id || op.idCarga}/qc`);
                if (res.ok) {
                    const data = await res.json();
                    setInspections(Array.isArray(data) ? data : []);
                }
            } catch (error) {
                console.error("Error fetching QC inspections:", error);
            } finally {
                setLoading(false);
            }
        };
        if (op.id || op.idCarga) fetchInspections();
        else setLoading(false);
    }, [op.id, op.idCarga])

    const generateQCId = (dateStr: string) => {
        const cleanDate = dateStr.replace(/-/g, '')
        return `QC-${op.id}-${cleanDate}`
    }

    const handleSave = async () => {
        if (!formData.fechaProgramada || !formData.responsable) {
            showToast('Fecha y responsable son obligatorios', 'warning')
            return
        }
        setIsSaving(true)
        try {
            const newId = generateQCId(formData.fechaProgramada)
            const folderPath = `Control de Calidad / ${newId}`
            const payload: Partial<QCInspection> = {
                id: newId,
                operationId: op.id || op.idCarga,
                fechaProgramada: formData.fechaProgramada,
                responsable: formData.responsable,
                estado: formData.estado as 'Pendiente',
                notas: formData.notas || '',
                rutaCarpetaDrive: folderPath
            } as any
            const res = await fetch(`/api/operaciones/${op.id || op.idCarga}/qc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to create inspection');
            const savedInspection = await res.json();
            setInspections([...inspections, savedInspection])
            showToast(`Inspección agendada. Ruta: ${folderPath}`, 'success')
            setIsModalOpen(false)
            setFormData({ fechaProgramada: new Date().toISOString().split('T')[0], responsable: '', estado: 'Pendiente', notas: '' })
        } catch {
            showToast('Error al crear la inspección de calidad', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const openWhatsAppNotification = (ins: QCInspection) => {
        const text = `Hola ${ins.responsable},\n\nSe ha programado una inspección QC para *${op.id || op.idCarga}* el día *${ins.fechaProgramada}*.\n\nCarpeta de evidencia:\n${ins.rutaCarpetaDrive}\n\nNotas: ${ins.notas || 'Ninguna'}`
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
        showToast('Abriendo WhatsApp para notificar al inspector', 'success')
    }

    const getEstadoStyle = (estado: string) => {
        if (estado === 'Completado') return { bg: 'rgba(34,197,94,0.1)', color: 'var(--green)', border: 'rgba(34,197,94,0.2)' }
        if (estado === 'En Proceso') return { bg: 'rgba(6,182,212,0.1)', color: 'var(--cyan)', border: 'rgba(6,182,212,0.2)' }
        return { bg: 'rgba(251,191,36,0.1)', color: 'var(--amber)', border: 'rgba(251,191,36,0.2)' }
    }

    return (
        <div className="animate-in" style={{ padding: 'var(--space-6) 0' }}>

            {/* ── Header ── */}
            <div className="card" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 'var(--space-6)', padding: 'var(--space-5) var(--space-6)',
                background: 'linear-gradient(135deg, rgba(34,197,94,0.05) 0%, transparent 100%)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 'var(--radius-md)',
                        background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                        <ShieldCheck size={22} color="var(--green)" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text)' }}>
                            Control de Calidad (QC)
                        </h2>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                            Trazabilidad estricta y auditoría fotográfica de las inspecciones en origen.
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', flexShrink: 0 }}>
                    <button
                        onClick={() => showToast('Tess AI: "Estoy analizando las fotos del calibre 200/300. Generando borrador técnico..."', 'success')}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Bot size={16} /> Asistente de Reportes
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={16} /> Agendar Inspección
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            {loading ? (
                <div style={{ padding: '80px', textAlign: 'center' }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--green)', opacity: 0.5, margin: '0 auto' }} />
                </div>
            ) : inspections.length === 0 ? (
                /* Empty state */
                <div className="card" style={{
                    padding: 'var(--space-12) var(--space-8)',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-5)',
                }}>
                    <div style={{
                        width: 72, height: 72, borderRadius: 'var(--radius-lg)',
                        background: 'var(--surface-raised)', border: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Briefcase size={32} color="var(--text-dim)" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>
                            Sin Inspecciones Asociadas
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6, margin: 0 }}>
                            Agendá un Control de Calidad para generar automáticamente la carpeta de evidencia fotográfica vinculada a este embarque.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="btn btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Plus size={16} /> Programar Primer QC
                    </button>
                </div>
            ) : (
                /* Inspection cards */
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 'var(--space-4)' }}>
                    {inspections.map((ins) => {
                        const st = getEstadoStyle(ins.estado)
                        return (
                            <div key={ins.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-5)' }}>
                                {/* Card header */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                            Referencia de Auditoría
                                        </div>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>{ins.id}</div>
                                    </div>
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                        background: st.bg, color: st.color, border: `1px solid ${st.border}`
                                    }}>
                                        {ins.estado}
                                    </span>
                                </div>

                                {/* Metadata */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)' }}>
                                        <Calendar size={14} color="var(--text-muted)" />
                                        <span>Fecha: <strong>{ins.fechaProgramada}</strong></span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text)' }}>
                                        <User size={14} color="var(--text-muted)" />
                                        <span>Responsable: <strong>{ins.responsable}</strong></span>
                                    </div>
                                </div>

                                {/* Drive folder path */}
                                <div style={{
                                    padding: '12px', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Folder size={11} /> Directorio Asignado
                                    </div>
                                    <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text)', wordBreak: 'break-all' }}>
                                        {ins.rutaCarpetaDrive}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'auto' }}>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                        onClick={() => {
                                            if (ins.idCarpetaDrive) window.open(`https://drive.google.com/drive/folders/${ins.idCarpetaDrive}`, '_blank')
                                            else showToast('Carpeta no disponible por ID.', 'info')
                                        }}
                                    >
                                        <Folder size={13} /> {ins.idCarpetaDrive ? 'Ver Drive' : 'Evidencia'}
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: '#25D366', borderColor: 'rgba(37,211,102,0.25)' }}
                                        onClick={() => openWhatsAppNotification(ins)}
                                    >
                                        <MessageCircle size={13} /> Notificar
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ gridColumn: '1 / -1', fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
                                    >
                                        <FileText size={13} /> Informe QC Standard
                                    </button>
                                    <button
                                        className="btn btn-secondary"
                                        style={{ gridColumn: '1 / -1', fontSize: '12px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', color: 'var(--accent)', borderColor: 'rgba(99,102,241,0.25)' }}
                                        onClick={() => showToast('Iniciando Tess AI para redactar el reporte...', 'success')}
                                    >
                                        <Sparkles size={13} /> Redactar con Tess AI
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Modal Agendamiento ── */}
            {isModalOpen && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
                }}>
                    <div className="card" style={{
                        width: '100%', maxWidth: '480px', padding: 0,
                        border: '1px solid rgba(34,197,94,0.2)', overflow: 'hidden',
                        animation: 'fadeIn 0.2s ease',
                    }}>
                        {/* Modal header */}
                        <div style={{
                            padding: '20px 24px', borderBottom: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.07) 0%, transparent 80%)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 'var(--radius-md)',
                                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <ShieldCheck size={18} color="var(--green)" />
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text)' }}>Agendar Control</h2>
                                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Se generará la estructura de evidencia auditable.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="icon-btn"><X size={18} /></button>
                        </div>

                        {/* Modal body */}
                        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="input-group">
                                <label className="input-label">Fecha Programada</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={formData.fechaProgramada}
                                    onChange={e => setFormData({ ...formData, fechaProgramada: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Responsable (Inspector)</label>
                                <input
                                    type="text"
                                    placeholder="Nombre del auditor..."
                                    className="input"
                                    value={formData.responsable}
                                    onChange={e => setFormData({ ...formData, responsable: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label className="input-label">Notas iniciales (opcional)</label>
                                <textarea
                                    className="input"
                                    placeholder="Ej: Foco particular en calibre 200/300..."
                                    rows={3}
                                    style={{ resize: 'none' }}
                                    value={formData.notas}
                                    onChange={e => setFormData({ ...formData, notas: e.target.value })}
                                />
                            </div>

                            {/* Warning notice */}
                            <div style={{
                                padding: '12px 14px', background: 'rgba(251,191,36,0.07)',
                                borderRadius: 'var(--radius-md)', border: '1px solid rgba(251,191,36,0.18)',
                                display: 'flex', gap: '10px', alignItems: 'flex-start',
                            }}>
                                <AlertCircle size={15} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
                                <div style={{ fontSize: '12px', color: 'var(--amber)', lineHeight: 1.5 }}>
                                    Al confirmar, el sistema reservará el identificador único y creará la carpeta oficial de Drive para esta inspección.
                                </div>
                            </div>
                        </div>

                        {/* Modal footer */}
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid var(--border)',
                            display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end',
                            background: 'var(--surface-raised)',
                        }}>
                            <button onClick={() => setIsModalOpen(false)} className="btn btn-secondary">Cancelar</button>
                            <button
                                onClick={handleSave}
                                className="btn btn-primary"
                                disabled={isSaving || !formData.fechaProgramada || !formData.responsable}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={15} />}
                                Confirmar & Asignar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
