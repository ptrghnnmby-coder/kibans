import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, FileText, CheckCircle, AlertTriangle, Coffee, RefreshCw, Download } from 'lucide-react';

interface ProformaModalProps {
    isOpen: boolean;
    onClose: () => void;
    operationId: string;
    clientName: string; // To show context
    docId?: string; // Optional: if provided, we skip generation and just show the doc
}

export default function ProformaModal({ isOpen, onClose, operationId, clientName, docId: initialDocId }: ProformaModalProps) {
    const [step, setStep] = useState<'idle' | 'configure' | 'generating' | 'preview' | 'sending' | 'success_email' | 'success_pdf' | 'error'>('idle');
    const [docUrl, setDocUrl] = useState<string | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form fields for pre-generation
    const [notasProforma, setNotasProforma] = useState('');
    const [booking, setBooking] = useState('');
    const [containerNumber, setContainerNumber] = useState('');
    const [loadingConfig, setLoadingConfig] = useState(false);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('idle');
            setDocUrl(null);
            setErrorMessage(null);

            if (initialDocId) {
                setDocId(initialDocId);
                setDocUrl(`https://docs.google.com/document/d/${initialDocId}/edit`);
                setStep('preview');
            } else {
                fetchOpDetails();
            }
        }
    }, [isOpen, operationId, initialDocId]);

    const fetchOpDetails = async () => {
        setLoadingConfig(true);
        try {
            const res = await fetch(`/api/operaciones/${operationId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setNotasProforma(data.data.notasProforma || '');
                setBooking(data.data.booking || '');
                setContainerNumber(data.data.containerNumber || '');
            }
            setStep('configure');
        } catch (err: any) {
            console.error('Error fetching op details:', err);
            setStep('configure'); // Proceed anyway
        } finally {
            setLoadingConfig(false);
        }
    };

    const handleGenerate = async () => {
        setStep('generating');
        setErrorMessage(null);
        try {
            const res = await fetch('/api/proformas/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId,
                    notasProforma
                })
            });
            const data = await res.json();

            if (data.success) {
                setDocId(data.docId);
                setDocUrl(data.docUrl); // e.g., https://docs.google.com/document/d/ID/edit
                setStep('preview');
            } else {
                throw new Error(data.error || 'Failed to generate proforma');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message);
            setStep('error');
        }
    };

    const handleSendEmail = async () => {
        if (!docUrl) return;
        setStep('sending');
        try {
            const signature = localStorage.getItem('user-signature') || '';
            const res = await fetch('/api/proformas/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationId, docUrl, signature })
            });
            const data = await res.json();

            if (data.success) {
                setStep('success_email');
            } else {
                throw new Error(data.error || 'Failed to send email');
            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message;
            if (msg.includes('535') || msg.includes('Authentication failed') || msg.includes('BadCredentials')) {
                msg = "Error de Envío: Las credenciales de Gmail (App Password) han caducado o son incorrectas. Es necesario actualizar el .env para reestablecer el servicio.";
            } else if (msg.includes('550')) {
                msg = "Error de Envío: La dirección de correo del destinatario es inválida.";
            }
            setErrorMessage(msg);
            setStep('error');
        }
    };

    if (!isOpen) return null;

    const handleSavePdf = async () => {
        if (!docId || !operationId) return;
        setStep('sending');
        try {
            const fileName = `Proforma ${operationId} - ${clientName}`;
            const res = await fetch('/api/proformas/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId, operationId, fileName })
            });
            const data = await res.json();

            if (data.success) {
                setStep('success_pdf');
            } else {
                throw new Error(data.error || 'Failed to save PDF');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message);
            setStep('error');
        }
    };

    if (!isOpen) return null;

    // Centered Premium Loading State - Using inline styles for guaranteed rendering
    if (step === 'generating') {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(12px)'
            }}>
                <div style={{
                    background: '#111827',
                    borderRadius: '24px',
                    padding: '48px',
                    maxWidth: '450px',
                    width: '90%',
                    animation: 'fadeIn 0.3s ease-out',
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    {/* Icon Container */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                                borderRadius: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Coffee size={40} color="white" />
                            </div>
                        </div>
                    </div>

                    {/* Text Content */}
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{
                            fontSize: '22px',
                            fontWeight: '700',
                            color: 'white',
                            marginBottom: '12px',
                            letterSpacing: '-0.5px'
                        }}>¡Estoy creando tu documento!</h3>
                        <p style={{
                            color: '#9ca3af',
                            marginBottom: '24px',
                            fontSize: '16px'
                        }}>Tomate un matecito mientras lo preparo... 🧉</p>
                    </div>

                    {/* Progress Indicator */}
                    <div style={{
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: '70%',
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            animation: 'progress 2s ease-in-out infinite'
                        }}></div>
                    </div>
                </div>

                <style>{`
                    @keyframes progress {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(0%); }
                        100% { transform: translateX(100%); }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // For the preview state, we want a completely different layout
    if ((step === 'preview' || step === 'sending') && docUrl) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                <div className="w-full max-w-5xl bg-gray-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[90vh]">

                    {/* Header */}
                    <div className="p-6 bg-[#0a0f18] border-b border-white/10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                    <CheckCircle size={18} className="text-blue-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">¡Proforma Generada!</h3>
                            </div>
                            <p className="text-gray-400 text-sm ml-11">Ya podés revisar el documento y enviarlo cuando quieras.</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content / Frame */}
                    <div className="flex-1 relative bg-black/20 p-4">
                        <iframe
                            src={docUrl.replace('/edit', '/preview')}
                            className="w-full h-full rounded-2xl border border-white/5 shadow-inner"
                            title="Proforma Preview"
                        />
                        {step === 'sending' && (
                            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center z-10 rounded-2xl">
                                <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                                <h4 className="text-lg font-bold text-white mb-2">Procesando...</h4>
                                <p className="text-gray-400 text-sm">Preparando el archivo PDF para la carpeta de Drive</p>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 bg-gray-800/50 border-t border-white/10 flex gap-4 items-center">
                        <button
                            onClick={handleGenerate}
                            className="p-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-2xl transition-all border border-white/5"
                            title="Regenerar"
                        >
                            <RefreshCw size={20} />
                        </button>

                        <a
                            href={docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <FileText size={20} className="group-hover:scale-110 transition-transform" />
                            Editar Documento
                        </a>

                        <button
                            onClick={handleSavePdf}
                            disabled={step === 'sending'}
                            className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                            Guardar en PDF
                        </button>

                        <button
                            onClick={handleSendEmail}
                            disabled={step === 'sending'}
                            className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 group"
                        >
                            <Send size={20} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                            Enviar por Email
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Modal with Error or other states
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Generar Proforma</h2>
                        <p className="text-sm text-gray-500">{operationId} • {clientName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden bg-gray-50 relative min-h-[400px]">

                    {step === 'configure' && (
                        <div className="p-8">
                            <div className="mb-8">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">Completar Datos de Proforma</h3>
                                <p className="text-gray-500 text-sm">Asegurate de que estos datos sean correctos. Se guardarán en la operación y aparecerán en el documento.</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Notas de la Proforma</label>
                                    <textarea
                                        className="w-full h-32 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-gray-700"
                                        placeholder="Estas notas aparecerán impresas en la Proforma Invoice..."
                                        value={notasProforma}
                                        onChange={(e) => setNotasProforma(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        onClick={handleGenerate}
                                        disabled={loadingConfig}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition-all shadow-lg active:scale-[0.98]"
                                    >
                                        {loadingConfig ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                                        Generar Documento
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(step === 'sending') && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                            <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
                            <p className="text-gray-600 font-medium">Sending Email...</p>
                            <p className="text-sm text-gray-400">Attaching PDF and sending to client.</p>
                        </div>
                    )}

                    {(step === 'success_email' || step === 'success_pdf') && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {step === 'success_email' ? '¡Email Enviado!' : '¡PDF Guardado!'}
                            </h3>
                            <p className="text-gray-600 mb-6">
                                {step === 'success_email'
                                    ? 'El email fue enviado exitosamente al cliente.'
                                    : 'El PDF fue guardado correctamente en Drive.'}
                            </p>
                            <button onClick={onClose} className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors">
                                Cerrar
                            </button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                                <AlertTriangle size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Algo salió mal</h3>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 max-w-sm">
                                <p className="text-red-800 font-medium text-sm leading-relaxed">
                                    {errorMessage || 'Ocurrió un error inesperado al procesar el documento.'}
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 mb-8">
                                Por favor, probá de nuevo en unos momentos o contactá al soporte técnico si el problema persiste.
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg active:scale-95"
                            >
                                Entendido
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
