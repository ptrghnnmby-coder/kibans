import React, { useState, useEffect } from 'react';
import { X, Loader2, Send, FileText, CheckCircle, AlertTriangle, Coffee, RefreshCw, Download, ExternalLink, Ship } from 'lucide-react';
import { useToast } from './ui/Toast';

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    operationId: string;
    forwarderName: string;
    waLink?: string | null;
}

export default function BookingModal({ isOpen, onClose, operationId, forwarderName, waLink }: BookingModalProps) {
    const [step, setStep] = useState<'idle' | 'generating' | 'preview' | 'sending' | 'success' | 'error'>('idle');
    const [docUrl, setDocUrl] = useState<string | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Form fields — only what can't be auto-filled from the operation
    const [marineInsurance, setMarineInsurance] = useState('NO');
    const [inlandInsurance, setInlandInsurance] = useState('NO');
    const [freightType, setFreightType] = useState('MARITIMO');
    const [notes, setNotes] = useState('');
    // Auto-filled from operation but editable
    const [temperature, setTemperature] = useState('');
    // Auto-filled from operation (not shown in form)
    const [portLoad, setPortLoad] = useState('');
    const [portDest, setPortDest] = useState('');
    const [isLoadingData, setIsLoadingData] = useState(false);

    const { showToast } = useToast();

    // Fetch initial operation data when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep('idle');
            setDocUrl(null);
            setDocId(null);
            setErrorMessage(null);
            fetchOperationData();
        }
    }, [isOpen, operationId]);

    const fetchOperationData = async () => {
        setIsLoadingData(true);
        try {
            const res = await fetch(`/api/operaciones/${operationId}`);
            const data = await res.json();
            if (data.success && data.data) {
                const op = data.data;
                setPortLoad(op.portLoad || '');
                setPortDest(op.puertoDestino || '');
                setTemperature(op.instrucciones_frio || '-18.0 DEGREES CELSIUS');
            }
        } catch (error) {
            console.error('Error fetching operation data:', error);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleGenerate = async () => {
        setStep('generating');
        setErrorMessage(null);
        try {
            // We'll create this endpoint next
            const res = await fetch(`/api/operaciones/${operationId}/fletes/pdf/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    forwarder: forwarderName,
                    marine: marineInsurance,
                    inland: inlandInsurance,
                    freightType,
                    notes,
                    temperature
                })
            });
            const data = await res.json();

            if (data.success) {
                setDocId(data.docId);
                setDocUrl(`https://docs.google.com/document/d/${data.docId}/edit`);
                setStep('preview');
                showToast('Booking Instruction generado', 'success');
            } else {
                throw new Error(data.error || 'Failed to generate Booking Instruction');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message);
            setStep('error');
        }
    };

    const handleSavePdf = async () => {
        if (!docId) return;
        setStep('sending');
        try {
            const fileName = `Booking Instruction ${operationId} - ${forwarderName}`;
            const res = await fetch(`/api/operaciones/${operationId}/fletes/pdf/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docId, forwarder: forwarderName, fileName })
            });
            const data = await res.json();

            if (data.success) {
                setStep('success');
                showToast('Guardado en Google Drive', 'success');
            } else {
                throw new Error(data.error || 'Failed to save PDF');
            }
        } catch (err: any) {
            console.error(err);
            // Si el error viene de emailService (vía API), el mensaje podría ser técnico
            // Sin embargo, getFriendlyErrorMessage es una utilidad de servidor.
            // Para el cliente, intentaremos parsear si es un error de credenciales conocido.
            let friendlyMsg = err.message;
            if (friendlyMsg.includes('535') || friendlyMsg.includes('Authentication failed')) {
                friendlyMsg = "Error de autenticación: La carpeta no se pudo sincronizar o el servicio de correo tiene credenciales inválidas. Por favor contacta a soporte.";
            }
            setErrorMessage(friendlyMsg);
            setStep('error');
        }
    };

    const handleSendEmail = async () => {
        if (!docUrl) return;
        setStep('sending');
        try {
            const res = await fetch(`/api/operaciones/${operationId}/fletes/pdf/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ forwarder: forwarderName, docUrl, docId })
            });
            const data = await res.json();

            if (data.success) {
                setStep('success');
                showToast('Email enviado al Forwarder', 'success');
            } else {
                // Intentamos capturar el error amigable si el backend lo incluyó o procesarlo aquí
                throw new Error(data.error || 'Fallo técnico al enviar el email');
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

    // 1. IDLE STATE (FORM)
    if (step === 'idle') {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-2xl bg-gray-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center bg-[#0a0f18]">
                        <h3 className="text-xl font-bold text-white flex items-center gap-3">
                            <Ship size={24} className="text-blue-400" />
                            Generar Booking Instruction
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-8 overflow-y-auto flex-1">
                        {isLoadingData ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                                <p className="text-gray-400">Cargando datos de la operación...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-5">
                                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                    <p className="text-blue-200 text-sm m-0">
                                        Se generará el Booking para <strong>{forwarderName}</strong> (Operación {operationId}). Los datos del despacho se toman automáticamente de la operación.
                                    </p>
                                </div>

                                {/* Row 1: Temperature + Freight Type */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Temperature</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                            value={temperature}
                                            onChange={e => setTemperature(e.target.value)}
                                            placeholder="-18.0 DEGREES CELSIUS"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tipo de Flete</label>
                                        <select
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                            value={freightType}
                                            onChange={e => setFreightType(e.target.value)}
                                        >
                                            <option value="MARITIMO">Marítimo</option>
                                            <option value="TERRESTRE">Terrestre</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 2: Marine + Inland Insurance */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Marine Insurance</label>
                                        <select
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                            value={marineInsurance}
                                            onChange={e => setMarineInsurance(e.target.value)}
                                        >
                                            <option value="NO">NO</option>
                                            <option value="YES">YES</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Inland Insurance</label>
                                        <select
                                            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                                            value={inlandInsurance}
                                            onChange={e => setInlandInsurance(e.target.value)}
                                        >
                                            <option value="NO">NO</option>
                                            <option value="YES">YES</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Row 3: Notes */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Notes</label>
                                    <textarea
                                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                                        rows={3}
                                        value={notes}
                                        onChange={e => setNotes(e.target.value)}
                                        placeholder="Ej: FREIGHT PREPAID / instrucciones especiales..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="px-8 py-6 bg-gray-900 border-t border-white/10 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold bg-gray-800 text-white hover:bg-gray-700 transition-colors">
                            Cancelar
                        </button>
                        <button onClick={handleGenerate} disabled={isLoadingData} className="px-6 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2">
                            <FileText size={18} />
                            Generar Documento
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 2. GENERATING STATE
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
                    borderRadius: '35px',
                    padding: '56px',
                    maxWidth: '500px',
                    width: '90%',
                    animation: 'fadeIn 0.3s ease-out',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                    textAlign: 'center'
                }}>
                    {/* Icon Container */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '96px',
                            height: '96px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 20px 40px rgba(59, 130, 246, 0.3)'
                        }}>
                            <Coffee size={48} color="white" />
                        </div>
                    </div>

                    {/* Text Content */}
                    <h3 style={{
                        fontSize: '26px',
                        fontWeight: '800',
                        color: 'white',
                        marginBottom: '12px',
                        letterSpacing: '-0.03em'
                    }}>¡Estoy creando tu documento!</h3>
                    <p style={{
                        color: '#9ca3af',
                        marginBottom: '32px',
                        fontSize: '17px',
                        fontWeight: '500'
                    }}>Tomate un matecito mientras lo preparo... 🧉</p>

                    {/* Progress Indicator */}
                    <div style={{
                        height: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '9999px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: '100%',
                            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                            animation: 'progress 1.5s ease-in-out infinite'
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
                        from { opacity: 0; transform: translateY(15px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}</style>
            </div>
        );
    }

    // 3. PREVIEW STATE
    if ((step === 'preview' || step === 'sending') && docUrl) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
                <div className="w-full max-w-6xl bg-gray-900 rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[95vh]">
                    <div className="p-6 bg-[#0a0f18] border-b border-white/10 flex justify-between items-center">
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <div className="p-2 bg-emerald-500/20 rounded-lg">
                                    <CheckCircle size={18} className="text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white">¡Booking Instruction Listo!</h3>
                            </div>
                            <p className="text-gray-400 text-sm ml-11">{forwarderName} • {operationId}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl text-gray-400 transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="flex-1 relative bg-black/20 p-4">
                        <iframe
                            src={docUrl.replace('/edit', '/preview')}
                            className="w-full h-full rounded-2xl border border-white/5 shadow-inner bg-white"
                            title="Booking Preview"
                        />
                        {step === 'sending' && (
                            <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-md flex flex-col items-center justify-center z-10 rounded-2xl">
                                <Loader2 size={48} className="text-blue-500 animate-spin mb-4" />
                                <h4 className="text-lg font-bold text-white mb-2">Procesando...</h4>
                                <p className="text-gray-400 text-sm">Guardando archivo PDF...</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-gray-800/50 border-t border-white/10 flex gap-4 items-center">
                        <button onClick={handleGenerate} className="px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl transition-all border border-white/5 font-bold flex gap-2 items-center">
                            <RefreshCw size={20} /> Re-generar
                        </button>

                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                            <ExternalLink size={20} /> Abrir en Docs
                        </a>

                        <button onClick={handleSavePdf} disabled={step === 'sending'} className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                            <Download size={20} /> Guardar PDF
                        </button>

                        <button onClick={handleSendEmail} disabled={step === 'sending'} className="flex-1 px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2">
                            <Send size={20} /> Enviar Email
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // SUCCESS / ERROR
    if (step === 'success' || step === 'error') {
        const isSuccess = step === 'success';
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
                <div className={`bg-gray-900 rounded-3xl w-full max-w-md p-10 text-center border ${isSuccess ? 'border-emerald-500/20' : 'border-red-500/20'} shadow-2xl`}>
                    <div className={`w-20 h-20 ${isSuccess ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} rounded-2xl flex items-center justify-center mx-auto mb-6`}>
                        {isSuccess ? <CheckCircle size={40} /> : <AlertTriangle size={40} />}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">
                        {isSuccess ? '¡Acción Completada!' : 'Ha ocurrido un error'}
                    </h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">
                        {isSuccess ? 'La operación se realizó correctamente y el documento está listo.' : (errorMessage || 'No se pudo completar la operación.')}
                    </p>
                    <button onClick={onClose} className="w-full py-4 bg-white text-gray-900 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                        Cerrar
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
