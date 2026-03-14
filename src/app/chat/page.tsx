'use client'

export const dynamic = 'force-dynamic'


import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Send, Ship, Sparkles } from 'lucide-react'

interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

const mensajesIniciales: Message[] = [
    {
        id: 1,
        role: 'assistant',
        content: '¡Hola! 👋 Soy Marta, tu Asistente SMT en South Marine Trading.\n\nEstoy lista para ayudarte a que todo fluya con agilidad. ¿Vemos qué hay pendiente hoy?',
        timestamp: new Date(),
    },
]

export default function ChatPage() {
    const { data: session } = useSession()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [userName, setUserName] = useState<string>('equipo')
    const [isInitialLoading, setIsInitialLoading] = useState(true)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadName = () => {
            let localName = null;
            const savedProfile = localStorage.getItem('user-profile');
            if (savedProfile) {
                try {
                    const profile = JSON.parse(savedProfile);
                    if (profile.name) localName = profile.name;
                } catch (e) { }
            }
            if (localName) {
                setUserName(localName);
            }
        };
        loadName();
        window.addEventListener('profile-changed', loadName);
        return () => window.removeEventListener('profile-changed', loadName);
    }, []);

    // Load messages from Persistence
    useEffect(() => {
        const fetchHistory = async () => {
            if (!session?.user?.email) return
            try {
                const res = await fetch(`/api/chat/team?chatId=marta@bot`)
                if (res.ok) {
                    const data = await res.json()
                    const resolved = data.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp),
                        role: m.from === 'marta@bot' ? 'assistant' : 'user'
                    }))

                    if (resolved.length > 0) {
                        setMessages(resolved)
                    } else {
                        setMessages(mensajesIniciales)
                    }
                }
            } catch (e) {
                console.error('Error loading chat history:', e)
            } finally {
                setIsInitialLoading(false)
            }
        }
        fetchHistory()
    }, [session])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || isLoading) return

        const userMessage: Message = {
            id: Date.now(),
            role: 'user',
            content: input,
            timestamp: new Date(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        // Llamada real a la API
        try {
            // Persist user message
            await fetch('/api/chat/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: userMessage.id.toString(),
                    to: 'marta@bot',
                    content: userMessage.content,
                    timestamp: userMessage.timestamp.toISOString()
                }),
            })

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: input, context: '/chat' }),
            })

            const data = await response.json()

            if (response.ok) {
                const assistantMessage: Message = {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: data.content,
                    timestamp: new Date(),
                }

                // Persist assistant message
                await fetch('/api/chat/team', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: assistantMessage.id.toString(),
                        to: session?.user?.email,
                        content: assistantMessage.content,
                        timestamp: assistantMessage.timestamp.toISOString()
                    }),
                })

                setMessages((prev) => [...prev, assistantMessage])
            } else {
                throw new Error(data.error || 'Error en el chat')
            }
        } catch (error) {
            console.error('Chat error:', error)
            const errorMessage: Message = {
                id: Date.now() + 1,
                role: 'assistant',
                content: '⚠️ Tuve un problema al procesar tu mensaje. Por favor intentá de nuevo.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const formatContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            const trimmedLine = line.trim();

            // Títulos (###)
            if (trimmedLine.startsWith('###')) {
                return <h3 key={i} style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    margin: '1em 0 0.5em 0',
                    color: 'var(--primary-600)'
                }}>{trimmedLine.replace('###', '').trim()}</h3>
            }

            // Bullet points
            const isBullet = trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.startsWith('*');
            const contentLine = isBullet ? trimmedLine.substring(1).trim() : line;

            const parts = contentLine.split(/(\*\*.*?\*\*)/g)
            const formattedLine = (
                <span key={i}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>
                        }
                        return part
                    })}
                </span>
            )

            return (
                <div key={i} style={{
                    margin: line === '' ? '0.5em 0' : '0.25em 0',
                    paddingLeft: isBullet ? '1.2em' : '0',
                    position: 'relative'
                }}>
                    {isBullet && <span style={{ position: 'absolute', left: 0 }}>•</span>}
                    {formattedLine}
                </div>
            )
        })
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: 'calc(100vh - 4rem)',
            maxWidth: '900px',
            margin: '0 auto',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--surface-raised)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)'
                }}>
                    <img src="/tess_bot.png" alt="Tess" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>Marta</h1>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Asistente SMT
                    </p>
                </div>
                <span className="badge badge-info" style={{ marginLeft: 'auto' }}>
                    <Sparkles size={12} style={{ marginRight: 4 }} />
                    En línea
                </span>
            </div>

            {/* Messages Container */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                background: 'var(--surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                padding: 'var(--space-6)',
                marginBottom: 'var(--space-4)',
                scrollBehavior: 'smooth'
            }}>
                {messages.length === 0 && !isInitialLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', textAlign: 'center', gap: 'var(--space-4)', opacity: 0.5 }}>
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--surface-sunken)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Ship size={32} />
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 500 }}>No hay mensajes aún.</p>
                    </div>
                )}
                {isInitialLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <div className="spinner"></div>
                    </div>
                )}
                {messages.map((message) => (
                    <div
                        key={message.id}
                        style={{
                            display: 'flex',
                            justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '85%',
                                padding: 'var(--space-4)',
                                borderRadius: 'var(--radius-lg)',
                                background: message.role === 'user'
                                    ? 'var(--accent)'
                                    : 'var(--surface-raised)',
                                color: 'var(--text)',
                                border: message.role === 'user' ? 'none' : '1px solid var(--border)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            }}
                        >
                            <div style={{ fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
                                {formatContent(message.content)}
                            </div>
                            <div style={{
                                fontSize: 'var(--font-size-xs)',
                                color: message.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--gray-400)',
                                marginTop: 'var(--space-2)',
                            }}>
                                {message.timestamp.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribí tu mensaje... (ej: buscá el cliente Midas, creame una proforma)"
                    className="input"
                    style={{
                        flex: 1,
                        padding: 'var(--space-4)',
                        fontSize: 'var(--font-size-base)',
                    }}
                    disabled={false}
                />
                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: 'var(--space-4) var(--space-6)' }}
                    disabled={isLoading || !input.trim()}
                >
                    <Send size={20} />
                </button>
            </form>

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
        </div >
    )
}
