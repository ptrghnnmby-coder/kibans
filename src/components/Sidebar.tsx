'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard, MessageSquare, Users, Package, FileText, ShoppingCart, Ship, Mail, Settings, DollarSign, User as UserIcon, Box,
    Anchor, Briefcase, Compass, Globe, Zap, Star, Award, Trophy, Medal, Rocket, Key, Home, Coffee, HardHat, Hammer, Wrench, Truck, Terminal, Code, Cpu, Mic, MapPin,
    Search, LogOut, Menu, X as XIcon, Target, Navigation2, TrendingUp
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import { AdminBridge } from './AdminBridge'
import { USER_MAP } from '@/lib/sheets-types'
import { UserAvatar } from './ui/UserAvatar'

const ICON_MAP: Record<string, any> = {
    User: UserIcon, Shield: Settings, Briefcase, Anchor, Ship, Compass, Globe, Zap, Star, Award, Trophy, Medal, Rocket, Key, House: Home, Coffee, HardHat, Hammer, Wrench, Package, Box, Truck, Terminal, Code, Cpu, Microphone: Mic, MapPin
}

const navigation = [
    {
        items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Chat SMT', href: '/chat/equipo', icon: MessageSquare },
        ],
    },
    {
        section: 'CENTRO DE CARGAS',
        items: [
            { name: 'Operaciones', href: '/operaciones?tab=todas', icon: Ship },
            { name: 'Tracking', href: '/tracking', icon: Navigation2 },
            { name: 'Central Documental', href: '/documentos', icon: FileText },
        ],
    },
    {
        section: 'FINANZAS',
        items: [
            { name: 'Finanzas', href: '/finanzas', icon: DollarSign },
            { name: 'Métricas', href: '/metricas', icon: TrendingUp },
        ],
    },
    {
        section: 'BASE DE DATOS',
        items: [
            { name: 'Contactos', href: '/contactos', icon: Users },
            { name: 'Productos', href: '/productos', icon: Package },
        ],
    },
    {
        section: 'CRM',
        items: [
            { name: 'Leads', href: '/leads', icon: Target },
        ],
    },
]

