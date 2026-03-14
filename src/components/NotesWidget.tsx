'use client'

import { useState, useEffect } from 'react'
import { Send, AlertCircle, Info, CheckCircle2, X, ExternalLink, MessageSquare, RefreshCw, Plus, Package, User, Pencil, Check } from 'lucide-react'
import Link from 'next/link'
import { Note, USER_MAP, Producto, Contacto } from '@/lib/sheets-types'
import { UnifiedCreationModal } from './UnifiedCreationModal'


// Fallback if specific UI components don't exist
const SimpleCard = ({ children, className }: any) => (
    <div className={`card ${className}`} style={{
        background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
        {children}
    </div>
)

const SimpleButton = ({ children, onClick, className, disabled, variant = 'primary' }: any) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`btn ${variant === 'primary' ? 'btn-primary' : ''}`}
        style={{
            padding: variant === 'ghost' ? '4px' : '8px 12px',
            background: variant === 'ghost' ? 'transparent' : 'var(--accent)',
            color: variant === 'ghost' ? 'var(--text-muted)' : 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.5 : 1
        }}
    >
        {children}
    </button>
)

// Note type is now imported from sheets-types

export function NotesWidget({
    userEmail,
    userName,
    initialNotes,
    initialProducts,
    initialContacts
}: {
    userEmail?: string,
    userName?: string,
    initialNotes?: Note[],
    initialProducts?: Producto[],
    initialContacts?: Contacto[]
}) {
    const [notes, setNotes] = useState<Note[]>(initialNotes || [])
    const [loading, setLoading] = useState(!initialNotes)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalInitialType, setModalInitialType] = useState<'NOTE' | 'TASK' | 'MEETING'>('NOTE')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)

    // Data for lookups (to show labels instead of IDs)
    const [products, setProducts] = useState<Producto[]>(initialProducts || [])
    const [contacts, setContacts] = useState<Contacto[]>(initialContacts || [])

    const fetchNotes = async () => {
        try {
            const res = await fetch('/api/dashboard/notes')
            const data = await res.json()
            if (data.success) setNotes(data.data)
        } catch (error) {
            console.error('Error fetching notes:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchLookups = async () => {
        try {
            const [pRes, cRes] = await Promise.all([
                fetch('/api/productos'),
                fetch('/api/contactos')
            ])
            const [pData, cData] = await Promise.all([pRes.json(), cRes.json()])
            if (pData.success) setProducts(pData.data)
            if (cData.success) setContacts(cData.data)
        } catch (e) {
            console.error('Error fetching lookups:', e)
        }
    }

    useEffect(() => {
        if (!initialNotes) fetchNotes()
        if (!initialProducts || !initialContacts) fetchLookups()
    }, [initialNotes, initialProducts, initialContacts])

    const handleOpenModal = (type: 'NOTE' | 'TASK' | 'MEETING') => {
        setModalInitialType(type)
        setIsModalOpen(true)
    }

    const handleDeleteNote = async (id: string) => {
        // Optimistic: remove from local state immediately (for this user's view)
        setNotes(prev => prev.filter(n => n.id !== id))
        try {
            // Per-user dismiss: removes X from this user's column only.
            // If no recipients remain, dismissNoteForUser will delete the row automatically.
            const emailParam = userEmail ? `&email=${encodeURIComponent(userEmail)}` : ''
            await fetch(`/api/dashboard/notes?id=${encodeURIComponent(id)}${emailParam}`, { method: 'DELETE' })
        } catch (error) {
            console.error('Error dismissing note:', error)
            fetchNotes() // Re-fetch to restore if failed
        }
    }


    const handleStartEdit = (note: Note) => {
        setEditingId(note.id)
        setEditContent(note.content)
    }

    const handleSaveEdit = async (id: string) => {
        if (!editContent.trim()) return
        setSavingEdit(true)
        try {
            await fetch('/api/dashboard/notes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, content: editContent.trim() })
            })
            setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent.trim() } : n))
            setEditingId(null)
        } catch (error) {
            console.error('Error updating note:', error)
        } finally {
            setSavingEdit(false)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'alert': return <AlertCircle size={16} color="var(--red)" />
            case 'success': return <CheckCircle2 size={16} color="var(--green)" />
            case 'warning': return <AlertCircle size={16} color="var(--amber)" />
            default: return <Info size={16} color="var(--accent)" />
        }
    }

    return (
        <SimpleCard className="h-full">
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--surface-raised)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MessageSquare size={18} color="var(--accent)" />
                    <h2 style={{ fontSize: '12px', fontWeight: 500, margin: 0, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>NOVEDADES Y AVISOS</h2>
                </div>

                <button
                    onClick={() => handleOpenModal('NOTE')}
                    style={{
                        background: 'var(--accent)',
                        border: 'none',
                        color: 'white',
                        borderRadius: 'var(--radius-md)',
                        padding: '6px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 700,
                        boxShadow: '0 4px 10px var(--accent-soft)'
                    }}
                >
                    <Plus size={16} /> NUEVA
                </button>
            </div>


            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--border) transparent'
            }}>
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Cargando novedades...</p>
                    </div>
                ) : notes.filter(n => {
                    const emailToUse = userEmail?.toLowerCase() || ''
                    return n.activeFor?.includes(emailToUse)
                }).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                        <Info size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                        <p style={{ fontSize: '13px' }}>No hay novedades recientes.</p>
                    </div>
                ) : (
                    notes.filter(n => {
                        const emailToUse = userEmail?.toLowerCase() || ''
                        return n.activeFor?.includes(emailToUse)
                    }).map(note => {
                        const isOwner = note.author?.toLowerCase() === userName?.toLowerCase() ||
                            note.author?.toLowerCase() === userEmail?.toLowerCase()
                        const isEditing = editingId === note.id
                        return (
                            <div key={note.id} style={{
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-md)',
                                background: 'linear-gradient(145deg, var(--surface-raised), var(--surface))',
                                border: '1px solid var(--border)',
                                borderLeft: `3px solid ${note.type === 'alert' ? 'var(--red)' : note.type === 'success' ? 'var(--green)' : note.type === 'warning' ? 'var(--amber)' : 'var(--accent)'}`,
                                position: 'relative',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                cursor: 'default'
                            }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)'
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)'
                                    e.currentTarget.style.boxShadow = 'none'
                                }}
                            >
                                {/* Action buttons */}
                                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
                                    {/* Edit: only for owner */}
                                    {isOwner && !isEditing && (
                                        <button
                                            onClick={() => handleStartEdit(note)}
                                            title="Editar nota"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                        >
                                            <Pencil size={12} />
                                        </button>
                                    )}
                                    {/* Delete for everyone */}
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        title="Eliminar para todos"
                                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center', transition: 'all 0.2s' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', paddingRight: '24px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {getTypeIcon(note.type)} {note.author}
                                        </span>
                                        {note.operationId && (
                                            <Link
                                                href={`/operaciones/${note.operationId}`}
                                                style={{
                                                    fontSize: '10px',
                                                    color: 'var(--accent)',
                                                    fontWeight: 600,
                                                    textDecoration: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                ID Carga: {note.operationId} <ExternalLink size={10} />
                                            </Link>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                            {new Date(note.timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' })} {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {note.productId && (
                                                <div style={{ fontSize: '10px', color: 'var(--green)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                    <Package size={10} /> {products.find(p => p.id === note.productId)?.especie || 'Producto'}
                                                </div>
                                            )}
                                            {note.contactId && (
                                                <div style={{ fontSize: '10px', color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                    <User size={10} /> {contacts.find(c => c.id === note.contactId)?.empresa || 'Contacto'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Content — editable for owner */}
                                {isEditing ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                                        <textarea
                                            value={editContent}
                                            onChange={e => setEditContent(e.target.value)}
                                            autoFocus
                                            rows={3}
                                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '8px', color: 'var(--text)', fontSize: '13px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
                                        />
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => setEditingId(null)} className="btn btn-secondary btn-small">Cancelar</button>
                                            <button onClick={() => handleSaveEdit(note.id)} disabled={savingEdit} className="btn btn-primary btn-small" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Check size={12} /> Guardar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p style={{ fontSize: '13px', margin: 0, lineHeight: '1.5', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                                        {note.content}
                                    </p>
                                )}
                            </div>
                        )
                    })
                )}
            </div>

            <UnifiedCreationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    fetchNotes()
                    setIsModalOpen(false)
                }}
                userEmail={userEmail || ''}
                userName={userName || ''}
                initialType={modalInitialType}
            />
        </SimpleCard >
    )
}

