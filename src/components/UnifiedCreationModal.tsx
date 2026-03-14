'use client'

import { useState, useEffect } from 'react'
import {
    X, MessageSquare, CheckSquare, Calendar, Users,
    Info, AlertCircle, CheckCircle2,
    Package, User, Search, RefreshCw
} from 'lucide-react'
import { USER_MAP, Note, AgendaItem, Contacto, Operacion, Producto } from '@/lib/sheets-types'
import { SearchableSelect } from './ui/SearchableSelect'
import { useToast } from './ui/Toast'

interface UnifiedCreationModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    userEmail: string
    userName: string
    initialType?: 'NOTE' | 'TASK' | 'MEETING'
    editItem?: AgendaItem
}

export function UnifiedCreationModal({
    isOpen,
    onClose,
    onSuccess,
    userEmail,
    userName,
    initialType = 'NOTE',
    editItem
}: UnifiedCreationModalProps) {
    const { showToast } = useToast()
    const [type, setType] = useState<'NOTE' | 'TASK' | 'MEETING'>(initialType)
    const [content, setContent] = useState('')
    const [noteType, setNoteType] = useState<Note['type']>('info')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [time, setTime] = useState('')
    const [activeFor, setActiveFor] = useState<string[]>([]) // Recipients for Notes
    const [assignedTo, setAssignedTo] = useState<string[]>([]) // Assignees for Tasks/Meetings

    // Linked Entities
    const [opId, setOpId] = useState('')
    const [productId, setProductId] = useState('')
    const [contactId, setContactId] = useState('')

    // Data for selects
    const [ops, setOps] = useState<Operacion[]>([])
    const [products, setProducts] = useState<Producto[]>([])
    const [contacts, setContacts] = useState<Contacto[]>([])
    const [loadingData, setLoadingData] = useState(false)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            fetchData()
            setType(editItem ? (editItem.type === 'MEETING' ? 'MEETING' : 'TASK') : initialType)
            
            if (editItem) {
                setContent(editItem.title || '')
                setNoteType('info')
                setDate(editItem.date || new Date().toISOString().split('T')[0])
                setTime(editItem.time || '')
                setAssignedTo(editItem.assignedTo ? editItem.assignedTo.split(',').map(e => e.trim()).filter(Boolean) : [])
                setOpId(editItem.operationId || '')
                setProductId(editItem.productId || '')
                setContactId(editItem.contactId || '')
            } else {
                setContent('')
                setNoteType('info')
                setDate(new Date().toISOString().split('T')[0])
                setTime('')
                setActiveFor([])
                setAssignedTo(initialType === 'TASK' || initialType === 'MEETING' ? [userEmail] : [])
                setOpId('')
                setProductId('')
                setContactId('')
            }
        }
    }, [isOpen, initialType, editItem, userEmail])

    const fetchData = async () => {
        setLoadingData(true)
        try {
            const [opsRes, prodRes, contRes] = await Promise.all([
                fetch('/api/operaciones/all'),
                fetch('/api/productos'),
                fetch('/api/contactos')
            ])

            if (opsRes.ok) {
                const opsData = await opsRes.json()
                if (opsData.success) setOps(opsData.data)
            }
            if (prodRes.ok) {
                const prodData = await prodRes.json()
                if (prodData.success) setProducts(prodData.data)
            }
            if (contRes.ok) {
                const contData = await contRes.json()
                if (contData.success) setContacts(contData.data)
            }
        } catch (error) {
            console.error('Error fetching modal data:', error)
        } finally {
            setLoadingData(false)
        }
    }

    const handleSave = async () => {
        if (!content.trim()) return
        setSaving(true)

        try {
            if (type === 'NOTE') {
                const note = {
                    content,
                    author: userName || userEmail || 'Anónimo',
                    type: noteType,
                    activeFor: activeFor,
                    operationId: opId,
                    productId,
                    contactId
                }
                const res = await fetch('/api/dashboard/notes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(note)
                })
                const data = await res.json()
                if (data.success) {
                    showToast('Nota creada', 'success')
                    onSuccess()
                    onClose()
                }
            } else {
                // TASK or MEETING
                const body = {
                    id: editItem?.id, // Only include ID if editing
                    date,
                    time: type === 'MEETING' ? time : undefined, // Time is only for meetings
                    title: content,
                    type,
                    status: editItem?.status || 'PENDING', // Preserve status if editing, otherwise default to PENDING
                    creator: editItem?.creator || userName, // Preserve creator if editing, otherwise use current user
                    assignedTo: assignedTo.join(','),
                    operationId: opId,
                    productId,
                    contactId
                }
                const res = await fetch('/api/dashboard/agenda', {
                    method: editItem ? 'PUT' : 'POST', // Use PUT for editing, POST for creating
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
                if (!res.ok) throw new Error('Failed to save agenda item')
                const data = await res.json()
                if (data.success) {
                    showToast(`${type === 'TASK' ? 'Tarea' : 'Reunión'} agendada`, 'success')
                    onSuccess()
                    onClose()
                }
            }
        } catch (error) {
            console.error('Error saving:', error)
            showToast('Error al guardar', 'error')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen) return null

    const users = Object.entries(USER_MAP)
        .filter(([email]) => !email.includes('demo@'))
        .map(([email, info]) => ({ email, ...info }))

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }} onClick={onClose}>
            <div style={{
                background: 'var(--surface-raised)',
                borderRadius: 'var(--radius-lg)',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                border: '1px solid var(--border)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                position: 'relative'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'var(--surface)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 20
                }}>
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <button
                            onClick={() => setType('NOTE')}
                            style={{
                                background: 'transparent', border: 'none', color: type === 'NOTE' ? 'var(--accent)' : 'var(--text-dim)',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: type === 'NOTE' ? 700 : 500,
                                fontSize: '14px', transition: 'all 0.2s', position: 'relative', padding: '4px 0'
                            }}
                        >
                            <MessageSquare size={18} /> NOTA
                            {type === 'NOTE' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--accent)' }} />}
                        </button>
                        <button
                            onClick={() => setType('TASK')}
                            style={{
                                background: 'transparent', border: 'none', color: type === 'TASK' ? 'var(--accent)' : 'var(--text-dim)',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: type === 'TASK' ? 700 : 500,
                                fontSize: '14px', transition: 'all 0.2s', position: 'relative', padding: '4px 0'
                            }}
                        >
                            <CheckSquare size={18} /> TAREA
                            {type === 'TASK' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--accent)' }} />}
                        </button>
                        <button
                            onClick={() => setType('MEETING')}
                            style={{
                                background: 'transparent', border: 'none', color: type === 'MEETING' ? 'var(--accent)' : 'var(--text-dim)',
                                display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: type === 'MEETING' ? 700 : 500,
                                fontSize: '14px', transition: 'all 0.2s', position: 'relative', padding: '4px 0'
                            }}
                        >
                            <Calendar size={18} /> REUNIÓN
                            {type === 'MEETING' && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '2px', background: 'var(--accent)' }} />}
                        </button>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Main Description / Content */}
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>
                            {type === 'NOTE' ? 'CONTENIDO DE LA NOTA' : 'TÍTULO / DESCRIPCIÓN'}
                        </label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            placeholder={type === 'NOTE' ? "Escribe una novedad importante..." : "Ej: Revisar booking con Rafa..."}
                            style={{
                                width: '100%', minHeight: '100px', background: 'var(--bg)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius-md)', padding: '16px', color: 'white', fontSize: '14px', resize: 'none',
                                outline: 'none'
                            }}
                            autoFocus
                        />
                    </div>

                    {/* Conditional Fields based on Type */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        {(type === 'TASK' || type === 'MEETING') && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>FECHA</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                />
                            </div>
                        )}
                        {type === 'MEETING' && (
                            <div>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>HORA</label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={e => setTime(e.target.value)}
                                    style={{ width: '100%', padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'white' }}
                                />
                            </div>
                        )}
                        {type === 'NOTE' && (
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>TIPO DE NOTA</label>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {(['info', 'alert', 'success', 'warning'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setNoteType(t)}
                                            style={{
                                                flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                                                background: noteType === t ? 'var(--surface-raised)' : 'transparent',
                                                color: noteType === t ? (t === 'alert' ? 'var(--red)' : t === 'success' ? 'var(--green)' : t === 'warning' ? 'var(--amber)' : 'var(--accent)') : 'var(--text-dim)',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                fontSize: '12px', fontWeight: 600, transition: 'all 0.2s'
                                            }}
                                        >
                                            {t === 'alert' ? <AlertCircle size={14} /> : t === 'success' ? <CheckCircle2 size={14} /> : t === 'warning' ? <AlertCircle size={14} /> : <Info size={14} />}
                                            {t.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Target/Assignees Selection */}
                    <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                            {type === 'NOTE' ? 'VISIBILIDAD (DESTINATARIOS)' : 'ASIGNAR A...'}
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                            {users.map(u => {
                                const isSelected = type === 'NOTE' ? activeFor.includes(u.email) : assignedTo.includes(u.name)
                                return (
                                    <button
                                        key={u.email}
                                        onClick={() => {
                                            if (type === 'NOTE') {
                                                if (isSelected) setActiveFor(activeFor.filter(e => e !== u.email))
                                                else setActiveFor([...activeFor, u.email])
                                            } else {
                                                if (isSelected) setAssignedTo(assignedTo.filter(n => n !== u.name))
                                                else setAssignedTo([...assignedTo, u.name])
                                            }
                                        }}
                                        style={{
                                            padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border)', fontSize: '12px',
                                            background: isSelected ? 'var(--accent-soft)' : 'var(--bg)',
                                            color: isSelected ? 'var(--accent)' : 'var(--text-dim)',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s',
                                            fontWeight: 600
                                        }}
                                    >
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.color || 'var(--accent)' }} />
                                        {u.name}
                                    </button>
                                )
                            })}
                            <button
                                onClick={() => {
                                    if (type === 'NOTE') {
                                        if (activeFor.length === users.length) setActiveFor([])
                                        else setActiveFor(users.map(u => u.email))
                                    } else {
                                        if (assignedTo.length === users.length) setAssignedTo([])
                                        else setAssignedTo(users.map(u => u.name))
                                    }
                                }}
                                style={{ fontSize: '11px', color: 'var(--accent)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 8px', fontWeight: 700 }}
                            >
                                {(type === 'NOTE' ? activeFor.length : assignedTo.length) === users.length ? 'Ninguno' : 'Todos'}
                            </button>
                        </div>
                    </div>

                    {/* Linking Entities */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Search size={14} color="var(--accent)" />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.05em' }}>VINCULAR CON...</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>OPERACIÓN</label>
                                <SearchableSelect
                                    options={ops.map(o => ({
                                        id: o.id!,
                                        label: `${o.id} | ${o.cliente} | ${o.puertoDestino || 'Sin Destino'}`
                                    }))}
                                    value={opId}
                                    onChange={setOpId}
                                    placeholder="Buscar OP..."
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>PRODUCTO</label>
                                <SearchableSelect
                                    options={products.map(p => ({
                                        id: p.id,
                                        label: `${p.id} | ${p.descripcion || p.especie || 'Sin descripción'}`
                                    }))}
                                    value={productId}
                                    onChange={setProductId}
                                    placeholder="Buscar Prod..."
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '10px', color: 'var(--text-dim)', display: 'block', marginBottom: '4px' }}>CONTACTO</label>
                                <SearchableSelect
                                    options={contacts.map(c => ({ id: c.id, label: `${c.id} | ${c.empresa}` }))}
                                    value={contactId}
                                    onChange={setContactId}
                                    placeholder="Buscar Cont..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    background: 'var(--surface)',
                    position: 'sticky',
                    bottom: 0,
                    zIndex: 10
                }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '10px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        style={{
                            padding: '10px 24px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--accent)', color: 'white',
                            cursor: (saving || !content.trim()) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: '8px', opacity: (saving || !content.trim()) ? 0.6 : 1,
                            boxShadow: '0 4px 15px var(--accent-soft)'
                        }}
                    >
                        {saving ? <RefreshCw size={18} className="animate-spin" /> : 'Guardar'}
                    </button>
                </div>
            </div>
        </div>
    )
}