export function Sidebar() {
    const pathname = usePathname()
    const [mobileOpen, setMobileOpen] = useState(false)
    const { data: session } = useSession()
    const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null)

    // Close sidebar on route change
    useEffect(() => {
        setMobileOpen(false)
    }, [pathname])

    useEffect(() => {
        const loadImpersonation = () => {
            setImpersonatedUser(localStorage.getItem('smt_impersonated_user'))
        }
        loadImpersonation()
        window.addEventListener('smt-impersonation-changed', loadImpersonation)
        return () => window.removeEventListener('smt-impersonation-changed', loadImpersonation)
    }, [])

    const activeUserEmail = impersonatedUser || session?.user?.email?.toLowerCase() || ''
    const isFinanzasHidden = activeUserEmail === 'hm@southmarinetrading.com' || activeUserEmail === 'admin@southmarinetrading.com'

    const filteredNavigation = navigation.filter(group => {
        if (group.section === 'FINANZAS' && isFinanzasHidden) return false;
        return true;
    })

    return (
        <>
            {/* Hamburger — only visible on mobile via CSS */}
            {!mobileOpen && (
                <button
                    className="sidebar-hamburger"
                    onClick={() => setMobileOpen(true)}
                    aria-label="Abrir menú"
                >
                    <Menu size={20} />
                </button>
            )}

            {/* Overlay — only visible on mobile when sidebar is open */}
            <div
                className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header" style={{ borderBottom: 'none', paddingBottom: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'var(--accent)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Ship size={20} strokeWidth={2.5} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: 800,
                                letterSpacing: '0.5px',
                                color: 'white',
                                lineHeight: 1.1
                            }}>{activeUserEmail === 'demo@southmarinetrading.com' ? 'DEMO' : 'SOUTHMARINE'}</span>
                            <span style={{
                                fontSize: '10px',
                                fontWeight: 500,
                                color: 'var(--text-muted)',
                                letterSpacing: '1px'
                            }}>{activeUserEmail === 'demo@southmarinetrading.com' ? 'MODE' : 'TRADING'}</span>
                        </div>
                    </div>
                </div>

                {/* Global Search Implementation */}
                <div style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <GlobalSearch />
                </div>

                <nav className="sidebar-nav">
                    {filteredNavigation.map((group) => (
                        <div key={group.section || group.items[0].name} className="nav-section">
                            {group.section && <div className="nav-section-title">{group.section}</div>}
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        id={`nav-${item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`}
                                        className={`nav-item ${isActive ? 'active' : ''}`}
                                    >
                                        <Icon size={18} />
                                        <span>{item.name}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                <div style={{ marginTop: 'auto', padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                    <UserProfile />
                </div>
            </aside>
        </>
    )
}

function UserProfile() {
    const { data: session } = useSession();
    const [avatarName, setAvatarName] = useState<string>('User');
    const [name, setName] = useState<string>('Usuario');

    useEffect(() => {
        const loadUserData = () => {
            const impersonated = localStorage.getItem('smt_impersonated_user');
            const savedAvatar = localStorage.getItem('user-avatar-svg');
            if (savedAvatar) setAvatarName(savedAvatar);

            let localName = null;
            const savedProfile = localStorage.getItem('user-profile');
            if (savedProfile) {
                try {
                    const profile = JSON.parse(savedProfile);
                    if (profile.name) localName = profile.name;
                } catch (e) {
                    console.error("Error parsing profile", e);
                }
            }

            if (impersonated) {
                const user = (USER_MAP as any)[impersonated];
                if (user) {
                    setName(user.name);
                }
            } else if (localName) {
                setName(localName);
            } else if (session?.user?.name) {
                setName(session.user.name);
            }
        };

        loadUserData();
        window.addEventListener('avatar-changed', loadUserData);
        window.addEventListener('profile-changed', loadUserData);
        window.addEventListener('smt-impersonation-changed', loadUserData);
        return () => {
            window.removeEventListener('avatar-changed', loadUserData);
            window.removeEventListener('profile-changed', loadUserData);
            window.removeEventListener('smt-impersonation-changed', loadUserData);
        };
    }, [session]);

    const IconComp = ICON_MAP[avatarName] || UserIcon;
    const userEmail = session?.user?.email?.toLowerCase();

    // Only 'info' and 'rdm' (Rafa) can access the Admin Bridge
    const isBridgeAuthorized = !!(userEmail && (
        userEmail === 'info@southmarinetrading.com' ||
        userEmail === 'rdm@southmarinetrading.com'
    ));

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isBridgeAuthorized && <AdminBridge isAdmin={isBridgeAuthorized} />}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--surface-raised)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)'
            }}>
                <UserAvatar email={session?.user?.email || ''} size={32} />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{name}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SMT Team</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                    <Link href="/configuracion" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}
                        className="hover:bg-accent hover:text-white hover:border-accent"
                        title="Configuración"
                    >
                        <Settings size={16} />
                    </Link>
                    <button
                        onClick={() => {
                            localStorage.removeItem('user-profile');
                            localStorage.removeItem('user-avatar-svg');
                            signOut({ callbackUrl: '/login' });
                        }}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                            transition: 'all 0.2s',
                            cursor: 'pointer'
                        }}
                        className="hover:bg-red-soft hover:text-red hover:border-red"
                        title="Cerrar Sesión"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}

