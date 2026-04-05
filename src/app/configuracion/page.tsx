'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import {
    User, Check, Shield, Bell, Palette, Mail, Lock, Camera, MessageSquare, Send, AlertTriangle,
    Anchor, Ship, Briefcase, Compass, Search, Globe, Zap, Heart, Star, Award, Box, Coffee,
    Rocket, Key, Home, Camera as CameraIcon, Mic, Trophy, Medal, MapPin,
    HardHat, Hammer, Wrench, Package, Truck, Terminal, Code, Cpu, X, CheckCircle, Sun, Moon
} from 'lucide-react'
import { useSession } from 'next-auth/react'
import { useTheme } from '@/components/ThemeContext'

// Define a list of premium icons for the avatar system
const SVG_ICON_LIBRARY = [
    { name: 'User', icon: User },
    { name: 'Shield', icon: Shield },
    { name: 'Briefcase', icon: Briefcase },
    { name: 'Anchor', icon: Anchor },
    { name: 'Ship', icon: Ship },
    { name: 'Compass', icon: Compass },
    { name: 'Globe', icon: Globe },
    { name: 'Zap', icon: Zap },
    { name: 'Star', icon: Star },
    { name: 'Award', icon: Award },
    { name: 'Trophy', icon: Trophy },
    { name: 'Medal', icon: Medal },
    { name: 'Rocket', icon: Rocket },
    { name: 'Key', icon: Key },
    { name: 'House', icon: Home },
    { name: 'Coffee', icon: Coffee },
    { name: 'HardHat', icon: HardHat },
    { name: 'Hammer', icon: Hammer },
    { name: 'Wrench', icon: Wrench },
    { name: 'Package', icon: Package },
    { name: 'Box', icon: Box },
    { name: 'Truck', icon: Truck },
    { name: 'Terminal', icon: Terminal },
    { name: 'Code', icon: Code },
    { name: 'Cpu', icon: Cpu },
    { name: 'Microphone', icon: Mic },
    { name: 'MapPin', icon: MapPin },
]

