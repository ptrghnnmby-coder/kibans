import React, { useState, useEffect } from 'react'
import { X, Loader2, FileText, CheckCircle, AlertTriangle, Coffee, RefreshCw, ShoppingCart, ExternalLink, Plus } from 'lucide-react';
import { PAYMENT_TERMS_OPTIONS, INCOTERMS_OPTIONS } from '../lib/sheets-types';
import { useToast } from './ui/Toast';
import { Button } from './ui/Button';

interface PoModalProps {
    isOpen: boolean;
    onClose: () => void;
    operationId: string;
    supplierName: string;
    docId?: string;
    ocId?: string;
    initialBillToId?: string;
    initialConsigneeId?: string;
    initialNotifyId?: string;
    initialPortLoad?: string;
    initialPortDest?: string;
    initialIncoterm?: string;
    initialPaymentTerms?: string;
    initialFechaEmbarque?: string;
}

export default function PoModal({
    isOpen,
    onClose,
    operationId,
    supplierName,
    docId: initialDocId,
    ocId: initialOcId,
    initialBillToId,
    initialConsigneeId,
    initialNotifyId,
    initialPortLoad,
    initialPortDest,
    initialIncoterm,
    initialPaymentTerms,
    initialFechaEmbarque
}: PoModalProps) {
    const [step, setStep] = useState<'idle' | 'generating' | 'preview' | 'sending' | 'success' | 'error'>('idle');
    const [docUrl, setDocUrl] = useState<string | null>(null);
    const [docId, setDocId] = useState<string | null>(null);
    const [ocId, setOcId] = useState<string | null>(initialOcId || null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [notes, setNotes] = useState<string>('');

    // Field state
    const [billToId, setBillToId] = useState<string>(initialBillToId || '');
    const [consigneeId, setConsigneeId] = useState<string>(initialConsigneeId || '');
    const [notifyId, setNotifyId] = useState<string>(initialNotifyId || '');
    const [portLoad, setPortLoad] = useState<string>(initialPortLoad || '');
    const [portDest, setPortDest] = useState<string>(initialPortDest || '');
    const [incoterm, setIncoterm] = useState<string>(initialIncoterm || '');
    const [paymentTerms, setPaymentTerms] = useState<string>(initialPaymentTerms || '');
    const [fechaEmbarque, setFechaEmbarque] = useState<string>(initialFechaEmbarque || '');

    const { showToast } = useToast();

    const [contacts, setContacts] = useState<any[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setErrorMessage(null);
            setNotes('');

            if (initialDocId) {
                setDocId(initialDocId);
                setDocUrl(`https://docs.google.com/document/d/${initialDocId}/edit`);
                setStep('preview');
            } else {
                setStep('idle');
                setBillToId(initialBillToId || '');
                setConsigneeId(initialConsigneeId || '');
                setNotifyId(initialNotifyId || '');
                setPortLoad(initialPortLoad || '');
                setPortDest(initialPortDest || '');
                setIncoterm(initialIncoterm || '');
                setPaymentTerms(initialPaymentTerms || '');
                setFechaEmbarque(initialFechaEmbarque || '');
                fetchContacts();
            }
        }
    }, [isOpen, operationId, initialDocId]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await fetch('/api/contactos');
            const data = await res.json();
            if (data.success) {
                setContacts(data.data);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Filter contacts by role for each dropdown
    const billToContacts = contacts.filter(c => c.isBillTo === true);
    const consigneeContacts = contacts.filter(c => c.isConsignee === true);
    const notifyContacts = contacts.filter(c => c.isNotify === true);

    const handleGenerate = async () => {
        setStep('generating');
        setErrorMessage(null);
        try {
            const res = await fetch('/api/purchase-orders/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operationId,
                    notes,
                    billToId,
                    consigneeId,
                    notifyId,
                    portLoad,
                    portDest,
                    incoterm: incoterm.trim(),
                    paymentTerms: paymentTerms.trim(),
                    fechaEmbarque
                })
            });
            const data = await res.json();

            if (data.success) {
                setDocId(data.docId);
                setOcId(data.ocId);
                setDocUrl(`https://docs.google.com/document/d/${data.docId}/edit`);
                setStep('preview');

                // Show success toast and maybe parent should refresh data
                showToast('PO Generada y Operación actualizada', 'success');
            } else {
                throw new Error(data.error || 'Fallo al generar la Orden de Compra');
            }
        } catch (err: any) {
            console.error(err);
            let msg = err.message;
            if (msg.includes('535') || msg.includes('Authentication failed')) {
                msg = "Error de conexión: No se pudo contactar con los servicios de Google o hay un problema de credenciales en el servidor.";
            }
            setErrorMessage(msg || 'Error desconocido al generar la PO');
            setStep('error');
        }
    };

    const handleSendEmail = async () => {
        if (!docUrl) return;
        setStep('sending');
        try {
            const res = await fetch('/api/purchase-orders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operationId, docUrl })
            });
            const data = await res.json();

            if (data.success) {
                setStep('success');
                showToast('Email enviado exitosamente', 'success');
            } else {
                throw new Error(data.error || 'Fallo al enviar el email');
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

    // PRE-GENERATION FORM (IDLE)
    if (step === 'idle') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(8px)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{
                    width: '100%',
                    maxWidth: '550px',
                    background: 'var(--surface)',
                    borderRadius: '24px',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-xl)',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <ShoppingCart size={24} className="text-cyan" /> Generar Purchase Order
                        </h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                    </div>

                    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '18px', maxHeight: '70vh', overflowY: 'auto' }}>
                        <p style={{ color: 'var(--text-dim)', margin: 0, fontSize: '15px' }}>
                            Vas a generar la PO para la operación <b>{operationId}</b>. <br />
                            Proveedor: <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>{supplierName}</span>
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Bill To</label>
                                <select
                                    className="input"
                                    value={billToId}
                                    onChange={(e) => setBillToId(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {billToContacts.map(c => <option key={c.id} value={c.id}>{c.id} | {c.empresa}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Consignee</label>
                                <select
                                    className="input"
                                    value={consigneeId}
                                    onChange={(e) => setConsigneeId(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {consigneeContacts.map(c => <option key={c.id} value={c.id}>{c.id} | {c.empresa}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Notify Party</label>
                                <select
                                    className="input"
                                    value={notifyId}
                                    onChange={(e) => setNotifyId(e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {notifyContacts.map(c => <option key={c.id} value={c.id}>{c.id} | {c.empresa}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>ETD (Fecha Embarque)</label>
                                <input
                                    type="date"
                                    className="input"
                                    value={fechaEmbarque}
                                    onChange={(e) => setFechaEmbarque(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Port of Load</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={portLoad}
                                    onChange={(e) => setPortLoad(e.target.value)}
                                    placeholder="Ej. Montevideo, Uruguay"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Port of Destination</label>
                                <input
                                    type="text"
                                    className="input"
                                    value={portDest}
                                    onChange={(e) => setPortDest(e.target.value)}
                                    placeholder="Puerto de llegada"
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Incoterm</label>
                                <select
                                    className="input"
                                    value={INCOTERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(incoterm) ? incoterm : (incoterm === '' ? '' : 'Otros')}
                                    onChange={(e) => {
                                        if (e.target.value === 'Otros') {
                                            setIncoterm(' ');
                                        } else {
                                            setIncoterm(e.target.value);
                                        }
                                    }}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {INCOTERMS_OPTIONS.filter(o => o !== 'Otros').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Otros">Otros (Especificar)</option>
                                </select>
                                {(!INCOTERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(incoterm) && incoterm !== '') && (
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ width: '100%', marginTop: '8px', borderStyle: 'dashed' }}
                                        value={incoterm === ' ' ? '' : incoterm}
                                        onChange={(e) => setIncoterm(e.target.value || ' ')}
                                        placeholder="Especificar..."
                                    />
                                )}
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Payment Terms</label>
                                <select
                                    className="input"
                                    value={PAYMENT_TERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(paymentTerms) ? paymentTerms : (paymentTerms === '' ? '' : 'Otros')}
                                    onChange={(e) => {
                                        if (e.target.value === 'Otros') {
                                            setPaymentTerms(' ');
                                        } else {
                                            setPaymentTerms(e.target.value);
                                        }
                                    }}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {PAYMENT_TERMS_OPTIONS.filter(o => o !== 'Otros').map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                    <option value="Otros">Otros (Especificar)</option>
                                </select>
                                {(!PAYMENT_TERMS_OPTIONS.filter(opt => opt !== 'Otros').includes(paymentTerms) && paymentTerms !== '') && (
                                    <input
                                        type="text"
                                        className="input"
                                        style={{ width: '100%', marginTop: '8px', borderStyle: 'dashed' }}
                                        value={paymentTerms === ' ' ? '' : paymentTerms}
                                        onChange={(e) => setPaymentTerms(e.target.value || ' ')}
                                        placeholder="Especificar..."
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Notas Especiales</label>
                            <textarea
                                className="input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Escribe instrucciones adicionales..."
                                style={{ width: '100%', height: '80px', resize: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                        <Button
                            onClick={handleGenerate}
                            variant="primary"
                            disabled={loadingContacts}
                            leftIcon={<FileText size={18} />}
                        >
                            Generar Documento
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // GENERATING STATE
    if (step === 'generating') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(12px)'
            }}>
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: '32px',
                    padding: '60px',
                    maxWidth: '480px',
                    width: '90%',
                    textAlign: 'center',
                    border: '1px solid var(--border)',
                    animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{ position: 'relative', width: '90px', height: '90px', margin: '0 auto 32px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ShoppingCart size={44} color="white" />
                        </div>
                    </div>
                    <h3 style={{ fontSize: '24px', fontWeight: 'normal', color: 'white', marginBottom: '12px', letterSpacing: '-0.5px' }}>
                        Generando Orden de Compra
                    </h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '16px' }}>
                        Preparando el documento para <b>{supplierName}</b>...
                    </p>
                    <div style={{ height: '4px', backgroundColor: 'var(--surface-raised)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: '40%',
                            background: 'var(--cyan)',
                            borderRadius: '2px',
                            animation: 'progressBar 2s infinite linear'
                        }} />
                    </div>
                </div>
                <style>{`
                    @keyframes progressBar { 0% { transform: translateX(-150%); } 100% { transform: translateX(250%); } }
                    @keyframes pulse { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.05); opacity: 0.8; } 100% { transform: scale(1); opacity: 1; } }
                `}</style>
            </div>
        );
    }

    // PREVIEW STATE
    if ((step === 'preview' || step === 'sending') && docUrl) {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '24px'
            }}>
                <div style={{
                    width: '100%',
                    maxHeight: '92vh',
                    maxWidth: '1200px',
                    height: '100%',
                    background: 'var(--surface)',
                    borderRadius: '28px',
                    boxShadow: 'var(--shadow-xl)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'modalSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                }}>
                    <div style={{
                        padding: '20px 32px',
                        background: 'rgba(10, 15, 24, 0.8)',
                        borderBottom: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '40px', height: '40px', background: 'rgba(0, 243, 255, 0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                                <ShoppingCart size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'white' }}>{ocId || 'Po Generada'}</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-dim)', margin: 0 }}>Documento listo para enviar a {supplierName}</p>
                            </div>
                        </div>
                        <button onClick={onClose} style={{ background: 'var(--surface-hover)', border: 'none', borderRadius: '12px', padding: '10px', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                    </div>

                    <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                        <iframe
                            src={docUrl.replace('/edit', '/preview')}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            title="PO Preview"
                        />
                        {step === 'sending' && (
                            <div style={{
                                position: 'absolute',
                                inset: 0,
                                background: 'rgba(10, 15, 24, 0.8)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10
                            }}>
                                <Loader2 size={48} className="text-cyan animate-spin" style={{ marginBottom: '16px' }} />
                                <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'white', margin: '0 0 8px' }}>Procesando...</h4>
                                <p style={{ color: 'var(--text-muted)', margin: 0 }}>Enviando la Orden de Compra por email</p>
                            </div>
                        )}
                    </div>

                    <div style={{
                        padding: '24px 32px',
                        background: 'rgba(10, 15, 24, 0.95)',
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        gap: '16px',
                        justifyContent: 'flex-end'
                    }}>
                        <Button variant="secondary" onClick={() => setStep('idle')} leftIcon={<RefreshCw size={18} />}>
                            Ajustar Datos
                        </Button>
                        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                            <ExternalLink size={18} /> Abrir Editor <span style={{ opacity: 0.7, fontSize: '11px', marginLeft: '6px' }}>(Google Docs)</span>
                        </a>
                        <Button
                            onClick={handleSendEmail}
                            isLoading={step === 'sending'}
                            variant="primary"
                            className="bg-[#10b981] border-[#10b981] hover:bg-[#0da673]"
                            leftIcon={<ShoppingCart size={18} />}
                        >
                            {step === 'sending' ? 'Enviando...' : 'Enviar por Email'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // SUCCESS STATE
    if (step === 'success') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '440px',
                    padding: '40px',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>¡Orden de Compra Enviada!</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px', lineHeight: 1.5 }}>
                        El email se envió exitosamente a {supplierName}.
                    </p>
                    <Button onClick={onClose} variant="primary" className="w-full">Cerrar</Button>
                </div>
            </div>
        );
    }

    // ERROR STATE
    if (step === 'error') {
        return (
            <div style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: '24px',
                    width: '100%',
                    maxWidth: '440px',
                    padding: '40px',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    textAlign: 'center',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <AlertTriangle size={32} />
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>Fallo en la generación</h3>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '15px', lineHeight: 1.5 }}>{errorMessage}</p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button variant="secondary" onClick={onClose} className="flex-1">Cerrar</Button>
                        <Button variant="primary" onClick={() => setStep('idle')} className="flex-1">Reintentar</Button>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
