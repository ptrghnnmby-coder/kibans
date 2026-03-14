'use client'

import React from 'react'
import { Ship, MapPin, Package, Anchor, CheckCircle2, Clock } from 'lucide-react'

interface TimelineStep {
    label: string
    sublabel?: string
    status: 'completed' | 'current' | 'pending'
    icon: React.ElementType
    date?: string
}

interface ShipTrackingTimelineProps {
    status: string
    etd?: string
    eta?: string
    pol?: string
    pod?: string
    currentLocation?: string
    vessel?: string
    lastUpdated?: string
}

const STATUS_MAP: Record<string, number> = {
    'EMPTY': 0,
    'LOADING': 1,
    'DEPARTED': 2,
    'IN_TRANSIT': 3,
    'ARRIVED': 4,
    'DELIVERED': 5
}

export function ShipTrackingTimeline({ 
    status, 
    etd, 
    eta, 
    pol, 
    pod, 
    currentLocation, 
    vessel,
    lastUpdated 
}: ShipTrackingTimelineProps) {
    
    const currentIdx = STATUS_MAP[status] ?? 1
    
    const steps: TimelineStep[] = [
        { 
            label: 'Pre-Carga', 
            sublabel: 'Booking Confirmado', 
            status: currentIdx > 0 ? 'completed' : (currentIdx === 0 ? 'current' : 'pending'),
            icon: Package 
        },
        { 
            label: 'Origen (POL)', 
            sublabel: pol || 'Puerto de Carga', 
            status: currentIdx > 1 ? 'completed' : (currentIdx === 1 ? 'current' : 'pending'),
            icon: Anchor,
            date: etd
        },
        { 
            label: 'Buque en Viaje', 
            sublabel: vessel || 'En Tránsito', 
            status: currentIdx > 2 ? 'completed' : (currentIdx === 2 ? 'current' : 'pending'),
            icon: Ship,
            date: currentLocation
        },
        { 
            label: 'Destino (POD)', 
            sublabel: pod || 'Puerto de Descarga', 
            status: currentIdx > 3 ? 'completed' : (currentIdx === 3 ? 'current' : 'pending'),
            icon: MapPin,
            date: eta
        },
        { 
            label: 'En Destino', 
            sublabel: 'Entrega final', 
            status: currentIdx >= 4 ? 'completed' : 'pending',
            icon: CheckCircle2 
        }
    ]

    return (
        <div style={{ 
            background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
            padding: '32px 24px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            color: '#fff'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                        width: '40px', 
                        height: '40px', 
                        borderRadius: '12px', 
                        background: 'rgba(220, 166, 75, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '1px solid rgba(220, 166, 75, 0.2)'
                    }}>
                        <Ship size={20} color="#dca64b" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Tess Tracking</h3>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>Actualizado: {lastUpdated || 'Hace instantes'}</p>
                    </div>
                </div>
                <div style={{ 
                    padding: '6px 12px', 
                    borderRadius: '20px', 
                    background: 'rgba(34, 197, 94, 0.1)', 
                    color: '#4ade80',
                    fontSize: '11px',
                    fontWeight: 700,
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                    {status === 'IN_TRANSIT' ? 'EN TRÁNSITO' : status}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 10px' }}>
                {/* Connectors */}
                <div style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    left: '40px', 
                    right: '40px', 
                    height: '2px', 
                    background: 'rgba(255,255,255,0.05)',
                    zIndex: 0
                }} />
                
                <div style={{ 
                    position: 'absolute', 
                    top: '20px', 
                    left: '40px', 
                    width: `${(currentIdx / (steps.length - 1)) * 85}%`, 
                    height: '2px', 
                    background: 'linear-gradient(90deg, #dca64b 0%, #e8bc6f 100%)',
                    zIndex: 0,
                    transition: 'width 1s ease-in-out',
                    boxShadow: '0 0 10px rgba(220, 166, 75, 0.3)'
                }} />

                {steps.map((step, idx) => {
                    const Icon = step.icon
                    const isActive = step.status === 'current'
                    const isCompleted = step.status === 'completed'

                    return (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            flex: 1, 
                            zIndex: 1,
                            minWidth: 0
                        }}>
                            <div style={{ 
                                width: '40px', 
                                height: '40px', 
                                borderRadius: '50%', 
                                background: isCompleted ? '#dca64b' : (isActive ? '#1e293b' : '#0f172a'),
                                border: `2px solid ${isCompleted || isActive ? '#dca64b' : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.3s ease',
                                boxShadow: isActive ? '0 0 20px rgba(220, 166, 75, 0.4)' : 'none'
                            }}>
                                <Icon size={18} color={isCompleted ? '#0f172a' : (isActive ? '#dca64b' : '#475569')} />
                            </div>
                            
                            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '11px', 
                                    fontWeight: isActive || isCompleted ? 800 : 500,
                                    color: isActive || isCompleted ? '#fff' : '#475569',
                                    whiteSpace: 'nowrap'
                                }}>
                                    {step.label}
                                </div>
                                <div style={{ 
                                    fontSize: '9px', 
                                    color: isActive ? '#dca64b' : '#64748b',
                                    marginTop: '2px',
                                    fontWeight: 600,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    maxWidth: '100px'
                                }}>
                                    {step.sublabel}
                                </div>
                                {step.date && (
                                    <div style={{ 
                                        fontSize: '9px', 
                                        color: '#94a3b8', 
                                        marginTop: '4px',
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        {step.date}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