export default function ConfiguracionPage() {
    const { theme, setTheme } = useTheme()
    const [activeTab, setActiveTab] = useState<'perfil' | 'firmas' | 'notificaciones' | 'sugerencias'>('perfil')
    const [selectedAvatarName, setSelectedAvatarName] = useState<string>('User')
    const [showAvatarGrid, setShowAvatarGrid] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [saveSuccess, setSaveSuccess] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    // Form states
    const { data: session } = useSession()
    const [profile, setProfile] = useState({ name: '' })
    const [signature, setSignature] = useState('')
    const [notifications, setNotifications] = useState({ newOp: true, chat: true, quiet: false })
    const [suggestion, setSuggestion] = useState({ type: 'sugerencia', concept: '', details: '' })
    const [attachment, setAttachment] = useState<File | null>(null)
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 700)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    useEffect(() => {
        const savedAvatar = localStorage.getItem('user-avatar-svg')
        if (savedAvatar) setSelectedAvatarName(savedAvatar)

        // Load profile from local storage if exists
        const savedProfile = localStorage.getItem('user-profile')
        if (savedProfile) {
            setProfile(JSON.parse(savedProfile))
        } else if (session?.user?.name) {
            setProfile({ name: session.user.name })
        }

        // Load signature
        const savedSignature = localStorage.getItem('user-signature')
        if (savedSignature) setSignature(savedSignature)

        // Load notifications
        const savedNotifications = localStorage.getItem('user-notifications-config')
        if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
    }, [session])

    const saveSettings = () => {
        setIsSaving(true)
        setSaveSuccess(false)

        localStorage.setItem('user-avatar-svg', selectedAvatarName)
        window.dispatchEvent(new Event('avatar-changed'))

        localStorage.setItem('user-profile', JSON.stringify(profile))
        window.dispatchEvent(new Event('profile-changed'))

        localStorage.setItem('user-signature', signature)
        localStorage.setItem('user-notifications-config', JSON.stringify(notifications))
        window.dispatchEvent(new Event('config-changed'))

        setTimeout(() => {
            setIsSaving(false)
            setSaveSuccess(true)
            setTimeout(() => setSaveSuccess(false), 3000)
        }, 800)
    }

    const sendSuggestion = async () => {
        setIsSaving(true)
        setSaveSuccess(false)

        let screenshotUrl = ''

        try {
            // 1. Upload attachment if exists
            if (attachment) {
                setUploadingImage(true)
                const formData = new FormData()
                formData.append('file', attachment)
                const upRes = await fetch('/api/suggestions/upload', {
                    method: 'POST',
                    body: formData
                })
                const upData = await upRes.json()
                if (upData.success) {
                    screenshotUrl = upData.viewLink
                }
                setUploadingImage(false)
            }

            // 2. Send suggestion
            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...suggestion,
                    userEmail: session?.user?.email || 'usuario@tessbot.io',
                    screenshotUrl
                })
            })

            if (res.ok) {
                setSaveSuccess(true)
                setSuggestion({ type: 'sugerencia', concept: '', details: '' })
                setAttachment(null)
                setAttachmentUrl(null)
                setTimeout(() => setSaveSuccess(false), 3000)
            }
        } catch (error) {
            console.error("Error sending suggestion", error)
        } finally {
            setIsSaving(false)
            setUploadingImage(false)
        }
    }

    // Helper to render the selected icon
    const SelectedIconComp = SVG_ICON_LIBRARY.find(i => i.name === selectedAvatarName)?.icon || User

    const sections: { key: 'perfil' | 'firmas' | 'notificaciones' | 'sugerencias'; label: string; fullLabel: string; Icon: any }[] = [
        { key: 'perfil', label: 'Perfil', fullLabel: 'Perfil', Icon: User },
        { key: 'firmas', label: 'Firmas', fullLabel: 'Firmas Automáticas', Icon: Mail },
        { key: 'notificaciones', label: 'Notificaciones', fullLabel: 'Notificaciones', Icon: Bell },
        { key: 'sugerencias', label: 'Sugerencias', fullLabel: 'Sugerencias', Icon: MessageSquare },
    ]

    return (
        <div className="animate-in" style={{ maxWidth: isMobile ? '100%' : '900px', margin: '0 auto', paddingBottom: '100px' }}>
            <div style={{ marginBottom: isMobile ? 'var(--space-4)' : 'var(--space-8)' }}>
                <h1 className="page-title">Configuración</h1>
                {!isMobile && <p className="page-subtitle">Gestiona tu perfil, seguridad y preferencias en Tess.</p>}
            </div>

            {/* Mobile: horizontal scrollable tab pills */}
            {isMobile && (
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    padding: '0 0 12px 0',
                    marginBottom: '16px',
                    scrollbarWidth: 'none',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {sections.map(({ key, label, Icon }) => (
                        <button
                            key={key}
                            onClick={() => setActiveTab(key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: `1.5px solid ${activeTab === key ? 'var(--accent)' : 'var(--border)'}`,
                                background: activeTab === key ? 'var(--accent-soft)' : 'var(--surface)',
                                color: activeTab === key ? 'var(--accent)' : 'var(--text-muted)',
                                fontSize: '13px',
                                fontWeight: activeTab === key ? 700 : 500,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontFamily: 'inherit',
                            }}
                        >
                            <Icon size={14} />
                            {label}
                        </button>
                    ))}
                </div>
            )}

            <div style={isMobile
                ? { display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }
                : { display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-8)' }
            }>
                {/* Desktop: Sidebar categorías */}
                {!isMobile && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {sections.map(({ key, fullLabel, Icon }) => (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={`nav-item ${activeTab === key ? 'active' : ''}`}
                                style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left' }}
                            >
                                <Icon size={18} />
                                <span>{fullLabel}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Contenido Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

                    {activeTab === 'perfil' && (
                        <div className="card animate-in" style={{ animationDuration: '0.2s' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <User size={20} className="text-accent" />
                                Información de Perfil
                            </h2>

                            {/* Premium SVG Avatar Selector */}
                            <div style={{ marginBottom: 'var(--space-8)', display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                                <div style={{
                                    width: '85px',
                                    height: '85px',
                                    borderRadius: '50%',
                                    background: 'var(--surface-raised)',
                                    border: '1.5px solid var(--border-light)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.05)',
                                    position: 'relative',
                                    color: 'var(--accent)'
                                }}>
                                    <SelectedIconComp size={42} strokeWidth={1.5} />
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '0',
                                        right: '0',
                                        width: '24px',
                                        height: '24px',
                                        background: 'var(--accent)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid var(--surface)',
                                        color: 'white'
                                    }}>
                                        <Camera size={12} />
                                    </div>
                                </div>
                                <div>
                                    <button
                                        className="btn btn-secondary btn-small"
                                        onClick={() => setShowAvatarGrid(!showAvatarGrid)}
                                        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-light)' }}
                                    >
                                        {showAvatarGrid ? 'Ocultar Selección' : 'Cambiar Icono Premium'}
                                    </button>
                                    <p style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px', maxWidth: '200px', lineHeight: '1.4' }}>
                                        Selecciona un icono que represente tu rango en el sistema.
                                    </p>
                                </div>
                            </div>

                            {showAvatarGrid && (
                                <div style={{
                                    marginBottom: 'var(--space-8)',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                                    gap: 'var(--space-2)',
                                    maxHeight: '350px',
                                    overflowY: 'auto',
                                    padding: 'var(--space-6)',
                                    background: 'rgba(0,0,0,0.3)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border)',
                                    boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.2)',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}>
                                    {SVG_ICON_LIBRARY.map((item, idx) => {
                                        const Icon = item.icon
                                        const isSelected = selectedAvatarName === item.name
                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedAvatarName(item.name)}
                                                style={{
                                                    aspectRatio: '1/1',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    background: isSelected ? 'var(--accent-soft)' : 'transparent',
                                                    borderRadius: 'var(--radius-md)',
                                                    border: `1px solid ${isSelected ? 'var(--accent)' : 'transparent'}`,
                                                    color: isSelected ? 'var(--accent)' : 'var(--text-dim)',
                                                    transition: 'all 0.15s ease',
                                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                                }}
                                                className="hover:text-accent hover:bg-white/5"
                                            >
                                                <Icon size={24} strokeWidth={isSelected ? 2 : 1.5} />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="input-group">
                                <label>Nombre de Preferencia</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ paddingLeft: '40px' }}
                                        value={profile.name}
                                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                                        placeholder="Tu nombre o apodo"
                                    />
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Este nombre será usado por Tess y en tu dashboard.</p>
                            </div>

                            {/* Theme Selector moved here inside Profil tab */}
                            <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border)' }}>
                                <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    <Palette size={16} />
                                    Apariencia del Sistema
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                    <div
                                        onClick={() => setTheme('dark')}
                                        style={{
                                            padding: 'var(--space-4)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${theme === 'dark' ? 'var(--accent)' : 'var(--border)'}`,
                                            background: '#0b1120',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-4)',
                                            boxShadow: theme === 'dark' ? '0 0 15px rgba(56, 189, 248, 0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: 'rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: theme === 'dark' ? 'var(--accent)' : '#94a3b8'
                                        }}>
                                            <Moon size={18} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: '#ececee', fontSize: '13px' }}>Modo Oscuro</div>
                                            <div style={{ fontSize: '10px', color: '#94a3b8' }}>Tradicional</div>
                                        </div>
                                        {theme === 'dark' && <div style={{ background: 'var(--accent)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>ON</div>}
                                    </div>

                                    <div
                                        onClick={() => setTheme('light')}
                                        style={{
                                            padding: 'var(--space-4)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${theme === 'light' ? 'var(--accent)' : 'var(--border)'}`,
                                            background: '#f8fafc',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-4)',
                                            boxShadow: theme === 'light' ? '0 0 15px rgba(56, 189, 248, 0.1)' : 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            background: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: theme === 'light' ? 'var(--accent)' : '#64748b',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                                        }}>
                                            <Sun size={18} />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13px' }}>Modo Claro</div>
                                            <div style={{ fontSize: '10px', color: '#64748b' }}>Alta claridad</div>
                                        </div>
                                        {theme === 'light' && <div style={{ background: 'var(--accent)', color: 'white', padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>ON</div>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                {saveSuccess && <span style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 500 }}>✨ Cambios guardados</span>}
                                <button
                                    onClick={saveSettings}
                                    className={`btn ${isSaving ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={isSaving}
                                    style={{ minWidth: '160px' }}
                                >
                                    {isSaving ? 'Guardando...' : (
                                        <>
                                            <Check size={18} />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                    {activeTab === 'firmas' && (
                        <div className="card animate-in" style={{ animationDuration: '0.2s' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Mail size={20} className="text-accent" />
                                Firmas Automáticas
                            </h2>

                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: 'var(--space-6)' }}>
                                Definí la firma que aparecerá al pie de los correos automáticos (como proformas y órdenes de compra). Podés usar HTML básico si lo deseás. Dejar vacío para usar "South Marine Trading" como default.
                            </p>

                            <div className="input-group">
                                <label>Tu Firma Personalizada</label>
                                <textarea
                                    className="input"
                                    style={{ minHeight: '150px', resize: 'vertical', fontFamily: 'monospace' }}
                                    placeholder="Ejemplo:
<strong>Juan Pérez</strong><br>
Gerente de Logística<br>
South Marine Trading"
                                    value={signature}
                                    onChange={(e) => setSignature(e.target.value)}
                                />
                            </div>

                            {signature && (
                                <div style={{ marginTop: 'var(--space-4)' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Vista Previa:</label>
                                    <div style={{
                                        padding: 'var(--space-4)',
                                        border: '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--surface)',
                                        color: 'var(--text)',
                                        fontSize: '14px',
                                        lineHeight: '1.5'
                                    }}>
                                        Best regards,<br /><br />
                                        <div dangerouslySetInnerHTML={{ __html: signature }} />
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                {saveSuccess && <span style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 500 }}>✨ Firma guardada</span>}
                                <button
                                    onClick={saveSettings}
                                    className={`btn ${isSaving ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={isSaving}
                                    style={{ minWidth: '160px' }}
                                >
                                    {isSaving ? 'Guardando...' : (
                                        <>
                                            <Check size={18} />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notificaciones' && (
                        <div className="card animate-in" style={{ animationDuration: '0.2s' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Bell size={20} className="text-accent" />
                                Preferencias de Notificaciones
                            </h2>

                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: 'var(--space-6)' }}>
                                Configura qué tipo de alertas visuales deseas recibir dentro de la plataforma.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications.newOp}
                                        onChange={(e) => setNotifications({ ...notifications, newOp: e.target.checked })}
                                        style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Nuevas Operaciones</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Mostrar alertas cuando se cree o asigne una nueva carga.</div>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications.chat}
                                        onChange={(e) => setNotifications({ ...notifications, chat: e.target.checked })}
                                        style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Notificaciones de Chat</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Alertas visuales de nuevos mensajes del Chat SMT.</div>
                                    </div>
                                </label>

                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: notifications.quiet ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)' }}>
                                    <input
                                        type="checkbox"
                                        checked={notifications.quiet}
                                        onChange={(e) => setNotifications({ ...notifications, quiet: e.target.checked })}
                                        style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: notifications.quiet ? 'var(--red)' : 'var(--text)' }}>Modo Silencioso</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Activar este modo oculta todos los pop-ups, excepto alertas críticas.</div>
                                    </div>
                                </label>
                            </div>

                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                {saveSuccess && <span style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 500 }}>✨ Preferencias guardadas</span>}
                                <button
                                    onClick={saveSettings}
                                    className={`btn ${isSaving ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={isSaving}
                                    style={{ minWidth: '160px' }}
                                >
                                    {isSaving ? 'Guardando...' : (
                                        <>
                                            <Check size={18} />
                                            Guardar Cambios
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}


                    {activeTab === 'sugerencias' && (
                        <div className="card animate-in" style={{ animationDuration: '0.2s' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MessageSquare size={20} className="text-accent" />
                                Sugerencias y Reporte de Errores
                            </h2>

                            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: 'var(--space-6)' }}>
                                Tu feedback nos ayuda a mejorar Tess. Cuéntanos qué podemos mejorar o si encontraste algún error.
                            </p>

                            <div className="input-group">
                                <label>Tipo de Mensaje</label>
                                <select
                                    className="input"
                                    value={suggestion.type}
                                    onChange={(e) => setSuggestion({ ...suggestion, type: e.target.value })}
                                >
                                    <option value="sugerencia">Sugerencia de Mejora</option>
                                    <option value="error">Reportar un Error</option>
                                    <option value="felicitacion">Felicitación ✨</option>
                                </select>
                            </div>

                            <div className="input-group">
                                <label>Concepto</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="Resumen corto..."
                                    value={suggestion.concept}
                                    onChange={(e) => setSuggestion({ ...suggestion, concept: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label>Mensaje / Detalles</label>
                                <textarea
                                    className="input"
                                    style={{ minHeight: '120px', resize: 'vertical' }}
                                    placeholder="Escribe aquí tus comentarios..."
                                    value={suggestion.details}
                                    onChange={(e) => setSuggestion({ ...suggestion, details: e.target.value })}
                                />
                            </div>

                            <div className="input-group">
                                <label>Adjuntar Captura (Opcional)</label>
                                <div style={{
                                    border: '1px dashed var(--border)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    background: 'rgba(0,0,0,0.1)'
                                }}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                setAttachment(file)
                                                setAttachmentUrl(URL.createObjectURL(file))
                                            }
                                        }}
                                        style={{ fontSize: '12px' }}
                                    />
                                    {attachmentUrl && (
                                        <div style={{ position: 'relative', width: 'fit-content' }}>
                                            <img
                                                src={attachmentUrl}
                                                alt="Preview"
                                                style={{ maxWidth: '200px', borderRadius: '4px', border: '1px solid var(--border)' }}
                                            />
                                            <button
                                                onClick={() => { setAttachment(null); setAttachmentUrl(null); }}
                                                style={{
                                                    position: 'absolute',
                                                    top: '-8px',
                                                    right: '-8px',
                                                    background: 'var(--red)',
                                                    border: 'none',
                                                    borderRadius: '50%',
                                                    color: 'white',
                                                    width: '20px',
                                                    height: '20px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                                {saveSuccess && <span style={{ color: 'var(--green)', fontSize: '14px', fontWeight: 500 }}>🚀 Mensaje enviado. ¡Gracias!</span>}
                                <button
                                    onClick={sendSuggestion}
                                    className={`btn ${isSaving ? 'btn-secondary' : 'btn-primary'}`}
                                    disabled={isSaving || !suggestion.details || !suggestion.concept}
                                    style={{ minWidth: '160px' }}
                                >
                                    {isSaving ? 'Enviando...' : (
                                        <>
                                            <Send size={18} />
                                            Enviar Sugerencia
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
