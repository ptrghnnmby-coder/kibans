'use client'

import { X, ExternalLink, Download, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface DocViewerModalProps {
    isOpen: boolean
    onClose: () => void
    docId: string
    title: string
}

export default function DocViewerModal({ isOpen, onClose, docId, title }: DocViewerModalProps) {
    const [loading, setLoading] = useState(true)

    if (!isOpen) return null

    // Google Docs preview URL
    const previewUrl = `https://docs.google.com/document/d/${docId}/preview`
    const editUrl = `https://docs.google.com/document/d/${docId}/edit`

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                width: '95%',
                height: '92%',
                maxWidth: '1200px',
                background: 'var(--surface)',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            background: 'var(--cyan-soft)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--cyan)'
                        }}>
                            <EyeIcon size={18} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'white' }}>{title}</h3>
                            <p style={{ fontSize: '11px', color: 'var(--text-dim)', margin: 0 }}>Vista Previa de Documento</p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <a
                            href={editUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '13px' }}
                        >
                            <ExternalLink size={14} style={{ marginRight: '6px' }} /> Abrir Original
                        </a>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ flex: 1, position: 'relative', background: '#e4e7eb' }}>
                    {loading && (
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            background: 'var(--surface)'
                        }}>
                            <Loader2 className="animate-spin text-cyan" size={40} />
                            <p style={{ marginTop: '16px', color: 'var(--text-muted)' }}>Cargando visor...</p>
                        </div>
                    )}
                    <iframe
                        src={previewUrl}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        onLoad={() => setLoading(false)}
                        title={title}
                    />
                </div>
            </div>
        </div>
    )
}

function EyeIcon({ size }: { size: number }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}
