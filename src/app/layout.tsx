import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/Providers'
import { LayoutWrapper } from '@/components/LayoutWrapper'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
    themeColor: '#060d1a',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export const metadata: Metadata = {
    title: 'Tess 2.0 - Sistema de Gestión Comercial',
    description: 'Gestión de contactos, proformas y operaciones de comercio exterior',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Tess',
        startupImage: '/apple-touch-icon.png',
    },
    icons: {
        apple: '/apple-touch-icon.png',
    },
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    console.log('RootLayout rendering')
    return (
        <html lang="es">
            <body>
                <Providers>
                    <LayoutWrapper>
                        {children}
                    </LayoutWrapper>
                </Providers>
                <script dangerouslySetInnerHTML={{
                    __html: `
                    if ('serviceWorker' in navigator) {
                        window.addEventListener('load', function() {
                            navigator.serviceWorker.register('/sw.js').catch(function() {});
                        });
                    }
                `}} />
            </body>
        </html>
    )
}
