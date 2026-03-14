'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import {
    Plus, Clock, DollarSign, ChevronRight, Building, User as UserIcon, Settings, Ship,
    Anchor, Briefcase, Compass, Globe, Zap, Star, Award, Trophy, Medal, Rocket, Key, Home, Coffee, HardHat, Hammer, Wrench, Package, Box, Truck, Terminal, Code, Cpu, Mic, MapPin
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
    User: UserIcon, Shield: Settings, Briefcase, Anchor, Ship, Compass, Globe, Zap, Star, Award, Trophy, Medal, Rocket, Key, House: Home, Coffee, HardHat, Hammer, Wrench, Package, Box, Truck, Terminal, Code, Cpu, Microphone: Mic, MapPin
}
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { getResponsableName, Operacion, USER_MAP } from '@/lib/sheets-types'
import { DashboardData } from '@/lib/dashboard'
import { NotesWidget } from '@/components/NotesWidget'
import { ShipmentStatusWidget } from '@/components/dashboard/ShipmentStatusWidget'
import { ProspectsWidget } from '@/components/ProspectsWidget'
import { AgendaWidget } from '@/components/AgendaWidget'

export default function Dashboard() {
    const { data: session } = useSession()
    const router = useRouter()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [name, setName] = useState<string>('equipo')
    const [avatarName, setAvatarName] = useState<string>('User')
    const [impersonatedEmail, setImpersonatedEmail] = useState<string | null>(null)
    const [enabledWidgets, setEnabledWidgets] = useState<string[]>(['recent_ops', 'notes', 'financial_summary', 'cashflow', 'prospects', 'agenda'])

    useEffect(() => {
        const loadUserData = () => {
            const impersonated = localStorage.getItem('smt_impersonated_user')
            setImpersonatedEmail(impersonated)

            const savedAvatar = localStorage.getItem('user-avatar-svg')
            if (savedAvatar) setAvatarName(savedAvatar)

            if (impersonated) {
                const user = (USER_MAP as any)[impersonated]
                if (user) {
                    setName(user.name)
                }
            } else {
                // Demo user: always show "Demo" regardless of localStorage
                if ((session?.user as any)?.isDemo) {
                    setName('Demo')
                    return
                }
                // Prioridad: localStorage (configuración del usuario) > nombre de sesión
                const savedProfile = localStorage.getItem('user-profile')
                if (savedProfile) {
                    try {
                        const profile = JSON.parse(savedProfile)
                        if (profile.name) {
                            setName(profile.name)
                        } else if (session?.user?.name) {
                            setName(session.user.name)
                        }
                    } catch (e) {
                        if (session?.user?.name) setName(session.user.name)
                    }
                } else if (session?.user?.name) {
                    setName(session.user.name)
                }
            }

        }

        loadUserData()
        window.addEventListener('profile-changed', loadUserData)
        window.addEventListener('avatar-changed', loadUserData)
        window.addEventListener('smt-impersonation-changed', loadUserData)
        return () => {
            window.removeEventListener('profile-changed', loadUserData)
            window.removeEventListener('avatar-changed', loadUserData)
            window.removeEventListener('smt-impersonation-changed', loadUserData)
        }
    }, [session])

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true)
            try {
                const url = impersonatedEmail ? `/api/dashboard/stats?impersonate=${impersonatedEmail}` : '/api/dashboard/stats'
                const res = await fetch(url)
                const json = await res.json()
                if (json.success) {
                    setData(json.data)
                }
            } catch (error) {
                console.error('Error fetching dashboard stats:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchStats()

        // Load widget config
        const saved = localStorage.getItem('marta_dashboard_widgets')
        if (saved) {
            setEnabledWidgets(JSON.parse(saved))
        }
    }, [impersonatedEmail])

    const userEmail = session?.user?.email?.toLowerCase()
    const isAdmin = userEmail === 'hm@southmarinetrading.com' ||
        userEmail === 'admin@southmarinetrading.com' ||
        userEmail === 'marta@southmarinetrading.com' ||
        session?.user?.name?.toLowerCase() === 'marta'

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div className="spinner"></div>
        </div>
    )

    const isWidgetEnabled = (id: string) => enabledWidgets.includes(id)

    return (
        <div className="animate-in">
            {/* Header */}
            <header className="page-header">
                <div className="dashboard-user-profile">
                    <div className="dashboard-avatar-lg">
                        {(() => {
                            const IconComp = ICON_MAP[avatarName] || UserIcon
                            return <IconComp size={24} strokeWidth={1.5} />
                        })()}
                    </div>
                    <div>
                        <h1 className="label-marta">MARTA BOT • INTELIGENCIA OPERATIVA</h1>
                        <p className="page-title">¡Hola, {name}! ¿Qué gestionamos hoy?</p>
                    </div>
                </div>

                <div className="quick-actions">
                    <Link href="/operaciones/nueva" className="btn btn-primary" style={{ padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-lg)' }}>
                        <Plus size={18} />
                        Nueva Operación
                    </Link>
                </div>
            </header>

            {/* Row 1: Shipment Status & Notes */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '12px',
                marginBottom: '12px'
            }}>
                {/* Shipment Status Widget */}
                {isWidgetEnabled('cashflow') && (
                    <ShipmentStatusWidget />
                )}

                {/* Notes Widget */}
                {isWidgetEnabled('notes') && (
                    <NotesWidget
                        userEmail={impersonatedEmail || session?.user?.email || ''}
                        userName={name || ''}
                    />
                )}
            </div>

            {/* Row 2: Agenda (Middle) */}
            {isWidgetEnabled('agenda') && (
                <div style={{ marginBottom: '12px' }}>
                    <AgendaWidget userName={name || 'Usuario'} />
                </div>
            )}

            {/* Row 3: CRM (Bottom) */}
            <div style={{ marginBottom: '12px' }}>
                {isWidgetEnabled('prospects') && (
                    <ProspectsWidget
                        userName={name || ''}
                        userEmail={impersonatedEmail || session?.user?.email || ''}
                    />
                )}
            </div>

            {/* Full Width: User Operations */}
            {isWidgetEnabled('recent_ops') && (
                <div className="card mb-3">
                    <div className="card-header">
                        <h2 className="card-title">
                            {(() => {
                                const IconComp = ICON_MAP[avatarName] || UserIcon
                                return <IconComp size={20} color="var(--accent)" />
                            })()}
                            {isAdmin ? 'Últimas Operaciones Generales' : 'Mis Operaciones'}
                        </h2>
                        <Link href="/operaciones" className="btn btn-secondary btn-small">Ver Todas</Link>
                    </div>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Carga</th>
                                    <th>Cliente</th>
                                    <th>Estado</th>
                                    <th>Responsable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!data || data.recentOps.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-8)' }}>
                                            No hay operaciones recientes
                                        </td>
                                    </tr>
                                ) : (
                                    data.recentOps.map((op: Operacion) => (
                                        <tr key={op.id} onClick={() => router.push(`/operaciones/${op.id}`)} className="clickable-row">
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{op.id}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{op.productos?.slice(0, 30)}...</div>
                                            </td>
                                            <td>{op.cliente}</td>
                                            <td>
                                                <span className={`badge ${op.estado?.toLowerCase().includes('ok') ? 'badge-success' : 'badge-warning'}`}>
                                                    {op.estado}
                                                </span>
                                            </td>
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    {(() => {
                                                        const user = Object.values(USER_MAP).find(u => u.name === getResponsableName(op.userId))
                                                        return user?.avatar ? (
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', overflow: 'hidden', border: `1px solid ${user.color || 'var(--border)'}` }}>
                                                                <img src={user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <UserIcon size={12} />
                                                            </div>
                                                        )
                                                    })()}
                                                    <span>{getResponsableName(op.userId)}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Executive Financial Summary */}
            {isAdmin && data?.financials && isWidgetEnabled('financial_summary') && (
                <div className="card animate-in" style={{ marginTop: 'var(--space-6)', animationDelay: '0.2s' }}>
                    <div className="card-header">
                        <h2 className="card-title">
                            <DollarSign size={20} color="var(--accent)" />
                            Resumen Ejecutivo de Finanzas (SMT)
                        </h2>
                    </div>

                    <div className="financial-summary-grid">
                        {/* Real Cash */}
                        <div className="financial-stat-item">
                            <div className="financial-stat-label">Caja Real (Total Cobrado)</div>
                            <div className="financial-stat-value" style={{ color: 'var(--green)' }}>
                                ${data.financials.totalIncome.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Menos egresos: ${data.financials.totalExpense.toLocaleString()}
                            </div>
                        </div>

                        {/* Pending Items */}
                        <div className="financial-stat-item">
                            <div className="financial-stat-label">Por Cobrar (Pendiente)</div>
                            <div className="financial-stat-value" style={{ color: 'var(--orange)' }}>
                                ${data.financials.pendingToCollect.toLocaleString()}
                            </div>
                            <div style={{
                                height: '4px',
                                background: 'rgba(255,165,0,0.1)',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                width: '100%'
                            }}>
                                <div style={{
                                    height: '100%',
                                    background: 'var(--orange)',
                                    width: `${Math.min(100, (data.financials.totalIncome / (data.financials.totalIncome + data.financials.pendingToCollect || 1)) * 100)}%`
                                }}></div>
                            </div>
                        </div>

                        <div className="financial-stat-item">
                            <div className="financial-stat-label">Por Pagar (Pendiente)</div>
                            <div className="financial-stat-value" style={{ color: 'var(--red)' }}>
                                ${data.financials.pendingToPay.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Total compras: ${(data.financials.totalExpense + data.financials.pendingToPay).toLocaleString()}
                            </div>
                        </div>

                        {/* Balance & Margin */}
                        <div className="financial-stat-item" style={{ paddingLeft: '20px', borderLeft: '1px solid var(--border)' }}>
                            <div className="financial-stat-label">Efectivo Disponible</div>
                            <div className="financial-stat-value" style={{ color: 'var(--cyan)' }}>
                                ${data.financials.activeBalance.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                Margen Bruto General: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{data.financials.grossMargin.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
