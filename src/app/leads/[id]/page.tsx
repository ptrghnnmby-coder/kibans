'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    ArrowLeft, Mail, Phone, MapPin, Target, Sparkles,
    CheckCircle, XCircle, FileText, Trophy, Clock,
    Save, UserPlus, Link as LinkIcon, Trash2, Loader2,
    Search, CalendarPlus, PhoneCall, Users
} from 'lucide-react'
import { Lead, LeadStatus, Contacto } from '@/lib/sheets-types'

const statusColors = {
    'Nuevo': 'var(--accent)',
    'Contactado': 'var(--blue)',
    'Calificado': 'var(--green)',
    'Propuesta': 'var(--amber)',
    'Ganado': 'var(--green)',
    'Perdido': 'var(--red)'
}

export default function LeadDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [lead, setLead] = useState<Lead | null>(null)
    const [contacto, setContacto] = useState<Contacto | null>(null)
    const [allContacts, setAllContacts] = useState<Contacto[]>([])
    const [interactions, setInteractions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isLinking, setIsLinking] = useState(false)
    const [searchContact, setSearchContact] = useState('')
    const [newInteractionMsg, setNewInteractionMsg] = useState('')
    const [isSavingInteraction, setIsSavingInteraction] = useState(false)

    // Agenda scheduling state
    const [isScheduling, setIsScheduling] = useState(false)
    const [schedulingType, setSchedulingType] = useState<'MEETING' | 'TASK'>('TASK')
    const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0])
    const [scheduleTime, setScheduleTime] = useState('10:00')
    const [isSavingSchedule, setIsSavingSchedule] = useState(false)
    const [scheduledItems, setScheduledItems] = useState<any[]>([])

    useEffect(() => {
        fetchData()
        fetchScheduledItems()
    }, [params.id])

    const fetchData = async () => {
        try {
            setLoading(true)
            // Fetch Lead
            const leadRes = await fetch(`/api/leads/${params.id}`)
            const leadData = await leadRes.json()
            if (leadData.data) {
                setLead(leadData.data)

                // Fetch Interactions
                fetchInteractions(params.id)

                // Fetch linked contact if exists
                if (leadData.data.contactId) {
                    fetchLinkedContact(leadData.data.contactId)
                }
            }

            // Fetch All Contacts for linking
            const contactsRes = await fetch('/api/contactos')
            const contactsData = await contactsRes.json()
            if (contactsData.data) {
                setAllContacts(contactsData.data)
            }
        } catch (error) {
            console.error('Error fetching lead data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchLinkedContact = async (contactId: string) => {
        try {
            const res = await fetch(`/api/contactos/${contactId}`)
            const data = await res.json()
            if (data.data) {
                setContacto(data.data)
            }
        } catch (error) {
            console.error('Error fetching contact:', error)
        }
    }

    const fetchInteractions = async (leadId: string) => {
        try {
            const response = await fetch(`/api/leads/${leadId}/interactions`)
            const data = await response.json()
            if (data.data) {
                setInteractions(data.data)
            }
        } catch (err) {
            console.error('Error fetching interactions:', err)
        }
    }

    const handleUpdateLead = async (updates: Partial<Lead>) => {
        if (!lead) return
        try {
            setSaving(true)
            const response = await fetch(`/api/leads/${params.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            })
            if (response.ok) {
                setLead({ ...lead, ...updates })
            }
        } catch (error) {
            alert('Error al actualizar')
        } finally {
            setSaving(false)
        }
    }

    const handleAddInteraction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!lead || !newInteractionMsg.trim()) return

        try {
            setIsSavingInteraction(true)
            const response = await fetch(`/api/leads/${lead.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newInteractionMsg })
            })

            if (response.ok) {
                setNewInteractionMsg('')
                fetchInteractions(lead.id)
            }
        } catch (err) {
            console.error('Error saving interaction:', err)
        } finally {
            setIsSavingInteraction(false)
        }
    }

    const handleLinkContact = async (contactId: string) => {
        await handleUpdateLead({ contactId })
        fetchLinkedContact(contactId)
        setIsLinking(false)
    }

    const filteredContacts = allContacts.filter(c =>
        c.empresa?.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.nombreContacto?.toLowerCase().includes(searchContact.toLowerCase()) ||
        c.id?.toLowerCase().includes(searchContact.toLowerCase())
    )

    const fetchScheduledItems = async () => {
        try {
            const today = new Date()
            const startDate = today.toISOString().split('T')[0]
            const futureDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            const res = await fetch(`/api/dashboard/agenda?startDate=${startDate}&endDate=${futureDate}`)
            const data = await res.json()
            if (data.data) {
                const leadItems = data.data.filter((item: any) =>
                    item.title?.includes(params.id) || item.contactId === params.id
                )
                setScheduledItems(leadItems)
            }
        } catch (err) {
            console.error('Error fetching scheduled items:', err)
        }
    }

    const handleSchedule = async () => {
        if (!lead) return
        try {
            setIsSavingSchedule(true)
            const typeLabel = schedulingType === 'MEETING' ? 'Reunión' : 'Llamada'
            const title = `${typeLabel} con ${lead.nombre} (${lead.empresa}) [${lead.id}]`

            const res = await fetch('/api/dashboard/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: scheduleDate,
                    time: scheduleTime,
                    title,
                    type: schedulingType,
                    status: 'PENDING',
                    creator: 'Sistema',
                    contactId: lead.contactId || ''
                })
            })

            if (res.ok) {
                // Also log as interaction
                await fetch(`/api/leads/${lead.id}/interactions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: `📅 ${typeLabel} agendada para ${scheduleDate} a las ${scheduleTime}` })
                })
                fetchInteractions(lead.id)
                fetchScheduledItems()
                setIsScheduling(false)
            }
        } catch (err) {
            console.error('Error scheduling:', err)
            alert('Error al agendar')
        } finally {
            setIsSavingSchedule(false)
        }
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Loader2 className="animate-spin" size={32} />
            </div>
        )
    }

    if (!lead) return <div className="page-container">Lead no encontrado</div>

    return (
        <div className="animate-in" style={{ padding: 'var(--space-6)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <button onClick={() => router.back()} className="btn btn-secondary btn-small">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '4px' }}>{lead.nombre}</h1>
                        <p className="page-subtitle">{lead.empresa}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <select
                        className="btn btn-secondary"
                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}
                        value={lead.estado}
                        onChange={(e) => handleUpdateLead({ estado: e.target.value as LeadStatus })}
                    >
                        {['Nuevo', 'Contactado', 'Calificado', 'Propuesta', 'Ganado', 'Perdido'].map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-8)' }}>
                {/* Columna Izquierda: Información y CRM */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                    {/* Tarjeta de Datos Principales */}
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        <h3 className="section-title">Información General</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>Persona de Contacto</label>
                                <input
                                    type="text"
                                    defaultValue={lead.nombre}
                                    onBlur={(e) => e.target.value !== lead.nombre && handleUpdateLead({ nombre: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Empresa</label>
                                <input
                                    type="text"
                                    defaultValue={lead.empresa}
                                    onBlur={(e) => e.target.value !== lead.empresa && handleUpdateLead({ empresa: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <input
                                    type="email"
                                    defaultValue={lead.email}
                                    onBlur={(e) => e.target.value !== lead.email && handleUpdateLead({ email: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Teléfono</label>
                                <input
                                    type="text"
                                    defaultValue={lead.telefono}
                                    onBlur={(e) => e.target.value !== lead.telefono && handleUpdateLead({ telefono: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>País</label>
                                <input
                                    type="text"
                                    defaultValue={lead.pais}
                                    onBlur={(e) => e.target.value !== lead.pais && handleUpdateLead({ pais: e.target.value })}
                                />
                            </div>
                            <div className="input-group">
                                <label>Producto de Interés</label>
                                <input
                                    type="text"
                                    defaultValue={lead.interes}
                                    onBlur={(e) => e.target.value !== lead.interes && handleUpdateLead({ interes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Timeline de Seguimiento */}
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        <h3 className="section-title">Historial de Seguimiento</h3>

                        <form onSubmit={handleAddInteraction} style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <textarea
                                className="input"
                                placeholder="Escribe una nota importante sobre este lead..."
                                rows={3}
                                value={newInteractionMsg}
                                onChange={(e) => setNewInteractionMsg(e.target.value)}
                                style={{ width: '100%', resize: 'none' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary" disabled={isSavingInteraction || !newInteractionMsg.trim()}>
                                    {isSavingInteraction ? 'Guardando...' : 'Registrar Nota'}
                                </button>
                            </div>
                        </form>

                        <div className="timeline" style={{ marginTop: 'var(--space-6)', position: 'relative', paddingLeft: '24px' }}>
                            <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '0', width: '2px', background: 'var(--border)', opacity: 0.5 }}></div>

                            {interactions.length === 0 ? (
                                <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>No hay interacciones registradas.</p>
                            ) : (
                                [...interactions].reverse().map((int) => (
                                    <div key={int.id} style={{ position: 'relative', marginBottom: 'var(--space-4)' }}>
                                        <div style={{
                                            position: 'absolute', left: '-24px', top: '6px', width: '12px', height: '12px',
                                            borderRadius: '50%', background: 'var(--surface-raised)', border: '2px solid var(--accent)', zIndex: 1
                                        }}></div>
                                        <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--surface-hover)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: 600 }}>{int.author}</span>
                                                <span style={{ color: 'var(--text-dim)' }}>{int.timestamp}</span>
                                            </div>
                                            <p style={{ margin: 0, fontSize: 'var(--font-size-sm)' }}>{int.message}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Columna Derecha: Vinculación Entidad */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                    {/* Vínculo con Contacto */}
                    <div className="card" style={{ padding: 'var(--space-6)', border: contacto ? '1px solid var(--green)' : '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 className="section-title">Vínculo con Entidad</h3>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => setIsLinking(!isLinking)}
                            >
                                {contacto ? 'Cambiar' : 'Vincular'}
                            </button>
                        </div>

                        {contacto ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <CheckCircle size={20} style={{ color: 'var(--green)' }} />
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{contacto.empresa}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>ID: {contacto.id}</div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    Este lead ya está vinculado a un cliente/proveedor oficial. Las órdenes de compra y operaciones pueden rastrearse ahora.
                                </div>
                                <button className="btn btn-secondary btn-small" onClick={() => router.push(`/contacts?search=${contacto.empresa}`)}>
                                    Ir a Perfil de Entidad
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                                <LinkIcon size={32} style={{ color: 'var(--text-dim)', marginBottom: 'var(--space-2)' }} />
                                <p style={{ fontSize: '13px', color: 'var(--text-dim)' }}>No vinculado a ninguna entidad oficial.</p>
                                <p style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>Vincule para habilitar seguimiento de pedidos.</p>
                            </div>
                        )}

                        {isLinking && (
                            <div style={{
                                marginTop: 'var(--space-4)',
                                padding: 'var(--space-4)',
                                background: 'var(--surface-raised)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--accent)'
                            }}>
                                <div className="search-bar" style={{ marginBottom: 'var(--space-3)' }}>
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar contacto..."
                                        value={searchContact}
                                        onChange={(e) => setSearchContact(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {filteredContacts.length > 0 && (
                                        <div style={{ fontSize: '10px', color: 'var(--text-dim)', padding: '2px 8px', marginBottom: '4px' }}>
                                            {filteredContacts.length} contacto{filteredContacts.length !== 1 ? 's' : ''} encontrado{filteredContacts.length !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {filteredContacts.slice(0, 15).map(c => (
                                        <button
                                            key={c.id}
                                            className="btn-select"
                                            onClick={() => handleLinkContact(c.id)}
                                            style={{
                                                textAlign: 'left',
                                                padding: 'var(--space-2) var(--space-3)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: 'var(--text)',
                                                width: '100%',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, fontSize: '12px' }}>{c.id} | {c.empresa}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{c.nombreContacto} {c.apellido}</div>
                                        </button>
                                    ))}
                                    {filteredContacts.length === 0 && (
                                        <div style={{ fontSize: '12px', textAlign: 'center', padding: '10px', color: 'var(--text-dim)' }}>
                                            {allContacts.length === 0 ? 'Cargando contactos...' : 'No se encontraron contactos'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Acciones Comerciales */}
                    <div className="card" style={{ padding: 'var(--space-6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 className="section-title">Acciones Comerciales</h3>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => { setSchedulingType('TASK'); setIsScheduling(!isScheduling) }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                            >
                                <PhoneCall size={14} /> Agendar Llamada
                            </button>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={() => { setSchedulingType('MEETING'); setIsScheduling(!isScheduling) }}
                                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}
                            >
                                <CalendarPlus size={14} /> Agendar Reunión
                            </button>
                        </div>

                        {isScheduling && (
                            <div style={{
                                padding: 'var(--space-4)',
                                background: 'var(--surface-raised)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--accent)',
                                marginBottom: 'var(--space-4)'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {schedulingType === 'MEETING' ? <CalendarPlus size={14} /> : <PhoneCall size={14} />}
                                    {schedulingType === 'MEETING' ? 'Nueva Reunión' : 'Nueva Llamada'}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px' }}>Fecha</label>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            style={{ fontSize: '12px' }}
                                        />
                                    </div>
                                    <div className="input-group" style={{ flex: 1 }}>
                                        <label style={{ fontSize: '11px' }}>Hora</label>
                                        <input
                                            type="time"
                                            value={scheduleTime}
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                            style={{ fontSize: '12px' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-secondary btn-small" onClick={() => setIsScheduling(false)}>Cancelar</button>
                                    <button className="btn btn-primary btn-small" onClick={handleSchedule} disabled={isSavingSchedule}>
                                        {isSavingSchedule ? 'Guardando...' : 'Confirmar'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {scheduledItems.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {scheduledItems.map((item: any, idx: number) => (
                                    <div key={idx} style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'var(--surface-hover)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '12px'
                                    }}>
                                        {item.type === 'MEETING' ? <CalendarPlus size={12} style={{ color: 'var(--blue)' }} /> : <PhoneCall size={12} style={{ color: 'var(--green)' }} />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{item.title}</div>
                                            <div style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{item.date} {item.time && `a las ${item.time}`}</div>
                                        </div>
                                        <span className="badge" style={{
                                            fontSize: '9px',
                                            background: item.status === 'DONE' ? 'var(--green)20' : 'var(--amber)20',
                                            color: item.status === 'DONE' ? 'var(--green)' : 'var(--amber)'
                                        }}>{item.status === 'DONE' ? 'Hecho' : 'Pendiente'}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 'var(--space-2)', fontSize: '12px', color: 'var(--text-dim)' }}>
                                No hay acciones agendadas para este lead.
                            </div>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div className="card" style={{ padding: 'var(--space-6)', background: 'var(--surface-elevated)' }}>
                        <h3 className="section-title">Metadatos del Lead</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginTop: 'var(--space-4)', fontSize: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>ID Interno</span>
                                <span>{lead.id}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Fecha Creación</span>
                                <span>{lead.fechaCreacion}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Fuente de Origen</span>
                                <span>{lead.fuente}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Responsable</span>
                                <span>{lead.responsable || 'No asignado'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .section-title {
                    font-size: 14px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-dim);
                    margin-bottom: var(--space-2);
                }
                .btn-select:hover {
                    background: var(--surface-hover) !important;
                }
            `}</style>
        </div>
    )
}
