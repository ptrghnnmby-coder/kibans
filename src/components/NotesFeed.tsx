'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, ArrowRight } from 'lucide-react'
import { USER_MAP } from '@/lib/sheets-types'
import Link from 'next/link'

interface Note {
    id: string
    operationId: string
    content: string
    createdBy: string
    createdAt: string
}

export function NotesFeed() {
    const [notes, setNotes] = useState<Note[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchNotes = async () => {
            try {
                const res = await fetch('/api/operaciones/notes') // No opId = User Feed
                if (res.ok) {
                    const data = await res.json()
                    setNotes(data)
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchNotes()
    }, [])

    const getUserName = (email: string) => {
        return USER_MAP[email]?.name || email.split('@')[0]
    }

    const formatTime = (iso: string) => {
        // Relative time? Or standard
        const date = new Date(iso)
        return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    }

    if (loading) return <div className="card" style={{ height: '300px' }}>Cargando actividad...</div>

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <div className="card-title">
                    <MessageSquare size={18} className="text-secondary" />
                    <span>Última Actividad</span>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {notes.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>No hay actividad reciente.</div>
                ) : (
                    notes.map(note => (
                        <Link href={`/operaciones/${note.operationId}`} key={note.id} style={{ textDecoration: 'none' }}>
                            <div className="card clickable" style={{ padding: 'var(--space-3)', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>Op. {note.operationId}</span>
                                    <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{formatTime(note.createdAt)}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '4px' }}>
                                    {note.content.length > 80 ? note.content.substring(0, 80) + '...' : note.content}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    Por {getUserName(note.createdBy)}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    )
}
