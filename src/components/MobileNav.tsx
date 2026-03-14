'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Ship, DollarSign, Users, MessageSquare, Package, Target, LogOut, Settings } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { USER_MAP } from '@/lib/sheets-types'

const mobileNavItems = [
    { name: 'Inicio', href: '/', icon: LayoutDashboard },
    { name: 'Ops', href: '/operaciones', icon: Ship },
    { name: 'Finanzas', href: '/finanzas', icon: DollarSign },
    { name: 'Leads', href: '/leads', icon: Target },
    { name: 'Prods', href: '/productos', icon: Package },
    { name: 'Contactos', href: '/contactos', icon: Users },
    { name: 'Chat', href: '/chat/equipo', icon: MessageSquare },
]

export function MobileNav() {
    const pathname = usePathname()
    const router = useRouter()
    const { data: session } = useSession()
    const [impersonatedUser, setImpersonatedUser] = useState<string | null>(null)
    const [avatarName, setAvatarName] = useState<string | null>(null)

    useEffect(() => {
        const load = () => {
            setImpersonatedUser(localStorage.getItem('smt_impersonated_user'))
            setAvatarName(localStorage.getItem('user-avatar-svg'))
        }
        load()
        window.addEventListener('smt-impersonation-changed', load)
        window.addEventListener('avatar-changed', load)
        return () => {
            window.removeEventListener('smt-impersonation-changed', load)
            window.removeEventListener('avatar-changed', load)
        }
    }, [])

    const activeUserEmail = impersonatedUser || session?.user?.email?.toLowerCase() || ''
    const isFinanzasHidden = activeUserEmail === 'hm@southmarinetrading.com' || activeUserEmail === 'admin@southmarinetrading.com'

    const filteredItems = mobileNavItems.filter(item => {
        if (item.name === 'Finanzas' && isFinanzasHidden) return false
        return true
    })

    const handleLogout = () => {
        localStorage.removeItem('user-profile')
        localStorage.removeItem('user-avatar-svg')
        signOut({ callbackUrl: '/login' })
    }

    // Get user initials for avatar fallback
    const userInfo = session?.user ? (USER_MAP as any)[session.user.email?.toLowerCase() || ''] : null
    const displayName = userInfo?.name || session?.user?.name || ''
    const initials = displayName ? displayName.slice(0, 1).toUpperCase() : '?'
    const isConfigActive = pathname === '/configuracion'

    return (
        <nav className="mobile-bottom-nav">
            {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                    <Link
                        key={item.name}
                        href={item.href}
                        className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                        <span>{item.name}</span>
                    </Link>
                )
            })}

            {/* Profile / Configuración — avatar button */}
            <Link
                href="/configuracion"
                className={`mobile-nav-item ${isConfigActive ? 'active' : ''}`}
                style={{ position: 'relative' }}
            >
                <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: isConfigActive ? 'var(--accent)' : 'var(--surface-raised)',
                    border: `1.5px solid ${isConfigActive ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isConfigActive ? 'white' : 'var(--text-muted)',
                    transition: 'all 0.2s',
                }}>
                    {initials}
                </div>
                <span>Perfil</span>
            </Link>

            {/* Logout */}
            <button
                onClick={handleLogout}
                className="mobile-nav-item"
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
                <LogOut size={20} strokeWidth={1.8} style={{ color: 'var(--red)' }} />
                <span style={{ color: 'var(--red)' }}>Salir</span>
            </button>
        </nav>
    )
}
