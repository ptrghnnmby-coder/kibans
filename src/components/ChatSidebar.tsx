'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, MessageSquare, X, Minimize2, Maximize2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

interface Message {
    id: number
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export function ChatSidebar() {
    const { data: session } = useSession()
    const [isOpen, setIsOpen] = useState(false)

    const [userName, setUserName] = useState<string>('equipo')

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
            } else if (session?.user?.name) {
                setUserName(session.user.name);
            }
        };
        loadName();
        window.addEventListener('profile-changed', loadName);
        return () => window.removeEventListener('profile-changed', loadName);
    }, [session]);

    const [messages, setMessages] = useState<Message[]>([])
    const [isLoaded, setIsLoaded] = useState(false)

    const fetchHistory = async () => {
        if (!session?.user?.email) return
        try {
            const res = await fetch(`/api/chat/team?chatId=tess@bot`)
            if (res.ok) {
                const data = await res.json()
                const resolved = data.messages.map((m: any) => ({
                    ...m,
                    timestamp: new Date(m.timestamp),
                    role: m.from === 'tess@bot' ? 'assistant' : 'user'
                }))

                if (resolved.length > 0) {
                    setMessages(resolved)
                } else {
                    setMessages([{
                        id: 1,
                        role: 'assistant',
                        content: `Hola ${userName !== 'equipo' ? userName : ''}, ¿en qué te puedo ayudar hoy?`,
                        timestamp: new Date(),
                    }])
                }
            }
        } catch (e) {
            console.error('Error loading chat history:', e)
        } finally {
            setIsLoaded(true)
        }
    }

    // 1. Load from Persistence on mount/session
    useEffect(() => {
        if (session?.user?.email && !isLoaded) {
            fetchHistory()
        }
    }, [session, userName])

    // Listen for open-tess-chat event (from briefing card)
    useEffect(() => {
        const handleOpenChat = (e: Event) => {
            const msg = (e as CustomEvent).detail?.message
            setIsOpen(true)
            if (msg) {
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: Date.now(),
                            role: 'assistant' as const,
                            content: msg,
                            timestamp: new Date(),
                        }
                    ])
                }, 150)
            }
        }
        window.addEventListener('open-tess-chat', handleOpenChat)
        return () => window.removeEventListener('open-tess-chat', handleOpenChat)
    }, [])

    // Removal of localStorage sync effect
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const pathname = usePathname()

    // Layout effect
    useEffect(() => {
        if (isOpen && pathname !== '/chat/equipo') {
            document.body.classList.add('chat-sidebar-open')
        } else {
            document.body.classList.remove('chat-sidebar-open')
        }
        return () => document.body.classList.remove('chat-sidebar-open')
    }, [isOpen, pathname])

    // Auto-scroll
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isOpen])

    // Hide on specific pages
    if (pathname === '/chat/equipo') return null

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

        try {
            // Persist user message
            await fetch('/api/chat/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: userMessage.id.toString(),
                    to: 'tess@bot',
                    content: userMessage.content,
                    timestamp: userMessage.timestamp.toISOString()
                }),
            })
            const userEmail = session?.user?.email;
            // Capturar pathname completo con query params para contexto de ubicación
            const fullPath = typeof window !== 'undefined' ? window.location.pathname + window.location.search : pathname

            // Send the last few messages as history context (max 5)
            const history = messages.slice(-5).map(m => ({
                role: m.role,
                content: m.content
            }))

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    history: history, // Send context history
                    context: fullPath,
                    userEmail
                }),
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
                        to: session?.user?.email, // Assuming direct message between bot and user
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
                content: '⚠️ Tuve un problema al procesar tu mensaje.',
                timestamp: new Date(),
            }
            setMessages((prev) => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const formatContent = (content: string) => {
        return content.split('\n').map((line, i) => {
            const parts = line.split(/(\*\*.*?\*\*)/g)
            return (
                <p key={i} style={{ margin: line === '' ? '0.5em 0' : '0.2em 0' }}>
                    {parts.map((part, j) => {
                        if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={j}>{part.slice(2, -2)}</strong>
                        }
                        return part
                    })}
                </p>
            )
        })
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="chat-toggle-btn"
                title="Consultar a Tess"
                style={{ background: 'var(--accent)', border: 'none', padding: 0 }}
            >
                <div className="chat-avatar-small">
                    <img src="/tess_bot.png" alt="Tess" />
                </div>
            </button>
        )
    }

    return (
        <aside className="chat-sidebar active">
            <div className="chat-header">
                <div className="chat-title-area">
                    <div className="chat-avatar">
                        <img src="/tess_bot.png" alt="Tess" />
                        <div className="status-dot"></div>
                    </div>
                    <div>
                        <h3>Tess</h3>
                        <p>Asistente SMT</p>
                    </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="icon-btn">
                    <Minimize2 size={18} />
                </button>
            </div>

            <div className="chat-messages">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message ${message.role === 'user' ? 'message-user' : 'message-bot'}`}
                        style={{ padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)' }}
                    >
                        <div className="message-content" style={{ fontSize: '13px', lineHeight: '1.5' }}>
                            {formatContent(message.content)}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="message message-bot">
                        <div className="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Consultale a Tess..."
                        disabled={false}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()}>
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </aside>
    )
}
