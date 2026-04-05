'use client'

export const dynamic = 'force-dynamic'


import Link from 'next/link'
import { FileText, ShoppingCart, ArrowLeft, Ship, Receipt, Sparkles } from 'lucide-react'
import { ProformasView } from '@/components/ProformasView'
import { OrdenesView } from '@/components/OrdenesView'
import { BookingsView } from '@/components/BookingsView'
import { InvoicesView } from '@/components/InvoicesView'
import DocumentImportWizard from '@/components/DocumentImportWizard'
import { useState } from 'react'
import { useSession } from 'next-auth/react'

export default function DocumentosPage() {
    const { data: session } = useSession()
    const isDemo = (session?.user as any)?.isDemo ?? false
    const [activeTab, setActiveTab] = useState<'proformas' | 'ordenes' | 'bookings' | 'invoices'>('proformas')
    const [isWizardOpen, setIsWizardOpen] = useState(false)

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link href="/" className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="page-title">Gestión de Documentos</h1>
                        <p className="page-subtitle">Central de documentos comerciales</p>
                    </div>
                </div>

                <button 
                    onClick={() => setIsWizardOpen(true)}
                    className="btn btn-primary"
                    style={{ 
                        background: 'linear-gradient(135deg, #dca64b 0%, #b38636 100%)',
                        color: '#000',
                        fontWeight: 800,
                        gap: '8px',
                        boxShadow: '0 4px 15px rgba(220,166,75,0.3)'
                    }}
                >
                    <Sparkles size={16} fill="currentColor" />
                    <span>Importar con IA</span>
                </button>
            </div>

            {/* Tabs - Unified Pill Style */}
            <div style={{
                display: 'flex',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-6)',
                background: 'var(--surface)',
                padding: 'var(--space-1)',
                borderRadius: 'var(--radius-md)',
                width: 'fit-content',
                border: '1px solid var(--border)'
            }}>
                <button
                    onClick={() => setActiveTab('proformas')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 'var(--space-2) var(--space-6)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: activeTab === 'proformas' ? 'white' : 'var(--text-muted)',
                        background: activeTab === 'proformas' ? 'var(--accent)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <FileText size={14} />
                    <span>Proformas</span>
                </button>
                <button
                    onClick={() => setActiveTab('ordenes')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 'var(--space-2) var(--space-6)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: activeTab === 'ordenes' ? 'white' : 'var(--text-muted)',
                        background: activeTab === 'ordenes' ? 'var(--accent)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <ShoppingCart size={14} />
                    <span>Órdenes de Compra</span>
                </button>
                <button
                    onClick={() => setActiveTab('bookings')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 'var(--space-2) var(--space-6)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: activeTab === 'bookings' ? 'white' : 'var(--text-muted)',
                        background: activeTab === 'bookings' ? 'var(--accent)' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Ship size={14} />
                    <span>Bookings</span>
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: 'var(--space-2) var(--space-6)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: activeTab === 'invoices' ? 'white' : 'var(--text-muted)',
                        background: activeTab === 'invoices' ? '#a855f7' : 'transparent',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    <Receipt size={14} />
                    <span>Original Invoice</span>
                </button>
            </div>

            {/* Content */}
            <div className="tab-content">
                {activeTab === 'proformas' && <ProformasView />}
                {activeTab === 'ordenes' && <OrdenesView />}
                {activeTab === 'bookings' && <BookingsView />}
                {activeTab === 'invoices' && <InvoicesView />}
            </div>

            <DocumentImportWizard 
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                isDemo={isDemo}
            />
        </div>
    )
}
