'use client'

import { useState, useEffect } from 'react'
import { Eye, ChevronDown, User, X } from 'lucide-react'
import { USER_MAP } from '@/lib/sheets-types'

interface AdminBridgeProps {
    isAdmin: boolean;
}

export function AdminBridge({ isAdmin }: AdminBridgeProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null)

    useEffect(() => {
        const saved = localStorage.getItem('smt_impersonated_user')
        if (saved) setImpersonatedEmail(saved)
    }, [])

    if (!isAdmin) return null

    const handleImpersonate = (email: string | null) => {
        if (email) {
            localStorage.setItem('smt_impersonated_user', email)
        } else {
            localStorage.removeItem('smt_impersonated_user')
        }
        setImpersonatedEmail(email)
        setIsOpen(false)
        // Emit event for other components to refresh
        window.dispatchEvent(new CustomEvent('smt-impersonation-changed', { detail: { email } }))
    }

    const impersonatedUser = impersonatedEmail ? USER_MAP[impersonatedEmail] : null

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    borderRadius: '10px',
                    background: impersonatedEmail ? 'var(--cyan-soft)' : 'var(--surface)',
                    border: `1px solid ${impersonatedEmail ? 'var(--cyan)' : 'var(--border)'}`,
                    color: impersonatedEmail ? 'var(--cyan)' : 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                }}
                className="hover:border-cyan hover:text-cyan"
                title="Modo Espejo (Ver como...)"
            >
                <Eye size={14} />
                {impersonatedUser ? `Viendo como ${impersonatedUser.name}` : 'Ver como...'}
                <ChevronDown size={14} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 10px)',
                    left: 0,
                    width: '200px',
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    animation: 'fadeInUp 0.2s ease-out'
                }}>
                    <div style={{ padding: '4px 8px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px' }}>
                        Seleccionar Usuario
                    </div>

                    <button
                        onClick={() => handleImpersonate(null)}
                        style={{
                            padding: '8px 10px',
                            textAlign: 'left',
                            borderRadius: '6px',
                            background: !impersonatedEmail ? 'var(--accent-soft)' : 'transparent',
                            color: !impersonatedEmail ? 'var(--accent)' : 'var(--text-muted)',
                            border: 'none',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                        className="hover:bg-surface-hover"
                    >
                        <User size={14} /> Mi perfil (Normal)
                    </button>

                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }} />

                    {Object.entries(USER_MAP)
                        .filter(([email]) =>
                            email !== 'info@southmarinetrading.com' &&
                            email !== 'demo@southmarinetrading.com'
                        )
                        .map(([email, user]) => (
                            <button
                                key={email}
                                onClick={() => handleImpersonate(email)}
                                style={{
                                    padding: '8px 10px',
                                    textAlign: 'left',
                                    borderRadius: '6px',
                                    background: impersonatedEmail === email ? 'var(--cyan-soft)' : 'transparent',
                                    color: impersonatedEmail === email ? 'var(--cyan)' : 'var(--text-muted)',
                                    border: 'none',
                                    fontSize: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    cursor: 'pointer'
                                }}
                                className="hover:bg-surface-hover"
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: user.color || 'var(--accent)',
                                    color: 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '10px',
                                    fontWeight: 800
                                }}>
                                    {user.initial}
                                </div>
                                {user.name}
                            </button>
                        ))}
                </div>
            )}

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
