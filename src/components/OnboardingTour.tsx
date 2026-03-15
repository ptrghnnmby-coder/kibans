'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, ChevronLeft, Play } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface TourStep {
    targetId: string
    title: { es: string; en: string }
    description: { es: string; en: string }
    emoji: string
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'nav-dashboard',
        emoji: '🏠',
        title: { es: 'Panel de Control', en: 'Dashboard' },
        description: {
            es: 'Desde acá tenés una vista completa de toda tu operación: cargas en tránsito, agenda del día y novedades del equipo. Tu centro de comando.',
            en: 'From here you get a complete view of your entire operation: shipments in transit, daily agenda, and team updates. Your command center.'
        }
    },
    {
        targetId: 'nav-chat smt',
        emoji: '💬',
        title: { es: 'Chat con Tess', en: 'Chat with Tess' },
        description: {
            es: 'Desde acá hablás directamente con Tess, tu asistente de IA. Generá documentos, consultá datos y cargá proveedores con lenguaje natural.',
            en: 'From here you talk directly to Tess, your AI assistant. Generate documents, query data and add suppliers using natural language.'
        }
    },
    {
        targetId: 'nav-operaciones',
        emoji: '🚢',
        title: { es: 'Operaciones', en: 'Operations' },
        description: {
            es: 'Desde acá gestionás todas tus importaciones y exportaciones. Documentos, estados, responsables y tránsitos — todo en una sola carpeta organizada.',
            en: 'From here you manage all your imports and exports. Documents, statuses, handlers and shipments — all in one organized file.'
        }
    },
    {
        targetId: 'nav-tracking',
        emoji: '📡',
        title: { es: 'Tracking en Tiempo Real', en: 'Real-Time Tracking' },
        description: {
            es: 'Desde acá verás el seguimiento en vivo de todos tus contenedores. Tess actualiza el estado automáticamente y te avisa ante cualquier cambio.',
            en: 'From here you\'ll see live tracking of all your containers. Tess updates the status automatically and alerts you to any changes.'
        }
    },
    {
        targetId: 'nav-central documental',
        emoji: '📄',
        title: { es: 'Central Documental', en: 'Document Center' },
        description: {
            es: 'Desde acá generás proformas, órdenes de compra y facturas en segundos. Tess los crea automáticamente con los datos de cada operación, sin errores.',
            en: 'From here you generate proformas, purchase orders and invoices in seconds. Tess creates them automatically from operation data, error-free.'
        }
    },
    {
        targetId: 'nav-finanzas',
        emoji: '💰',
        title: { es: 'Finanzas', en: 'Finance' },
        description: {
            es: 'Desde acá verás las finanzas de tu empresa en tiempo real: flujo de caja, cuentas por cobrar y pagar, y márgenes. Todo calculado automáticamente.',
            en: 'From here you\'ll see your company\'s finances in real time: cash flow, accounts receivable and payable, and margins. All calculated automatically.'
        }
    },
    {
        targetId: 'nav-metricas',
        emoji: '📊',
        title: { es: 'Métricas', en: 'Analytics' },
        description: {
            es: 'Desde acá analizás el rendimiento de tu negocio: KPIs clave, tendencias, volúmenes históricos y márgenes por operación. Decisiones con datos reales.',
            en: 'From here you analyze your business performance: key KPIs, trends, historical volumes and per-operation margins. Decisions backed by real data.'
        }
    },
    {
        targetId: 'nav-contactos',
        emoji: '👥',
        title: { es: 'Contactos', en: 'Contacts' },
        description: {
            es: 'Desde acá accedés a tu base de datos centralizada: clientes, proveedores, despachantes y agentes. Tess los vincula automáticamente a tus operaciones.',
            en: 'From here you access your centralized database: clients, suppliers, dispatchers and agents. Tess automatically links them to your operations.'
        }
    },
    {
        targetId: 'nav-productos',
        emoji: '📦',
        title: { es: 'Catálogo de Productos', en: 'Product Catalog' },
        description: {
            es: 'Desde acá gestionás tu catálogo de productos para usar en cotizaciones y proformas. Especies, calibres, packing y precios históricos a un click.',
            en: 'From here you manage your product catalog to use in quotes and proformas. Species, sizes, packing and historical prices at a click.'
        }
    },
    {
        targetId: 'nav-leads',
        emoji: '🎯',
        title: { es: 'CRM · Leads', en: 'CRM · Leads' },
        description: {
            es: 'Desde acá seguís cada oportunidad comercial de principio a fin. Pipeline visual, estados y notas para que tu equipo de ventas trabaje coordinado.',
            en: 'From here you track every business opportunity from start to finish. Visual pipeline, statuses and notes to keep your sales team coordinated.'
        }
    }
]

