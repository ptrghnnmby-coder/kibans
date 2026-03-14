"use client"

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
    id: string
    message: string
    type: ToastType
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substr(2, 9)
        setToasts(prev => [...prev, { id, message, type }])
    }, [])

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 10000,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                pointerEvents: 'none'
            }}>
                {toasts.map(toast => (
                    <ToastItem
                        key={toast.id}
                        toast={toast}
                        onClose={() => removeToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used within ToastProvider')
    return context
}

const ToastItem: React.FC<{ toast: Toast; onClose: () => void }> = ({ toast, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000)
        return () => clearTimeout(timer)
    }, [onClose])

    const iconMap = {
        success: <CheckCircle size={18} color="var(--green)" />,
        error: <AlertCircle size={18} color="var(--red)" />,
        info: <Info size={18} color="var(--blue)" />,
        warning: <AlertCircle size={18} color="var(--amber)" />
    }

    const bgMap = {
        success: 'rgba(34, 197, 94, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        info: 'rgba(59, 130, 246, 0.1)',
        warning: 'rgba(245, 158, 11, 0.1)'
    }

    return (
        <div style={{
            background: 'var(--surface-raised)',
            border: `1px solid ${bgMap[toast.type].replace('0.1', '0.2')}`,
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '400px',
            pointerEvents: 'auto',
            animation: 'slideIn 0.3s ease-out forwards',
            backdropFilter: 'blur(10px)'
        }}>
            {iconMap[toast.type]}
            <p style={{ margin: 0, fontSize: '14px', flex: 1, color: 'var(--text)', fontWeight: 500 }}>
                {toast.message}
            </p>
            <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
            >
                <X size={14} />
            </button>
            <style jsx>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