function GlobalSearch() {
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [results, setResults] = useState<{ id: string, label: string, type: 'op' | 'contact', href: string }[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const inputRef = useRef<HTMLInputElement>(null)

    // Keyboard shortcut listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Search logic
    useEffect(() => {
        if (!query.trim() || query.length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const [resOps, resContacts, resLeads, resProducts] = await Promise.all([
                    fetch('/api/operaciones/all').then(r => r.json()),
                    fetch('/api/contactos').then(r => r.json()),
                    fetch('/api/leads').then(r => r.json()),
                    fetch('/api/productos').then(r => r.json())
                ])

                const searchLower = query.toLowerCase()

                const ops = (resOps.data || []).filter((op: any) =>
                    op.id?.toLowerCase().includes(searchLower) ||
                    op.cliente?.toLowerCase().includes(searchLower) ||
                    op.ruta_corta?.toLowerCase().includes(searchLower) ||
                    op.estado?.toLowerCase().includes(searchLower)
                ).map((op: any) => ({
                    id: op.id,
                    label: `${op.id} - ${op.cliente}`,
                    type: 'op' as const,
                    href: `/operaciones/${op.id}`
                }))

                const contacts = (resContacts.data || []).filter((c: any) =>
                    c.empresa?.toLowerCase().includes(searchLower) ||
                    c.nombreContacto?.toLowerCase().includes(searchLower) ||
                    c.apellido?.toLowerCase().includes(searchLower) ||
                    c.email?.toLowerCase().includes(searchLower)
                ).map((c: any) => ({
                    id: c.id,
                    label: c.empresa || `${c.nombreContacto} ${c.apellido}`,
                    type: 'contact' as const,
                    href: `/contactos/${c.id}`
                }))

                const leads = (resLeads.data || []).filter((l: any) =>
                    l.empresa?.toLowerCase().includes(searchLower) ||
                    l.nombre?.toLowerCase().includes(searchLower) ||
                    l.email?.toLowerCase().includes(searchLower) ||
                    l.estado?.toLowerCase().includes(searchLower)
                ).map((l: any) => ({
                    id: l.id,
                    label: l.empresa || l.nombre,
                    type: 'lead' as const,
                    href: `/leads/${l.id}`
                }))

                const products = (resProducts.data || []).filter((p: any) =>
                    p.id?.toLowerCase().includes(searchLower) ||
                    p.especie?.toLowerCase().includes(searchLower) ||
                    p.corte?.toLowerCase().includes(searchLower) ||
                    p.descripcion?.toLowerCase().includes(searchLower)
                ).map((p: any) => ({
                    id: p.id,
                    label: `${p.especie}${p.corte ? ` - ${p.corte}` : ''}`,
                    type: 'product' as const,
                    href: `/productos/${p.id}`
                }))

                // Combine and sort/prioritize
                const allResults = [...ops, ...contacts, ...leads, ...products]
                setResults(allResults.slice(0, 10))
            } catch (error) {
                console.error('Search error:', error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const handleSelect = (href: string) => {
        router.push(href)
        setQuery('')
        setIsFocused(false)
    }

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: isFocused ? 'var(--surface-raised)' : 'var(--bg)',
                border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '4px var(--space-3)',
                transition: 'all 0.2s',
                boxShadow: isFocused ? '0 0 0 2px var(--accent-soft)' : 'none'
            }}>
                <Search size={14} color={isFocused ? 'var(--accent)' : 'var(--text-dim)'} />
                <input
                    ref={inputRef}
                    type="text"
                    name="smt-global-search"
                    id="global-search"
                    autoComplete="one-time-code"
                    placeholder="Buscar..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        padding: 0,
                        fontSize: '12px',
                        color: 'var(--text)',
                        outline: 'none',
                        width: '100%'
                    }}
                />
                {!query && !isFocused && (
                    <div style={{
                        fontSize: '10px',
                        background: 'var(--surface-raised)',
                        color: 'var(--text-dim)',
                        padding: '1px 4px',
                        borderRadius: '3px',
                        border: '1px solid var(--border)',
                        fontFamily: 'var(--font-mono)',
                        pointerEvents: 'none',
                        flexShrink: 0
                    }}>
                        ⌘K
                    </div>
                )}
            </div>

            {/* Results Dropdown */}
            {isFocused && (query.length >= 2 || loading) && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    background: 'var(--surface-raised)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto',
                    padding: 'var(--space-1)'
                }}>
                    {loading ? (
                        <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
                            Buscando...
                        </div>
                    ) : results.length > 0 ? (
                        results.map((res, i) => (
                            <div
                                key={`${res.type}-${res.id}-${i}`}
                                onClick={() => handleSelect(res.href)}
                                style={{
                                    padding: 'var(--space-2) var(--space-3)',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    fontSize: '11px',
                                    color: 'var(--text-muted)',
                                    transition: 'background 0.2s'
                                }}
                                className="hover:bg-accent hover:text-white"
                            >
                                {res.type === 'op' ? <Ship size={14} /> :
                                    res.type === 'contact' ? <Users size={14} /> :
                                        res.type === 'lead' ? <Target size={14} /> :
                                            <Package size={14} />}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 600, color: 'inherit', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {res.label}
                                    </div>
                                    <div style={{ fontSize: '9px', opacity: 0.7 }}>
                                        {res.type === 'op' ? 'Operación' :
                                            res.type === 'contact' ? 'Contacto' :
                                                res.type === 'lead' ? 'Lead' : 'Producto'}
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : query.length >= 2 && (
                        <div style={{ padding: 'var(--space-3)', textAlign: 'center', color: 'var(--text-dim)', fontSize: '11px' }}>
                            No se encontraron resultados
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
