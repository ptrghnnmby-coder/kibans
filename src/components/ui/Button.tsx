'use client'

import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger'
    isLoading?: boolean
    leftIcon?: React.ReactNode
    children: React.ReactNode
}

export function Button({ variant = 'primary', isLoading, leftIcon, children, className = '', ...props }: ButtonProps) {
    const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-secondary'

    return (
        <button
            className={`btn ${variantClass} ${className}`}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : leftIcon ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {leftIcon}
                    {children}
                </span>
            ) : (
                children
            )}
        </button>
    )
}
