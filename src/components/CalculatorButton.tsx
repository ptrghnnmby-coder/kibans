'use client'
import { useState, useEffect } from 'react';
import { CalculatorPanel } from './CalculatorPanel';
import { Calculator } from 'lucide-react';

export function CalculatorButton() {
    const [open, setOpen] = useState(false);

    const toggle = () => setOpen(!open);

    // Keyboard shortcut Alt+C to toggle
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                toggle();
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [open]); // Added open as dependency though toggle is stable, cleaner to follow React patterns. 
    // Actually toggle is defined inside the component, so it changes on every render unless memoized. 
    // Let's make it stable or just depend on it.

    return (
        <>
            <button
                className="calc-toggle-btn"
                onClick={toggle}
                title="Calculadora (Alt+C)"
                aria-label="Abrir calculadora"
            >
                <Calculator size={20} />
            </button>
            {open && <CalculatorPanel onClose={toggle} />}
        </>
    );
}
