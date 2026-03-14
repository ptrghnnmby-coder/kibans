'use client'

import { USER_MAP } from '@/lib/sheets-types'

interface UserAvatarProps {
    email: string
    size?: number
    variant?: 'solid' | 'outlined'
    style?: React.CSSProperties
    showInitialFallback?: boolean
}

export function UserAvatar({ email, size = 32, variant = 'solid', style = {}, showInitialFallback = true }: UserAvatarProps) {
    const user = USER_MAP[email.toLowerCase()]
    const isBot = email === 'marta@bot'

    if (isBot) {
        return (
            <div style={{
                width: size,
                height: size,
                borderRadius: '50%',
                overflow: 'hidden',
                border: variant === 'outlined' ? `2px solid var(--accent)` : '1px solid var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: variant === 'outlined' ? 'transparent' : 'var(--surface-raised)',
                ...style
            }}>
                <img src="/martabot.png" alt="Marta" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
        )
    }

    const initial = user?.initial || email.charAt(0).toUpperCase()
    const color = user?.color || 'var(--accent)'

    const baseStyles: React.CSSProperties = {
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        fontSize: `${size * 0.45}px`,
        fontWeight: 800,
        transition: 'all 0.2s',
        ...style
    }

    if (variant === 'outlined') {
        return (
            <div
                className="user-avatar-outlined"
                style={{
                    ...baseStyles,
                    background: 'transparent',
                    border: `2px solid ${color}`,
                    color: color,
                }}
            >
                {initial}
            </div>
        )
    }

    return (
        <div
            className="user-avatar-initial"
            style={{
                ...baseStyles,
                background: color,
                color: '#ffffff',
                border: '1px solid var(--border)',
            }}
        >
            {initial}
        </div>
    )
}


