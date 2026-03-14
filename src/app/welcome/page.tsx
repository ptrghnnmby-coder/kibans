'use client'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function WelcomePage() {
    const router = useRouter()

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100svh',
            background: '#0a0a0b',
            color: '#fff',
            fontFamily: 'Inter, system-ui, sans-serif',
            textAlign: 'center',
            padding: '20px',
        }}>
            <div style={{
                animation: 'fadeIn 1.2s ease-out',
                maxWidth: '500px',
            }}>
                <div style={{ marginBottom: '40px' }}>
                    <Image 
                        src="/tess_bot.png" 
                        alt="Tess" 
                        width={120} 
                        height={120} 
                        style={{ 
                            borderRadius: '50%',
                            border: '3px solid rgba(220, 166, 75, 0.5)',
                            boxShadow: '0 0 40px rgba(220, 166, 75, 0.2)'
                        }}
                    />
                </div>

                <h1 style={{ 
                    fontSize: '3rem', 
                    fontWeight: 700, 
                    marginBottom: '16px',
                    letterSpacing: '-0.02em',
                    background: 'linear-gradient(135deg, #fff 0%, #dca64b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    Bienvenido a Tess
                </h1>

                <p style={{ 
                    fontSize: '1.2rem', 
                    color: 'rgba(255,255,255,0.7)', 
                    marginBottom: '48px',
                    lineHeight: 1.6,
                    fontWeight: 300
                }}>
                    Tu nueva plataforma de eficiencia empresarial <br/> potenciada por Inteligencia Artificial.
                </p>

                <button
                    onClick={() => router.push('/login')}
                    style={{
                        padding: '18px 60px',
                        fontSize: '1.2rem',
                        fontWeight: 600,
                        color: '#000',
                        background: '#dca64b',
                        border: 'none',
                        borderRadius: '50px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: '0 10px 30px rgba(220, 166, 75, 0.3)'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'scale(1.05)'
                        e.currentTarget.style.boxShadow = '0 15px 40px rgba(220, 166, 75, 0.4)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'scale(1)'
                        e.currentTarget.style.boxShadow = '0 10px 30px rgba(220, 166, 75, 0.3)'
                    }}
                >
                    Entrar
                </button>
            </div>

            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                body { margin: 0; background: #0a0a0b; }
            `}</style>
        </div>
    )
}
