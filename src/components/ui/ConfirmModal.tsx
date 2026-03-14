import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isProcessing?: boolean;
}

export function ConfirmModal({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    isDestructive = false,
    isProcessing = false
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-md">
                <div className="p-8 bg-[#1e293b] border border-[#2d384d] rounded-2xl shadow-2xl">
                    <h3 className="text-xl font-bold text-[#ececee] mb-3">{title}</h3>
                    <div className="text-[#94a3b8] mb-8 leading-relaxed">
                        {message}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            variant="secondary"
                            onClick={onCancel}
                            disabled={isProcessing}
                            className="hover:bg-[#263148] text-[#94a3b8]"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant={isDestructive ? 'danger' : 'primary'}
                            onClick={onConfirm}
                            isLoading={isProcessing}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
