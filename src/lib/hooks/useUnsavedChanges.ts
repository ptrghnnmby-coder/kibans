'use client'

import { useEffect } from 'react'

/**
 * Hook to warn user about unsaved changes.
 * Handles the 'beforeunload' browser event.
 * Note: Next.js App Router doesn't provide a direct way to intercept 
 * internal navigation with a synchronous window.confirm easily 
 * since version 13+. This hook handles the window/tab closing case.
 */
export function useUnsavedChanges(isDirty: boolean, message = 'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?') {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault()
                e.returnValue = message
                return message
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty, message])
}
