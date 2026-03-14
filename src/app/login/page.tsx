'use client'
import { signIn } from 'next-auth/react'

export default function LoginPage() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100svh',
            background: 'var(--bg)',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '360px',
                padding: '40px 32px',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-xl)',
                border: '1px solid var(--border)',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04)',
                backdropFilter: 'blur(20px)',
            }}>
                {/* Subtle top accent line */}
                <div style={{
                    height: '2px',
                    background: 'var(--accent)',
                    borderRadius: '2px',
                    marginBottom: '32px',
                    opacity: 0.8,
                }} />

                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text)' }}>Tess</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Powered by Kibans</p>
                </div>

                <button
                    type="button"
                    onClick={() => signIn('demo', { callbackUrl: '/' })}
                    style={{
                        width: '100%',
                        padding: '14px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '12px',
                        background: 'var(--accent)',
                        color: '#000',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'inherit',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 8px 16px rgba(220, 166, 75, 0.2)',
                    }}
                    onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
                        (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
                    </svg>
                    Ingresar a la Demo
                </button>
            </div>
        </div>
    )
}
