'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles, X } from 'lucide-react'

interface AIFeatureBadgeProps {
    title: string
    description: string
    position?: 'top' | 'bottom' | 'right' | 'left'
    size?: 'sm' | 'md'
}

export function AIFeatureBadge({ title, description, position = 'top', size = 'sm' }: AIFeatureBadgeProps) {
    const [open, setOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const positionStyles: Record<string, React.CSSProperties> = {
        top: { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
        bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
        right: { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
        left: { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
    }

    return (
        <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
                title="Función con IA"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: size === 'sm' ? '2px 7px' : '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(220,166,75,0.4)',
                    background: 'rgba(220,166,75,0.08)',
                    color: '#dca64b',
                    fontSize: size === 'sm' ? '10px' : '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.3px',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(220,166,75,0.15)'
                    setOpen(true)
                }}
            >
                <Sparkles size={size === 'sm' ? 9 : 11} fill="#dca64b" />
                IA
            </button>

            {open && (
                <>
                    {/* Backdrop for mobile */}
                    {isMobile && (
                        <div
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(2px)',
                                zIndex: 9998,
                            }}
                            onClick={() => setOpen(false)}
                        />
                    )}

                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: isMobile ? 'fixed' : 'absolute',
                            ...(isMobile ? {
                                bottom: '20px',
                                left: '16px',
                                right: '16px',
                                width: 'calc(100% - 32px)',
                                transform: 'none',
                            } : positionStyles[position]),
                            background: '#0d1e38',
                            border: '1px solid rgba(220,166,75,0.35)',
                            borderRadius: '16px',
                            padding: '18px 20px',
                            color: '#fff',
                            zIndex: 9999,
                            boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                            animation: isMobile ? 'aiBadgeSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'aiBadgeFadeIn 0.2s ease',
                        }}
                    >
                        <button
                            onClick={() => setOpen(false)}
                            style={{ position: 'absolute', top: '12px', right: '14px', background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 8 }}
                        >
                            <X size={16} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <Sparkles size={14} fill="#dca64b" color="#dca64b" />
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#dca64b', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                                {title}
                            </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.7', color: 'rgba(255,255,255,0.85)' }}>
                            {description}
                        </p>
                        <style>{`
                            @keyframes aiBadgeFadeIn {
                                from { opacity: 0; transform: ${position === 'top' ? 'translateX(-50%) translateY(4px)' : position === 'bottom' ? 'translateX(-50%) translateY(-4px)' : 'translateY(-50%) translateX(-4px)'}; }
                                to   { opacity: 1; transform: ${position === 'top' ? 'translateX(-50%) translateY(0)' : position === 'bottom' ? 'translateX(-50%) translateY(0)' : 'translateY(-50%) translateX(0)'}; }
                            }
                            @keyframes aiBadgeSlideUp {
                                from { opacity: 0; transform: translateY(20px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }
                        `}</style>
                    </div>
                </>
            )}
        </div>
    )
}
