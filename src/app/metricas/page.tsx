import { Suspense } from 'react'
import { LiquidadasAnalytics } from '@/components/LiquidadasAnalytics'
import { Loader2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function MetricasPage() {
    return (
        <div className="dashboard-container animate-in">
            <header className="dashboard-header" style={{ marginBottom: 'var(--space-6)' }}>
                <div>
                    <h1 className="label-marta" style={{ marginBottom: '4px' }}>Métricas</h1>
                    <p className="page-title" style={{ fontSize: 'var(--font-size-2xl)' }}>Análisis de rendimiento y rentabilidad</p>
                </div>
            </header>
            <Suspense fallback={
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh' }}>
                    <Loader2 className="animate-spin text-accent" size={32} />
                </div>
            }>
                <LiquidadasAnalytics />
            </Suspense>
        </div>
    )
}
