'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Edit, Users, MapPin, Hash, Mail, Phone, Eye, Target, TrendingUp, CheckCircle, XCircle, Clock, AlertCircle, Sparkles, FileText, Trophy, X, Trash2 } from 'lucide-react'
import { Lead, LeadStatus, Contacto } from '@/lib/sheets-types'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

import { useRouter } from 'next/navigation'

const statusIcons = {
    'Nuevo': Sparkles,
    'Contactado': Phone,
    'Calificado': CheckCircle,
    'Propuesta': FileText,
    'Ganado': Trophy,
    'Perdido': XCircle
}

const statusColors = {
    'Nuevo': 'var(--accent)',
    'Contactado': 'var(--blue)',
    'Calificado': 'var(--green)',
    'Propuesta': 'var(--amber)',
    'Ganado': 'var(--green)',
    'Perdido': 'var(--red)'
}

export default function LeadsView() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [busqueda, setBusqueda] = useState('')
    const [filtroEstado, setFiltroEstado] = useState<string>('todos')
    const [allContacts, setAllContacts] = useState<Contacto[]>([])
    const router = useRouter()

    // Detail Modal state
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
    const [interactions, setInteractions] = useState<any[]>([])
    const [loadingInteractions, setLoadingInteractions] = useState(false)
    const [newInteractionMsg, setNewInteractionMsg] = useState('')
    const [isSavingInteraction, setIsSavingInteraction] = useState(false)

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [newLead, setNewLead] = useState<Partial<Lead>>({
        nombre: '',
        empresa: '',
        email: '',
        telefono: '',
        pais: '',
        fuente: 'Directo',
        estado: 'Nuevo',
        interes: '',
        notas: ''
    })

    // Delete Confirmation state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        fetchLeads()
        fetchContacts()
    }, [])

    const fetchContacts = async () => {
        try {
            const response = await fetch('/api/contactos')
            const data = await response.json()
            if (data.success) {
                setAllContacts(data.data)
            }
        } catch (err) {
            console.error('Error fetching contacts:', err)
        }
    }

    const fetchLeads = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/leads')
            const data = await response.json()
            if (data.data) {
                setLeads(data.data)
            } else {
                setError(data.error || 'Error al cargar leads')
            }
        } catch (err) {
            setError('Error de conexión con el servidor')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateLead = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsSaving(true)
            const response = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newLead,
                    fechaCreacion: new Date().toISOString().split('T')[0]
                })
            })

            if (response.ok) {
                setIsModalOpen(false)
                setNewLead({
                    nombre: '',
                    empresa: '',
                    email: '',
                    telefono: '',
                    pais: '',
                    fuente: 'Directo',
                    estado: 'Nuevo',
                    interes: '',
                    notas: ''
                })
                fetchLeads()
            } else {
                const errorData = await response.json()
                alert(`Error: ${errorData.error}`)
            }
        } catch (err) {
            console.error('Error saving lead:', err)
            alert('Error al guardar el lead')
        } finally {
            setIsSaving(false)
        }
    }

    const fetchInteractions = async (leadId: string) => {
        try {
            setLoadingInteractions(true)
            const response = await fetch(`/api/leads/${leadId}/interactions`)
            const data = await response.json()
            if (data.data) {
                setInteractions(data.data)
            }
        } catch (err) {
            console.error('Error fetching interactions:', err)
        } finally {
            setLoadingInteractions(false)
        }
    }

    const handleAddInteraction = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedLead || !newInteractionMsg.trim()) return

        try {
            setIsSavingInteraction(true)
            const response = await fetch(`/api/leads/${selectedLead.id}/interactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newInteractionMsg })
            })

            if (response.ok) {
                setNewInteractionMsg('')
                fetchInteractions(selectedLead.id)
            }
        } catch (err) {
            console.error('Error saving interaction:', err)
        } finally {
            setIsSavingInteraction(false)
        }
    }

    const handleDeleteLead = (id: string, name: string) => {
        const lead = leads.find(l => l.id === id)
        if (lead) {
            setLeadToDelete(lead)
            setIsDeleteModalOpen(true)
        }
    }

    const confirmDelete = async () => {
        if (!leadToDelete) return

        try {
            setIsDeleting(true)
            const response = await fetch(`/api/leads/${leadToDelete.id}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setLeads(prev => prev.filter(l => l.id !== leadToDelete.id))
                setIsDeleteModalOpen(false)
                setLeadToDelete(null)
            } else {
                alert('Error al eliminar el lead')
            }
        } catch (err) {
            console.error('Error deleting lead:', err)
            alert('Error de conexión')
        } finally {
            setIsDeleting(false)
        }
    }

    const openDetail = (lead: Lead) => {
        router.push(`/leads/${lead.id}`)
    }

    const leadsFiltrados = leads.filter(l => {
        const matchBusqueda =
            l.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
            l.empresa?.toLowerCase().includes(busqueda.toLowerCase()) ||
            l.email?.toLowerCase().includes(busqueda.toLowerCase())
        const matchFiltro = filtroEstado === 'todos' || l.estado === filtroEstado
        return matchBusqueda && matchFiltro
    })

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Gestión de Leads</h1>
                    <p className="page-subtitle">Embudo de ventas y prospección comercial 💎</p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} />
                    Nuevo Lead
                </button>
            </div>

            {/* Filtros */}
            <div className="card" style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--surface-raised)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, empresa..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        {['todos', 'Nuevo', 'Contactado', 'Calificado', 'Propuesta', 'Ganado', 'Perdido'].map((status) => (
                            <button
                                key={status}
                                className={`btn ${filtroEstado === status ? 'btn-primary' : 'btn-secondary'} btn-small`}
                                onClick={() => setFiltroEstado(status)}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Listado de Leads */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Lead / Empresa</th>
                            <th>Estado</th>
                            <th className="hide-on-mobile">Interés / Fuente</th>
                            <th className="hide-on-mobile">Contacto</th>
                            <th style={{ textAlign: 'right' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Cargando...</td></tr>
                        ) : leadsFiltrados.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-dim)' }}>No se encontraron leads</td></tr>
                        ) : (
                            leadsFiltrados.map((lead) => (
                                <tr key={lead.id}>
                                    <td className="cell-entities" style={{ padding: '16px' }}>
                                        <div className="cell-entities-importer">{lead.nombre}</div>
                                        <div className="cell-entities-exporter">{lead.empresa}</div>
                                    </td>
                                    <td>
                                        <span className={`badge`} style={{
                                            background: `${statusColors[lead.estado]}20`,
                                            color: statusColors[lead.estado],
                                            border: `1px solid ${statusColors[lead.estado]}40`
                                        }}>
                                            {lead.estado}
                                        </span>
                                    </td>
                                    <td className="hide-on-mobile">
                                        <div style={{ fontSize: 'var(--font-size-xs)' }}>{lead.interes || 'Sin interés especificado'}</div>
                                        <div style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-dim)' }}>{lead.fuente}</div>
                                    </td>
                                    <td className="hide-on-mobile">
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Mail size={12} /> {lead.email}
                                            </div>
                                            {lead.telefono && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <Phone size={12} /> {lead.telefono}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                                            <button className="btn btn-secondary btn-small" onClick={() => openDetail(lead)} title="Ver detalle">
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-small"
                                                onClick={() => handleDeleteLead(lead.id, lead.nombre)}
                                                style={{ color: 'var(--red)' }}
                                                title="Eliminar lead"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal de Nuevo Lead */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '100%', maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>Nuevo Lead Comercial</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)30' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                                <Users size={14} style={{ color: 'var(--accent)' }} />
                                <label style={{ fontSize: 'var(--font-size-xs)', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 700 }}>
                                    Importar datos de la Agenda
                                </label>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-muted)', margin: '0 0 var(--space-3) 0', lineHeight: 1.4 }}>
                                Seleccioná un contacto y se completarán automáticamente los campos del formulario.
                            </p>
                            <select
                                style={{ width: '100%', padding: '10px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}
                                onChange={(e) => {
                                    const contact = allContacts.find(c => c.id === e.target.value)
                                    if (contact) {
                                        setNewLead({
                                            ...newLead,
                                            nombre: `${contact.nombreContacto} ${contact.apellido}`.trim() || contact.empresa,
                                            empresa: contact.empresa,
                                            email: contact.email,
                                            telefono: contact.telefono,
                                            pais: contact.pais,
                                            contactId: contact.id
                                        })
                                    }
                                }}
                            >
                                <option value="">-- Elegir contacto (opcional) --</option>
                                {allContacts.map(c => (
                                    <option key={c.id} value={c.id}>{c.id} | {c.empresa}</option>
                                ))}
                            </select>
                            {allContacts.length === 0 && (
                                <p style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--amber)', margin: 'var(--space-2) 0 0 0' }}>
                                    ⚠ No se encontraron contactos en la agenda.
                                </p>
                            )}
                        </div>

                        <form onSubmit={handleCreateLead} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Nombre del Contacto</label>
                                    <input
                                        type="text"
                                        required
                                        value={newLead.nombre}
                                        onChange={e => setNewLead({ ...newLead, nombre: e.target.value })}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Empresa</label>
                                    <input
                                        type="text"
                                        required
                                        value={newLead.empresa}
                                        onChange={e => setNewLead({ ...newLead, empresa: e.target.value })}
                                        placeholder="Ej: Tech Corp"
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={newLead.email}
                                        onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                                        placeholder="juan@empresa.com"
                                    />
                                </div>
                                <div className="input-group">
                                    <label>Teléfono</label>
                                    <input
                                        type="text"
                                        value={newLead.telefono}
                                        onChange={e => setNewLead({ ...newLead, telefono: e.target.value })}
                                        placeholder="+54 9 11..."
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Fuente</label>
                                    <select
                                        value={newLead.fuente}
                                        onChange={e => setNewLead({ ...newLead, fuente: e.target.value })}
                                    >
                                        <option value="Directo">Directo</option>
                                        <option value="Web">Web</option>
                                        <option value="Referido">Referido</option>
                                        <option value="LinkedIn">LinkedIn</option>
                                        <option value="Evento">Evento</option>
                                        <option value="WhatsApp">WhatsApp</option>
                                        <option value="Email">Email</option>
                                        <option value="Llamada">Llamada</option>
                                        <option value="Mailing">Mailing</option>
                                        <option value="Reunión">Reunión</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Producto de Interés</label>
                                    <input
                                        type="text"
                                        value={newLead.interes}
                                        onChange={e => setNewLead({ ...newLead, interes: e.target.value })}
                                        placeholder="Ej: Maquinaria Agrícola"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label>Notas / Comentarios</label>
                                <textarea
                                    rows={3}
                                    value={newLead.notas}
                                    onChange={e => setNewLead({ ...newLead, notas: e.target.value })}
                                    placeholder="Detalles adicionales sobre el prospecto..."
                                    style={{ width: '100%', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={isSaving}>
                                    {isSaving ? 'Guardando...' : 'Crear Lead'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalle de Lead */}
            {isDetailModalOpen && selectedLead && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    background: `${statusColors[selectedLead.estado]}20`,
                                    color: statusColors[selectedLead.estado],
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Target size={24} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>{selectedLead.nombre}</h2>
                                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>{selectedLead.empresa}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--space-6)', overflowY: 'auto', paddingRight: 'var(--space-2)' }}>
                            {/* Columna Izquierda: Timeline de Notas */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={16} /> Historial de Movimientos
                                </h3>

                                {/* Formulario Nueva Nota */}
                                <form onSubmit={handleAddInteraction} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    <textarea
                                        className="input"
                                        placeholder="Agregar una nota o actualización..."
                                        rows={2}
                                        value={newInteractionMsg}
                                        onChange={(e) => setNewInteractionMsg(e.target.value)}
                                        style={{ width: '100%', resize: 'none' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button className="btn btn-primary btn-small" disabled={isSavingInteraction || !newInteractionMsg.trim()}>
                                            {isSavingInteraction ? 'Guardando...' : 'Agregar Nota'}
                                        </button>
                                    </div>
                                </form>

                                <div className="timeline" style={{ position: 'relative', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                    <div style={{ position: 'absolute', left: '7px', top: '0', bottom: '0', width: '2px', background: 'var(--border)', opacity: 0.5 }}></div>

                                    {loadingInteractions ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 'var(--space-4)' }}>Cargando historial...</div>
                                    ) : interactions.length === 0 ? (
                                        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 'var(--space-4)' }}>No hay notas registradas aún.</div>
                                    ) : (
                                        [...interactions].reverse().map((int) => (
                                            <div key={int.id} style={{ position: 'relative' }}>
                                                <div style={{
                                                    position: 'absolute',
                                                    left: '-24px',
                                                    top: '4px',
                                                    width: '16px',
                                                    height: '16px',
                                                    borderRadius: '50%',
                                                    background: 'var(--surface-raised)',
                                                    border: '3px solid var(--accent)',
                                                    zIndex: 1
                                                }}></div>
                                                <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--surface-hover)', border: '1px solid var(--border-light)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: 'var(--font-size-xs)' }}>{int.author}</span>
                                                        <span style={{ fontSize: 'var(--font-size-2xs)', color: 'var(--text-dim)' }}>
                                                            {new Date(int.timestamp).toLocaleDateString()} {new Date(int.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{int.message}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Columna Derecha: Datos Generales */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--surface-raised)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Información de Contacto
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Mail size={16} style={{ color: 'var(--text-dim)' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Email</div>
                                                <div style={{ fontSize: '13px' }}>{selectedLead.email}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Phone size={16} style={{ color: 'var(--text-dim)' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Teléfono</div>
                                                <div style={{ fontSize: '13px' }}>{selectedLead.telefono || 'No especificado'}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <MapPin size={16} style={{ color: 'var(--text-dim)' }} />
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>País</div>
                                                <div style={{ fontSize: '13px' }}>{selectedLead.pais || 'No especificado'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card" style={{ padding: 'var(--space-4)', background: 'var(--surface-raised)' }}>
                                    <h3 style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Oportunidad Comercial
                                    </h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Interés</div>
                                            <div style={{ fontSize: '13px', fontWeight: 600 }}>{selectedLead.interes || 'Sin especificar'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Fuente</div>
                                            <div style={{ fontSize: '13px' }}>{selectedLead.fuente}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Fecha Creación</div>
                                            <div style={{ fontSize: '13px' }}>{selectedLead.fechaCreacion}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Estado Actual</div>
                                            <span className="badge" style={{
                                                marginTop: '4px',
                                                background: `${statusColors[selectedLead.estado]}20`,
                                                color: statusColors[selectedLead.estado],
                                                border: `1px solid ${statusColors[selectedLead.estado]}40`
                                            }}>
                                                {selectedLead.estado}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ marginTop: 'var(--space-6)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                            <button className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Eliminar Lead"
                message={
                    <p>
                        ¿Estás seguro de que quieres eliminar al lead <strong>{leadToDelete?.nombre}</strong> de <strong>{leadToDelete?.empresa}</strong>?
                        Esta acción no se puede deshacer.
                    </p>
                }
                onConfirm={confirmDelete}
                onCancel={() => {
                    setIsDeleteModalOpen(false)
                    setLeadToDelete(null)
                }}
                confirmText="Eliminar"
                cancelText="Cancelar"
                isDestructive={true}
                isProcessing={isDeleting}
            />
        </div>
    )
}
