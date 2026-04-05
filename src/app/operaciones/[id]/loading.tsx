import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="dashboard-container" style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '80vh',
            gap: 'var(--space-4)'
        }}>
            <div style={{ position: 'relative' }}>
                <Loader2 className="animate-spin text-accent" size={48} />
                <div style={{
                    position: 'absolute',
                    inset: -10,
                    border: '2px solid var(--accent)',
                    borderRadius: '50%',
                    opacity: 0.1,
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
            </div>
            <div style={{ textAlign: 'center' }}>
                <h2 className="label-tess" style={{ marginBottom: 'var(--space-2)' }}>Cargando Detalles</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>
                    Sincronizando con base de datos operativa...
                </p>
            </div>
        </div>
    )
}
