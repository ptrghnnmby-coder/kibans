'use client'

export const dynamic = 'force-dynamic'


import { useParams } from 'next/navigation'
import { ContactDetailView } from '@/components/ContactDetailView'

export default function ContactoDetailPage() {
    const params = useParams()
    const id = params.id as string

    return (
        <div className="container py-8">
            <ContactDetailView contactId={id} />
        </div>
    )
}
