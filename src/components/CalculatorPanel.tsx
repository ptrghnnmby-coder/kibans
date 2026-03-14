import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function CalculatorPanel({ onClose }: { onClose: () => void }) {
    const [expr, setExpr] = useState('');

    const append = (val: string) => setExpr((prev) => prev + val);
    const clear = () => setExpr('');
    const calculate = () => {
        try {
            // eslint-disable-next-line no-eval
            const result = eval(expr.replace(/[^-+*/0-9.]/g, ''));
            setExpr(String(result));
        } catch {
            setExpr('Error');
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // If focused on an input elsewhere, don't interfere
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key;

            if (/[0-9]/.test(key)) {
                append(key);
            } else if (['+', '-', '*', '/'].includes(key)) {
                append(key);
            } else if (key === '.' || key === ',') {
                append('.');
            } else if (key === 'Enter' || key === '=') {
                e.preventDefault();
                calculate();
            } else if (key === 'Backspace') {
                setExpr(prev => prev.slice(0, -1));
            } else if (key === 'Escape') {
                onClose();
            } else if (key.toLowerCase() === 'c') {
                clear();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [expr, onClose]); // Depend on expr to have current state in closures if needed, or use functional updates

    const button = (label: string, onClick: () => void, className = '') => (
        <button className={`calc-btn ${className}`} onClick={onClick}>
            {label}
        </button>
    );

    return (
        <div className="calc-panel">
            <div className="calc-header">
                <span>Calculadora</span>
                <button className="calc-close" onClick={onClose} aria-label="Cerrar calculadora">
                    <X size={16} />
                </button>
            </div>
            <input className="calc-display" readOnly value={expr} />
            <div className="calc-grid">
                {['7', '8', '9', '/'].map((c) => button(c, () => append(c)))}
                {['4', '5', '6', '*'].map((c) => button(c, () => append(c)))}
                {['1', '2', '3', '-'].map((c) => button(c, () => append(c)))}
                {button('0', () => append('0'), 'span-2')}
                {button('.', () => append('.'))}
                {button('C', clear, 'calc-clear')}
                {button('=', calculate, 'calc-eq')}
                {button('+', () => append('+'))}
            </div>
        </div>
    );
}
