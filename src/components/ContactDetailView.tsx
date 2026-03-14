'use client'

import { useState, useEffect } from 'react'
import {
    User, Mail, Phone, MapPin, Globe, Building2,
    Hash, Landmark, Award, Edit, Trash2, ArrowLeft,
    ExternalLink, Ship, Calendar, ArrowRight, Clock,
    MessageSquare, Send, Activity, Plus, Target
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Contacto, Operacion } from '@/lib/sheets-types'
import { ContactForm } from './ContactForm'
import { useToast } from './ui/Toast'
import { ConfirmModal } from './ui/ConfirmModal'
import { RelatedOperations } from './RelatedOperations'

interface ContactDetailViewProps {
    contactId: string
}

export function ContactDetailView({ contactId }: ContactDetailViewProps) {
    const router = useRouter()
    const [contacto, setContacto] = useState<Contacto | null>(null)
    const [interactions, setInteractions] = useState<any[]>([])
    const [newInteraction, setNewInteraction] = useState('')
    const [submittingNote, setSubmittingNote] = useState(false)
    const [loading, setLoading] = useState(true)
    const [loadingInteractions, setLoadingInteractions] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const { showToast } = useToast()

    // Agenda scheduling state
    const [showAgendaForm, setShowAgendaForm] = useState(false)
    const [agendaType, setAgendaType] = useState<'MEETING' | 'TASK'>('MEETING')
    const [agendaTitle, setAgendaTitle] = useState('')
    const [agendaDate, setAgendaDate] = useState('')
    const [agendaTime, setAgendaTime] = useState('')
    const [submittingAgenda, setSubmittingAgenda] = useState(false)

    const handleScheduleAgenda = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!agendaTitle.trim() || !agendaDate) return
        setSubmittingAgenda(true)
        try {
            // 1. Save to Agenda
            const res = await fetch('/api/dashboard/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: agendaTitle,
                    date: agendaDate,
                    time: agendaTime || '',
                    type: agendaType,
                    status: 'PENDING',
                    contactId: contactId,
                })
            })
            const data = await res.json()

            if (data.success) {
                // 2. Also register as CRM interaction
                const typeLabel = agendaType === 'MEETING' ? 'Reunión' : 'Tarea'
                const timeStr = agendaTime ? ` a las ${agendaTime}` : ''
                await fetch(`/api/contactos/${contactId}/interactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: `📅 ${typeLabel} agendada: "${agendaTitle}" para el ${agendaDate}${timeStr}`
                    })
                })

                showToast(`${typeLabel} agendada correctamente`, 'success')
                setAgendaTitle('')
                setAgendaDate('')
                setAgendaTime('')
                setShowAgendaForm(false)
                fetchInteractions()
            } else {
                showToast(data.error || 'Error al agendar', 'error')
            }
        } catch (error) {
            console.error('Error scheduling agenda item:', error)
            showToast('Error de conexión al agendar', 'error')
        } finally {
            setSubmittingAgenda(false)
        }
    }

    useEffect(() => {
        fetchContact()
        fetchInteractions()
    }, [contactId])

    const fetchContact = async () => {
        try {
            const res = await fetch(`/api/contactos/${contactId}`)
            const data = await res.json()
            if (data.success) {
                setContacto(data.data)
            }
        } catch (error) {
            console.error('Error fetching contact:', error)
        } finally {
            setLoading(false)
        }
    }


    const fetchInteractions = async () => {
        try {
            setLoadingInteractions(true)
            const res = await fetch(`/api/contactos/${contactId}/interactions`)
            const data = await res.json()
            if (data.success) {
                setInteractions(data.data)
            }
        } catch (error) {
            console.error('Error fetching interactions:', error)
        } finally {
            setLoadingInteractions(false)
        }
    }

    const handleAddInteraction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newInteraction.trim()) return

        try {
            setSubmittingNote(true)
            const res = await fetch(`/api/contactos/${contactId}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newInteraction })
            })
            const data = await res.json()
            if (data.success) {
                setNewInteraction('')
                fetchInteractions()
                showToast('Nota añadida correctamente', 'success')
            }
        } catch (error) {
            console.error('Error adding interaction:', error)
            showToast('Error al añadir nota', 'error')
        } finally {
            setSubmittingNote(false)
        }
    }

    const handleDelete = () => {
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        setShowDeleteConfirm(false)

        setDeleting(true)
        try {
            const res = await fetch(`/api/contactos/${contactId}`, { method: 'DELETE' })
            if (res.ok) {
                router.push('/contactos')
                router.refresh()
            } else {
                showToast('No se pudo eliminar el contacto', 'error')
            }
        } catch (error) {
            console.error('Error deleting contact:', error)
        } finally {
            setDeleting(false)
        }
    }

    const handleUpdate = async (data: any) => {
        const response = await fetch(`/api/contactos/${contactId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        })

        if (response.ok) {
            const resData = await response.json()
            setContacto(resData.data)
            setIsEditing(false)
            router.refresh()
        } else {
            throw new Error('Error al actualizar contacto')
        }
    }

    if (loading) return (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <div className="spinner" />
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-muted)' }}>Cargando datos del contacto...</p>
        </div>
    )

    if (!contacto) return (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
            <p style={{ color: 'var(--red)' }}>Contacto no encontrado</p>
            <Link href="/contactos" className="btn btn-secondary mt-4">Volver a Contactos</Link>
        </div>
    )

    if (isEditing) {
        return (
            <div className="animate-in">
                <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <button onClick={() => setIsEditing(false)} className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2 className="page-title">Editando: {contacto.empresa}</h2>
                </div>
                <ContactForm
                    initialData={contacto as any}
                    isEditing={true}
                    onSubmit={handleUpdate}
                />
            </div>
        )
    }

    return (
        <div className="animate-in">
            {/* Header / Navigation */}
            <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Link href="/contactos" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeft size={18} /> Volver a Lista
                </Link>
            </div>

            {/* Ficha del Contacto */}
            <div className="card" style={{ position: 'relative', overflow: 'visible', marginBottom: 'var(--space-8)' }}>
                {/* Botones de Acción en la esquina superior derecha */}
                <div style={{
                    position: 'absolute',
                    top: 'var(--space-4)',
                    right: 'var(--space-4)',
                    display: 'flex',
                    gap: 'var(--space-2)',
                    zIndex: 10
                }}>
                    <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-secondary btn-small"
                        title="Editar contacto"
                    >
                        <Edit size={14} /> Editar
                    </button>
                    <button
                        onClick={handleDelete}
                        className="btn btn-danger btn-small"
                        disabled={deleting}
                        title="Eliminar contacto"
                        style={{ background: 'var(--red-soft)', color: 'var(--red)', borderColor: 'rgba(239,68,68,0.2)' }}
                    >
                        {deleting ? <div className="spinner-xs" /> : <Trash2 size={14} />} Eliminar
                    </button>
                </div>

                {/* Contenido Principal de la Ficha */}
                <div style={{ padding: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
                        {/* Identidad */}
                        <div style={{ flex: '1', minWidth: '300px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 'var(--radius-lg)',
                                    background: 'var(--accent-soft)', color: 'var(--accent)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Building2 size={24} />
                                </div>
                                <div>
                                    <code style={{
                                        display: 'inline-block',
                                        background: 'var(--surface-raised)',
                                        color: 'var(--text-dim)',
                                        fontSize: 'var(--font-size-xs)',
                                        fontFamily: 'var(--font-mono)',
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        marginBottom: '6px',
                                    }}>
                                        {contacto.id}
                                    </code>
                                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, margin: 0, lineHeight: 1 }}>
                                        {contacto.empresa}
                                    </h1>
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '4px' }}>
                                        {contacto.isImporter && <span className="badge badge-importador">Importador</span>}
                                        {contacto.isExporter && <span className="badge badge-exportador">Exportador</span>}
                                        {contacto.isProducer && <span className="badge badge-productor">Productor</span>}
                                        {contacto.isForwarder && <span className="badge badge-flete">Forwarder</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                                    <User size={18} style={{ color: 'var(--text-dim)', marginTop: '4px' }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Contacto Principal</div>
                                        <div style={{ fontWeight: 600, color: (contacto.nombreContacto || contacto.apellido) ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.nombreContacto || contacto.apellido ? `${contacto.nombreContacto || ''} ${contacto.apellido || ''}`.trim() : 'No especificado'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                                    <Mail size={18} style={{ color: 'var(--text-dim)', marginTop: '4px' }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Email</div>
                                        {contacto.email ? (
                                            <a href={`mailto:${contacto.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{contacto.email}</a>
                                        ) : (
                                            <div style={{ color: 'var(--text-muted)' }}>Sin email</div>
                                        )}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                                    <Phone size={18} style={{ color: 'var(--text-dim)', marginTop: '4px' }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Teléfono</div>
                                        <div style={{ color: contacto.telefono ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.telefono || 'Sin teléfono'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ubicación y Datos Técnicos */}
                        <div className="mobile-stack-border" style={{ flex: '1', minWidth: '300px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                                    <MapPin size={18} style={{ color: 'var(--text-dim)', marginTop: '4px' }} />
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>Ubicación</div>
                                        <div style={{ fontSize: 'var(--font-size-sm)', color: (contacto.direccion || contacto.pais) ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.direccion || 'Sin dirección'}
                                            {(contacto.direccion && contacto.pais) && <br />}
                                            {contacto.pais || (contacto.direccion ? '' : 'País no especificado')}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Hash size={12} /> Tax ID / RUC
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: contacto.taxId ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.taxId || 'No asignado'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Landmark size={12} /> N° Planta
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: contacto.nPlanta ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.nPlanta || 'No asignado'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Award size={12} /> FDA
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: contacto.fda ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.fda || 'No asignado'}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Award size={12} /> Marca / Brand
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: contacto.brand ? 'inherit' : 'var(--text-muted)' }}>
                                            {contacto.brand || 'Sin marca'}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-raised)', borderRadius: 'var(--radius-md)' }}>
                                    <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '4px' }}>Descripción / Notas</div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontStyle: contacto.description ? 'italic' : 'normal', color: contacto.description ? 'inherit' : 'var(--text-muted)' }}>
                                        {contacto.description ? `"${contacto.description}"` : 'Sin descripción registrada'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actividad CRM */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--space-4)' }}>
                    <Activity size={24} color="var(--accent)" />
                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>Actividad CRM</h2>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 'var(--space-6)', alignItems: 'start' }}>
                    {/* Línea de Tiempo */}
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        {loadingInteractions ? (
                            <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                                <div className="spinner-sm" style={{ margin: '0 auto' }} />
                            </div>
                        ) : interactions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-dim)' }}>
                                <MessageSquare size={32} style={{ margin: '0 auto', opacity: 0.2, marginBottom: 'var(--space-4)' }} />
                                <p>No hay actividad registrada aún.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                {interactions.slice().reverse().map((int, i) => (
                                    <div key={int.id || i} style={{ display: 'flex', gap: 'var(--space-4)', position: 'relative' }}>
                                        {i !== interactions.length - 1 && (
                                            <div style={{
                                                position: 'absolute', left: '11px', top: '24px', bottom: '-24px',
                                                width: '2px', background: 'var(--border)', opacity: 0.5
                                            }} />
                                        )}
                                        <div style={{
                                            width: 24, height: 24, borderRadius: '50%',
                                            background: 'var(--accent-soft)', color: 'var(--accent)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0, zIndex: 1
                                        }}>
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor' }} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 700, fontSize: '13px' }}>{int.author}</span>
                                                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{int.timestamp}</span>
                                            </div>
                                            <div style={{
                                                fontSize: '14px', lineHeight: '1.5', color: 'var(--text)',
                                                background: 'var(--surface-raised)', padding: '12px', borderRadius: '12px'
                                            }}>
                                                {int.message}
                                                {int.leadId && (
                                                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Target size={12} /> Vinculado a Lead: {int.leadId}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Nueva Nota Quick Form */}
                    <div className="card" style={{ padding: 'var(--space-6)', position: 'sticky', top: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Plus size={16} color="var(--accent)" /> Nueva Nota de Seguimiento
                        </h3>
                        <form onSubmit={handleAddInteraction}>
                            <textarea
                                value={newInteraction}
                                onChange={(e) => setNewInteraction(e.target.value)}
                                placeholder="Escribe aquí los detalles del contacto, pedidos especiales, o avances..."
                                style={{
                                    width: '100%', height: '120px', background: 'var(--bg)',
                                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                    padding: '12px', color: 'var(--text)', fontSize: '13px',
                                    resize: 'none', marginBottom: 'var(--space-4)'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={submittingNote || !newInteraction.trim()}
                                className="btn btn-primary"
                                style={{ width: '100%', gap: '8px' }}
                            >
                                {submittingNote ? <div className="spinner-xs" /> : <Send size={16} />}
                                Registrar Actividad
                            </button>
                        </form>

                        {/* Agendar Button */}
                        <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                            <button
                                onClick={() => setShowAgendaForm(!showAgendaForm)}
                                className="btn btn-secondary"
                                style={{ width: '100%', gap: '8px', justifyContent: 'center' }}
                            >
                                <Calendar size={16} /> {showAgendaForm ? 'Cerrar Agenda' : 'Agendar Llamada / Reunión'}
                            </button>

                            {showAgendaForm && (
                                <form onSubmit={handleScheduleAgenda} style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                    {/* Tipo */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {(['MEETING', 'TASK'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setAgendaType(t)}
                                                style={{
                                                    flex: 1,
                                                    padding: '8px',
                                                    fontSize: '12px',
                                                    fontWeight: 600,
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${agendaType === t ? 'var(--accent)' : 'var(--border)'}`,
                                                    background: agendaType === t ? 'var(--accent-soft)' : 'var(--bg)',
                                                    color: agendaType === t ? 'var(--accent)' : 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {t === 'MEETING' ? '📞 Llamada / Reunión' : '✅ Tarea'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Título */}
                                    <input
                                        type="text"
                                        value={agendaTitle}
                                        onChange={e => setAgendaTitle(e.target.value)}
                                        placeholder={agendaType === 'MEETING' ? 'Ej: Llamar para confirmar pedido' : 'Ej: Enviar cotización actualizada'}
                                        style={{
                                            width: '100%', padding: '10px 12px', background: 'var(--bg)',
                                            border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                            color: 'var(--text)', fontSize: '13px'
                                        }}
                                    />

                                    {/* Fecha y Hora */}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="date"
                                            value={agendaDate}
                                            onChange={e => setAgendaDate(e.target.value)}
                                            style={{
                                                flex: 2, padding: '10px 12px', background: 'var(--bg)',
                                                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                                color: 'var(--text)', fontSize: '13px'
                                            }}
                                        />
                                        <input
                                            type="time"
                                            value={agendaTime}
                                            onChange={e => setAgendaTime(e.target.value)}
                                            style={{
                                                flex: 1, padding: '10px 12px', background: 'var(--bg)',
                                                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                                                color: 'var(--text)', fontSize: '13px'
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submittingAgenda || !agendaTitle.trim() || !agendaDate}
                                        className="btn btn-primary"
                                        style={{ width: '100%', gap: '8px' }}
                                    >
                                        {submittingAgenda ? <div className="spinner-xs" /> : <Calendar size={16} />}
                                        Agendar
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <RelatedOperations contactId={contactId} title="Historial de Operaciones" />

            {showDeleteConfirm && (
                <ConfirmModal
                    isOpen={showDeleteConfirm}
                    onCancel={() => setShowDeleteConfirm(false)}
                    onConfirm={confirmDelete}
                    title="Eliminar Contacto"
                    message={`¿Estás seguro de que deseas eliminar a ${contacto?.empresa}? Esta acción no se puede deshacer.`}
                    confirmText="Eliminar"
                    cancelText="Cancelar"
                    isDestructive={true}
                    isProcessing={deleting}
                />
            )}

            <style jsx>{`
                .spinner-xs {
                    width: 14px;
                    height: 14px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                .spinner-sm {
                    width: 24px;
                    height: 24px;
                    border: 2px solid var(--border);
                    border-top-color: var(--accent);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .btn-danger {
                    background: var(--red);
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .btn-danger:hover {
                    background: #dc2626;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .btn-icon {
                    display: inline-flex;
                    padding: 8px;
                    border-radius: 50%;
                    color: var(--text-muted);
                    transition: all 0.2s;
                }
                .btn-icon:hover {
                    background: var(--surface-hover);
                    color: var(--accent);
                }
            `}</style>
        </div>
    )
}
