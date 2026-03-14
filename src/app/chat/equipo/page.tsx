'use client'

export const dynamic = 'force-dynamic'


import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { USER_MAP } from '@/lib/sheets-types'
import { Send, MessageSquare, Hash, ChevronLeft } from 'lucide-react'
import { UserAvatar } from '@/components/ui/UserAvatar'

export default function ChatComponent() {
    const { data: session } = useSession()
    const [selectedId, setSelectedId] = useState<string>('group@democompany')
    // ... Restoring real initial state
    const [chats, setChats] = useState<Record<string, any[]>>({})
    const [input, setInput] = useState('')
    const [isLoadingAI, setIsLoadingAI] = useState(false)
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
    const [isMobile, setIsMobile] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const isDemo = session?.user?.email === 'demo@southmarinetrading.com'

    // Only inject fake chats if it's the demo account
    useEffect(() => {
        if (isDemo) {
            setChats({
                'group@democompany': [
                    { id: 'm1', from: 'carlosp@empresa.com', content: '¡Buenos días equipo! ¿Cómo venimos con las cargas de la semana?', timestamp: new Date(Date.now() - 7200000).toISOString() },
                    { id: 'm2', from: 'luciag@empresa.com', content: 'Revisando los bookings de Hapag-Lloyd, todo en orden por ahora.', timestamp: new Date(Date.now() - 3600000).toISOString() },
                    { id: 'm3', from: 'me', content: 'Excelente. Recuerden que a las 15hs tenemos call con el cliente de Londres.', timestamp: new Date(Date.now() - 1500000).toISOString() },
                ],
                'carlosp@empresa.com': [
                    { id: 'c1', from: 'carlosp@empresa.com', content: 'Por favor no te olvides de confirmar el pago del anticipo de la op 045.', timestamp: new Date(Date.now() - 86400000).toISOString() },
                    { id: 'c2', from: 'me', content: 'Sí, ya envié el SWIFT al banco. Recién lo procesan.', timestamp: new Date(Date.now() - 80000000).toISOString() },
                ],
                'luciag@empresa.com': [
                    { id: 'l1', from: 'me', content: 'Lucía, ¿qué naviera recomiendas para la ruta a Valencia?', timestamp: new Date(Date.now() - 150000).toISOString() },
                    { id: 'l2', from: 'luciag@empresa.com', content: 'Últimamente MSC está con mejores tiempos de tránsito.', timestamp: new Date(Date.now() - 60000).toISOString() }
                ],
                'martinm@empresa.com': [
                    { id: 'f1', from: 'martinm@empresa.com', content: 'Adjunto el reporte de cash flow de este mes.', timestamp: new Date(Date.now() - 40000000).toISOString() },
                    { id: 'f2', from: 'martinm@empresa.com', content: 'Los cobros de Europa vienen con algo de retraso por los feriados.', timestamp: new Date(Date.now() - 39000000).toISOString() }
                ]
            });
        }
    }, [isDemo]);


    const ROOMS = [
        { id: 'group@democompany', name: 'Demo Company Group', type: 'room', role: 'Canal General', isBot: false, avatar: null, color: 'var(--border-light)' }
    ]

    // Real colleagues loaded from USER_MAP
    const realColleagues = Object.entries(USER_MAP)
        .filter(([email]) => !['demo@southmarinetrading.com', 'info@southmarinetrading.com'].includes(email))
        .map(([email, info]: any) => ({
            id: email,
            name: info.name,
            role: info.role,
            avatar: info.avatar,
            color: info.color,
            isBot: email === 'marta@bot',
            type: 'direct'
        }))

    const fakeColleagues = [
        { id: 'carlosp@empresa.com', name: 'Carlos Pérez', role: 'Gerente Comercial', isBot: false, type: 'direct', avatar: null, color: 'var(--cyan)' },
        { id: 'luciag@empresa.com', name: 'Lucía Gómez', role: 'Logística', isBot: false, type: 'direct', avatar: null, color: 'var(--purple)' },
        { id: 'martinm@empresa.com', name: 'Martín Méndez', role: 'Finanzas', isBot: false, type: 'direct', avatar: null, color: 'var(--orange)' },
        { id: 'valeriao@empresa.com', name: 'Valeria Ortiz', role: 'Ventas', isBot: false, type: 'direct', avatar: null, color: 'var(--amber)' },
        { id: 'diegos@empresa.com', name: 'Diego Sánchez', role: 'Operaciones', isBot: false, type: 'direct', avatar: null, color: 'var(--green)' }
    ]

    const colleagues = isDemo ? fakeColleagues : realColleagues;

    const directContacts = [
        { id: 'marta@bot', name: 'Marta', role: 'Asistente SMT', isBot: true, type: 'direct', avatar: '/martabot.png', color: 'var(--accent)' },
        ...colleagues.filter(c => c.id !== 'marta@bot')
    ]

    const allChats = [...ROOMS, ...directContacts]
    const activeChat = allChats.find(c => c.id === selectedId)

    // Derived messages state
    const messages = chats[selectedId] || []

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const fetchMessages = async (chatId: string) => {
        if (isDemo && chatId !== 'marta@bot') {
            setIsInitialLoading(false);
            return;
        }
        try {
            const res = await fetch(`/api/chat/team?chatId=${chatId}`)
            if (res.ok) {
                const data = await res.json()
                const formatted = data.messages.map((m: any) => ({
                    ...m,
                    from: m.from === session?.user?.email ? 'me' : m.from
                }))
                setChats(prev => ({ ...prev, [chatId]: formatted }))
            }
        } catch (err) {
            console.error("Error fetching messages:", err)
        } finally {
            setIsInitialLoading(false)
        }
    }

    useEffect(() => {
        if (!session?.user?.email) return
        fetchMessages(selectedId)
        const interval = setInterval(() => fetchMessages(selectedId), 10000)
        return () => clearInterval(interval)
    }, [selectedId, session])

    const handleSelectChat = (id: string) => {
        setSelectedId(id)
        if (isMobile) setMobileView('chat')
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || !selectedId || !session?.user?.email) return

        const tempId = Date.now().toString()
        const userMsg = { id: tempId, from: 'me', to: selectedId, content: input, timestamp: new Date().toISOString() }

        setChats(prev => ({ ...prev, [selectedId]: [...(prev[selectedId] || []), userMsg] }))
        const sentInput = input
        setInput('')

        try {
            await fetch('/api/chat/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: selectedId, content: sentInput })
            })
        } catch (err) { console.error("Error persisting message:", err) }

        if (selectedId === 'marta@bot') {
            setIsLoadingAI(true)
            try {
                const res = await fetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: sentInput }) })
                const data = await res.json()
                const botMsg = { id: Date.now().toString(), from: 'marta@bot', to: session.user!.email!, content: data.content, timestamp: new Date().toISOString() }
                await fetch('/api/chat/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: botMsg.id, to: session.user!.email!, content: botMsg.content }) })
                setChats(prev => ({ ...prev, ['marta@bot']: [...(prev['marta@bot'] || []), botMsg] }))
            } catch (err) { console.error("Error en chat:", err) }
            finally { setIsLoadingAI(false) }
        }
    }

    const showSidebar = !isMobile || mobileView === 'list'
    const showChat = !isMobile || mobileView === 'chat'

    return (
        <div className="animate-in chat-page-layout">
            {/* ===== SIDEBAR (Lista de chats) ===== */}
            {showSidebar && (
                <div className="chat-page-sidebar card">
                    {/* Header */}
                    <div style={{
                        padding: '16px 16px 12px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface-raised)',
                    }}>
                        <h2 style={{
                            fontSize: '18px', fontWeight: 800,
                            color: 'var(--text)', margin: 0,
                            letterSpacing: '-0.3px'
                        }}>Mensajes</h2>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {/* CANALES */}
                        <div style={{ padding: '12px 16px 4px' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 800,
                                color: 'var(--text-dim)', letterSpacing: '1.2px',
                                textTransform: 'uppercase'
                            }}>Canales</span>
                        </div>
                        {ROOMS.map(room => {
                            const isActive = selectedId === room.id
                            return (
                                <div
                                    key={room.id}
                                    onClick={() => handleSelectChat(room.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '10px 16px',
                                        cursor: 'pointer',
                                        background: isActive ? 'var(--accent-soft)' : 'transparent',
                                        borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                                        transition: 'all 0.15s',
                                    }}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: '12px',
                                        background: isActive ? 'var(--accent)' : 'var(--surface-raised)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isActive ? '#fff' : 'var(--accent)',
                                        border: `1px solid ${isActive ? 'transparent' : 'var(--border)'}`,
                                        flexShrink: 0,
                                    }}>
                                        <Hash size={18} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{
                                            fontSize: '14px', fontWeight: 700,
                                            color: isActive ? 'var(--accent)' : 'var(--text)',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>{room.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '1px' }}>Canal general</div>
                                    </div>
                                </div>
                            )
                        })}

                        {/* EQUIPO */}
                        <div style={{ padding: '16px 16px 4px', marginTop: '4px' }}>
                            <span style={{
                                fontSize: '10px', fontWeight: 800,
                                color: 'var(--text-dim)', letterSpacing: '1.2px',
                                textTransform: 'uppercase'
                            }}>Mi Equipo</span>
                        </div>
                        {directContacts.map((contact, idx) => {
                            const isActive = selectedId === contact.id
                            return (
                                <div key={contact.id}>
                                    <div
                                        onClick={() => handleSelectChat(contact.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '10px 16px',
                                            cursor: 'pointer',
                                            background: isActive ? 'var(--accent-soft)' : 'transparent',
                                            borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ position: 'relative', flexShrink: 0 }}>
                                            <UserAvatar
                                                email={contact.id}
                                                size={40}
                                                style={{
                                                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                                                    borderRadius: '50%',
                                                }}
                                            />
                                            {/* Online dot */}
                                            {contact.isBot && (
                                                <div style={{
                                                    position: 'absolute', bottom: 0, right: 0,
                                                    width: 10, height: 10,
                                                    background: 'var(--green)',
                                                    borderRadius: '50%',
                                                    border: '2px solid var(--surface)',
                                                }} />
                                            )}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: '14px', fontWeight: isActive ? 700 : 600,
                                                color: isActive ? 'var(--accent)' : 'var(--text)',
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>{contact.name}</div>
                                            <div style={{
                                                fontSize: '11px',
                                                color: contact.isBot ? 'var(--accent)' : 'var(--text-dim)',
                                                marginTop: '1px',
                                                fontWeight: contact.isBot ? 600 : 400,
                                            }}>{contact.role}</div>
                                        </div>
                                    </div>
                                    {idx < directContacts.length - 1 && (
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '0 16px', opacity: 0.5 }} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ===== CHAT PANEL ===== */}
            {showChat && (
                <div className="card chat-panel">
                    {/* Header */}
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface-raised)', flexShrink: 0 }}>
                        {/* Mobile back button */}
                        {isMobile && (
                            <button
                                onClick={() => setMobileView('list')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', fontWeight: 600, padding: '4px 0' }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        {activeChat ? (
                            <>
                                {activeChat.type === 'room' ? (
                                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                                        <Hash size={20} />
                                    </div>
                                ) : (
                                    <UserAvatar email={activeChat.id} size={40} style={{ border: `2px solid ${activeChat.color || 'var(--border-light)'}`, flexShrink: 0 }} />
                                )}
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>{activeChat.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {activeChat.type === 'room' ? 'Canal General' : activeChat.role}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div style={{ color: 'var(--text-dim)' }}>Selecciona un chat</div>
                        )}
                    </div>

                    {/* Messages */}
                    <div className="chat-messages-area" style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {messages.length === 0 && !isInitialLoading && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', textAlign: 'center', gap: '12px', opacity: 0.5 }}>
                                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <MessageSquare size={28} />
                                </div>
                                <p style={{ fontSize: '14px', fontWeight: 500 }}>No hay mensajes aún.</p>
                            </div>
                        )}
                        {isInitialLoading && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <div className="spinner" />
                            </div>
                        )}
                        {messages.map(m => (
                            <div key={m.id} style={{
                                alignSelf: m.from === 'me' ? 'flex-end' : 'flex-start',
                                background: m.from === 'me' ? 'var(--accent)' : 'var(--surface-raised)',
                                padding: '10px 14px',
                                borderRadius: m.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                border: m.from === 'me' ? 'none' : '1px solid var(--border)',
                                color: m.from === 'me' ? '#fff' : 'var(--text)',
                                maxWidth: '78%',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
                            }}>
                                {activeChat?.type === 'room' && m.from !== 'me' && (
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: m.from === 'me' ? 'rgba(255,255,255,0.7)' : 'var(--accent)', marginBottom: '3px', textTransform: 'uppercase' }}>
                                        {colleagues.find(c => c.id === m.from)?.name || m.from?.split('@')[0]}
                                    </div>
                                )}
                                <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                                    {m.content.split('\n').map((line: string, i: number) => {
                                        const parts = line.split(/(\*\*.*?\*\*)/g)
                                        return (
                                            <span key={i} style={{ display: 'block', minHeight: line === '' ? '0.5em' : 'auto' }}>
                                                {parts.map((part, j) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <strong key={j}>{part.slice(2, -2)}</strong>
                                                    }
                                                    return part
                                                })}
                                            </span>
                                        )
                                    })}
                                </div>
                                <div style={{ fontSize: '9px', textAlign: 'right', marginTop: '3px', opacity: 0.6 }}>
                                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        ))}
                        {isLoadingAI && <div className="spinner" style={{ alignSelf: 'center', margin: '16px' }} />}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface-raised)', flexShrink: 0 }}>
                        <div className="search-bar" style={{ padding: '4px 4px 4px 14px', background: 'var(--bg)', gap: '8px' }}>
                            <input
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                placeholder={`Mensaje a ${activeChat?.name || '...'}`}
                                style={{ fontSize: '14px', height: '42px' }}
                                autoComplete="off"
                            />
                            <button type="submit" className="btn btn-primary" style={{ height: '42px', width: '42px', borderRadius: 'var(--radius-md)', flexShrink: 0 }}>
                                <Send size={17} />
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <style jsx>{`
                .chat-page-layout {
                    height: calc(100vh - 130px);
                    display: flex;
                    gap: 16px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .chat-page-sidebar {
                    width: 280px;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    flex-shrink: 0;
                    position: relative !important;
                    transform: none !important;
                }
                .chat-panel {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 0;
                    overflow: hidden;
                    min-width: 0;
                }
                @media (max-width: 768px) {
                    .chat-page-layout {
                        height: calc(100dvh - 65px - 56px);
                        gap: 0;
                        margin: -16px;
                    }
                    .chat-page-sidebar {
                        width: 100%;
                        border-radius: 0;
                        border: none;
                    }
                    .chat-panel {
                        width: 100%;
                        border-radius: 0;
                        border: none;
                    }
                }
            `}</style>
        </div>
    )
}
