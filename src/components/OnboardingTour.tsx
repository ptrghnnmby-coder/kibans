'use client'

import React, { useState, useEffect } from 'react'
import { X, ChevronRight, ChevronLeft, Info } from 'lucide-react'

interface TourStep {
    targetId: string
    title: string
    description: string
    position: 'top' | 'bottom' | 'left' | 'right'
}

const TOUR_STEPS: TourStep[] = [
    {
        targetId: 'nav-tracking',
        title: 'Tess Tracking',
        description: 'Aquí puedes ver el estado en tiempo real de todas tus operaciones y contenedores.',
        position: 'bottom'
    },
    {
        targetId: 'nav-operaciones',
        title: 'Operaciones',
        description: 'Gestiona tus carpetas, documentos y detalles logísticos de cada embarque.',
        position: 'bottom'
    },
    {
        targetId: 'nav-finanzas',
        title: 'Finanzas',
        description: 'Controla tu flujo de caja, proformas y pagos pendientes de forma automática.',
        position: 'bottom'
    },
    {
        targetId: 'nav-contactos',
        title: 'Contactos',
        description: 'Tu base de datos centralizada de proveedores, clientes y despachantes.',
        position: 'bottom'
    }
]

export function OnboardingTour() {
    const [currentStep, setCurrentStep] = useState(-1)
    const [visible, setVisible] = useState(false)
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 })

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('tess_tour_completed')
        if (!hasSeenTour) {
            setTimeout(() => {
                setVisible(true)
                setCurrentStep(0)
            }, 1500)
        }
    }, [])

    useEffect(() => {
        if (currentStep >= 0 && currentStep < TOUR_STEPS.length) {
            const step = TOUR_STEPS[currentStep]
            const element = document.getElementById(step.targetId)
            if (element) {
                const rect = element.getBoundingClientRect()
                setCoords({
                    top: rect.top + window.scrollY,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                    height: rect.height
                })
                element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
        }
    }, [currentStep])

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = () => {
        setVisible(false)
        localStorage.setItem('tess_tour_completed', 'true')
    }

    if (!visible || currentStep === -1) return null

    const step = TOUR_STEPS[currentStep]

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 9999,
            pointerEvents: 'none'
        }}>
            {/* Backdrop with hole */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                pointerEvents: 'auto',
                WebkitClipPath: `polygon(
                    0% 0%, 0% 100%, 
                    ${coords.left}px 100%, 
                    ${coords.left}px ${coords.top}px, 
                    ${coords.left + coords.width}px ${coords.top}px, 
                    ${coords.left + coords.width}px ${coords.top + coords.height}px, 
                    ${coords.left}px ${coords.top + coords.height}px, 
                    ${coords.left}px 100%, 
                    100% 100%, 100% 0%
                )`
            }} onClick={handleComplete} />

            {/* Tooltip (Speech Bubble) */}
            <div style={{
                position: 'absolute',
                top: coords.top + coords.height + 20,
                left: Math.max(20, coords.left + (coords.width / 2) - 150),
                width: '300px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '20px',
                padding: '24px',
                color: '#fff',
                pointerEvents: 'auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                animation: 'fadeInUp 0.4s cubic-bezier(0.23, 1, 0.32, 1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={18} color="#dca64b" />
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#dca64b' }}>{step.title}</h4>
                    </div>
                    <button onClick={handleComplete} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
                        <X size={18} />
                    </button>
                </div>
                
                <p style={{ margin: '0 0 20px 0', fontSize: '14px', lineHeight: '1.5', color: 'rgba(255,255,255,0.9)' }}>
                    {step.description}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                        Paso {currentStep + 1} de {TOUR_STEPS.length}
                    </span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentStep > 0 && (
                            <button onClick={handleBack} style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <ChevronLeft size={14} /> Atrás
                            </button>
                        )}
                        <button onClick={handleNext} style={{
                            background: '#dca64b',
                            border: 'none',
                            color: '#000',
                            padding: '6px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            {currentStep === TOUR_STEPS.length - 1 ? 'Finalizar' : 'Siguiente'} <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Arrow */}
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0,
                    height: 0,
                    borderLeft: '10px solid transparent',
                    borderRight: '10px solid transparent',
                    borderBottom: '10px solid rgba(255,255,255,0.1)'
                }} />
            </div>

            <style jsx global>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}