export function OnboardingTour() {
    const { data: session } = useSession()
    const [lang, setLang] = useState<'es' | 'en'>('es')
    const [currentStep, setCurrentStep] = useState(-1)
    const [visible, setVisible] = useState(false)
    const [showButton, setShowButton] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })
    const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({})

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get('lang') === 'en') {
            setLang('en')
        } else if ((session?.user as any)?.isDemo) {
            const browserLang = navigator.language?.toLowerCase() || ''
            if (browserLang.startsWith('en')) setLang('en')
        }
    }, [session])

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('tess_tour_v3_completed')
        if (!hasSeenTour) {
            setTimeout(() => { setVisible(true); setCurrentStep(0) }, 1800)
        } else {
            setTimeout(() => setShowButton(true), 500)
        }
    }, [])

    const computeCoords = useCallback(() => {
        if (currentStep < 0 || currentStep >= TOUR_STEPS.length) return
        const step = TOUR_STEPS[currentStep]
        const el = document.getElementById(step.targetId)
        if (!el) return

        const rect = el.getBoundingClientRect()
        const c = { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
        setCoords(c)

        const tooltipW = 300
        const tooltipH = 200
        const margin = 20

        let tLeft = c.left + c.width + margin
        let tTop = c.top + c.height / 2 - tooltipH / 2
        tTop = Math.max(16, Math.min(tTop, window.innerHeight - tooltipH - 16))

        setTooltipPos({ top: tTop, left: tLeft })

        const arrowCenter = c.top + c.height / 2
        const arrowLocal = arrowCenter - tTop
        setArrowStyle({
            position: 'absolute',
            left: '-9px',
            top: `${Math.max(16, Math.min(arrowLocal - 8, tooltipH - 32))}px`,
            width: 0,
            height: 0,
            borderTop: '9px solid transparent',
            borderBottom: '9px solid transparent',
            borderRight: '9px solid rgba(220,166,75,0.4)',
        })
    }, [currentStep])

    // Recompute on step change — use rAF so DOM has settled
    useEffect(() => {
        const raf = requestAnimationFrame(computeCoords)
        return () => cancelAnimationFrame(raf)
    }, [computeCoords])

    // Recompute on resize OR any scroll (main content scroll shifts nothing in sidebar, but keeps ring accurate)
    useEffect(() => {
        window.addEventListener('resize', computeCoords)
        window.addEventListener('scroll', computeCoords, true) // capture phase catches nested scrolls too
        return () => {
            window.removeEventListener('resize', computeCoords)
            window.removeEventListener('scroll', computeCoords, true)
        }
    }, [computeCoords])

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) setCurrentStep(p => p + 1)
        else handleComplete()
    }
    const handleBack = () => { if (currentStep > 0) setCurrentStep(p => p - 1) }
    const handleComplete = () => {
        setVisible(false); setShowButton(true)
        localStorage.setItem('tess_tour_v3_completed', 'true')
    }
    const handleRestart = () => { setShowButton(false); setCurrentStep(0); setVisible(true) }

    const step = currentStep >= 0 && currentStep < TOUR_STEPS.length ? TOUR_STEPS[currentStep] : null
    const t = (obj: { es: string; en: string }) => obj[lang]
    const progress = step ? ((currentStep + 1) / TOUR_STEPS.length) * 100 : 0
    const pad = 5

    return (
        <>
            {/* Floating restart button */}
            {showButton && !visible && (
                <button
                    onClick={handleRestart}
                    title={lang === 'en' ? 'Restart tour' : 'Ver tour de funciones'}
                    style={{
                        position: 'fixed', bottom: '24px', right: '80px', zIndex: 9998,
                        width: '44px', height: '44px', borderRadius: '50%',
                        background: 'var(--accent)', border: 'none', color: '#000',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 16px rgba(220,166,75,0.4)', transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.12)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
                >
                    <Play size={16} fill="#000" />
                </button>
            )}

            {visible && step && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
                    {/* SVG overlay with cutout */}
                    <svg
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'auto' }}
                        onClick={handleComplete}
                    >
                        <defs>
                            <mask id="tour-mask">
                                <rect width="100%" height="100%" fill="white" />
                                <rect
                                    x={coords.left - pad} y={coords.top - pad}
                                    width={coords.width + pad * 2} height={coords.height + pad * 2}
                                    rx="8" fill="black"
                                />
                            </mask>
                        </defs>
                        <rect width="100%" height="100%" fill="rgba(0,0,0,0.68)" mask="url(#tour-mask)" />
                    </svg>

                    {/* Highlight ring — Gmail-style gold border */}
                    <div style={{
                        position: 'absolute',
                        top: coords.top - pad, left: coords.left - pad,
                        width: coords.width + pad * 2, height: coords.height + pad * 2,
                        borderRadius: '8px',
                        boxShadow: '0 0 0 2px #dca64b, 0 0 0 5px rgba(220,166,75,0.25)',
                        pointerEvents: 'none', zIndex: 2,
                        animation: 'pulse-ring 2.4s ease-in-out infinite'
                    }} />

                    {/* Tooltip card — Gmail style */}
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            position: 'fixed',
                            top: tooltipPos.top,
                            left: tooltipPos.left,
                            width: '300px',
                            background: '#0d1e38',
                            border: '1px solid rgba(220,166,75,0.35)',
                            borderRadius: '14px',
                            padding: '20px 20px 16px',
                            color: '#fff',
                            pointerEvents: 'auto',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
                            animation: 'tourFadeIn 0.25s ease',
                            zIndex: 10
                        }}
                    >
                        {/* Arrow pointer ← */}
                        <div style={arrowStyle} />

                        {/* Top row: emoji + title + close */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                            <span style={{ fontSize: '22px', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>{step.emoji}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: '#dca64b', fontWeight: 600, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                                    {currentStep + 1} / {TOUR_STEPS.length}
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', lineHeight: 1.2, marginTop: '2px' }}>
                                    {t(step.title)}
                                </div>
                            </div>
                            <button onClick={handleComplete} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>
                                <X size={15} />
                            </button>
                        </div>

                        {/* Description */}
                        <p style={{ margin: '0 0 14px 0', fontSize: '13px', lineHeight: '1.65', color: 'rgba(255,255,255,0.78)' }}>
                            {t(step.description)}
                        </p>

                        {/* Progress bar */}
                        <div style={{ height: '2px', background: 'rgba(255,255,255,0.1)', borderRadius: '1px', marginBottom: '14px' }}>
                            <div style={{ height: '100%', width: `${progress}%`, background: '#dca64b', borderRadius: '1px', transition: 'width 0.35s ease' }} />
                        </div>

                        {/* Nav row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Dot nav */}
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                {TOUR_STEPS.map((_, i) => (
                                    <div key={i} onClick={() => setCurrentStep(i)} style={{
                                        width: i === currentStep ? '14px' : '5px', height: '5px',
                                        borderRadius: '3px', cursor: 'pointer', transition: 'all 0.3s',
                                        background: i === currentStep ? '#dca64b' : 'rgba(255,255,255,0.2)'
                                    }} />
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                                {currentStep > 0 && (
                                    <button onClick={handleBack} style={{
                                        background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: 'rgba(255,255,255,0.65)', padding: '6px 12px', borderRadius: '8px',
                                        cursor: 'pointer', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
                                        display: 'flex', alignItems: 'center', gap: '3px'
                                    }}>
                                        <ChevronLeft size={13} />
                                        {lang === 'en' ? 'Back' : 'Atrás'}
                                    </button>
                                )}
                                <button onClick={handleNext} style={{
                                    background: '#dca64b', border: 'none', color: '#000',
                                    padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                                    display: 'flex', alignItems: 'center', gap: '3px',
                                    boxShadow: '0 2px 8px rgba(220,166,75,0.35)'
                                }}>
                                    {currentStep === TOUR_STEPS.length - 1
                                        ? (lang === 'en' ? '🚀 Let\'s go!' : '🚀 ¡Empezar!')
                                        : <>{lang === 'en' ? 'Next' : 'Siguiente'}<ChevronRight size={13} /></>
                                    }
                                </button>
                            </div>
                        </div>

                        {/* Skip */}
                        <div style={{ textAlign: 'center', marginTop: '10px' }}>
                            <button onClick={handleComplete} style={{
                                background: 'none', border: 'none', color: 'rgba(255,255,255,0.28)',
                                fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit'
                            }}>
                                {lang === 'en' ? 'Skip tour' : 'Saltar tour'}
                            </button>
                        </div>
                    </div>

                    <style>{`
                        @keyframes tourFadeIn {
                            from { opacity: 0; transform: translateX(-6px); }
                            to   { opacity: 1; transform: translateX(0); }
                        }
                        @keyframes pulse-ring {
                            0%, 100% { box-shadow: 0 0 0 2px #dca64b, 0 0 0 5px rgba(220,166,75,0.20); }
                            50%      { box-shadow: 0 0 0 2px #dca64b, 0 0 0 7px rgba(220,166,75,0.35); }
                        }
                    `}</style>
                </div>
            )}
        </>
    )
}
