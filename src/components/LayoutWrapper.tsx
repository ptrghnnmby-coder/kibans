
'use client'

import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { ChatSidebar } from './ChatSidebar'
import { MobileNav } from './MobileNav'
import { CalculatorButton } from './CalculatorButton'

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Hide sidebars on login page
    const isLoginPage = pathname === '/login'

    if (isLoginPage) {
        return <>{children}</>
    }

    return (
        <div className="app-container">
            <Sidebar />
            <main className="main-content">
                {children}
            </main>
            <ChatSidebar />
            <CalculatorButton />
            <MobileNav />
        </div>
    )
}
