'use client'

import { SessionProvider } from 'next-auth/react'
import { ToastProvider } from './ui/Toast'
import { ThemeProvider } from './ThemeContext'

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <ThemeProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </ThemeProvider>
        </SessionProvider>
    )
}
