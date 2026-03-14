'use client'

export const dynamic = 'force-dynamic'


import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ContactForm } from '@/components/ContactForm'

export default function NuevoContactoPage() {

    const handleCreate = async (data: any) => {
        const response = await fetch('/api/contactos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error('Error al crear contacto')
        }
    }

    return (
        <div className="animate-in">
            {/* Header */}
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <Link href="/contactos" className="btn btn-secondary" style={{ padding: '8px' }}>
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="page-title">Nuevo Contacto</h1>
                        <p className="page-subtitle">Agregar un nuevo importador, exportador o productor</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '800px' }}>
                <ContactForm onSubmit={handleCreate} />
            </div>
        </div>
    )
}
