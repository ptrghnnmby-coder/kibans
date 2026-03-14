import { Operacion, EstadoOperacion } from './sheets-types';

export interface ValidationError {
    field?: keyof Operacion;
    message: string;
}

export const VALID_SQUENCE: Record<string, string[]> = {
    '1. Operación Creada': ['2. Proforma Enviada', 'Cancelada'],
    '2. Proforma Enviada': ['3. Proforma Aprobada', 'Cancelada'],
    '3. Proforma Aprobada': ['4. Orden de Compra Emitida', 'Cancelada'],
    '4. Orden de Compra Emitida': ['5. Producción / Preparación', 'Cancelada'],
    '5. Producción / Preparación': ['6. Flete en Gestión', 'Cancelada'],
    '6. Flete en Gestión': ['7. Booking Confirmado', 'Cancelada'],
    '7. Booking Confirmado': ['8. Carga Realizada', 'Cancelada'],
    '8. Carga Realizada': ['9. En Tránsito', 'Cancelada'],
    '9. En Tránsito': ['10. Arribada', 'Cancelada'],
    '10. Arribada': ['11. En Revisión de Recepción', 'Cancelada'],
    '11. En Revisión de Recepción': ['12A. Recepción Conforme', '12B. Reclamo Reportado', 'Cancelada'],
    '12A. Recepción Conforme': ['13. Liquidación en Proceso', 'Cancelada'],
    '12B. Reclamo Reportado': ['13. Liquidación en Proceso', 'Cancelada'],
    '13. Liquidación en Proceso': ['14. Operación Liquidada', 'Cancelada'],
    '14. Operación Liquidada': [],
    'Cancelada': []
};

export function validateOperation(op: Partial<Operacion>, currentState?: EstadoOperacion): ValidationError[] {
    const errors: ValidationError[] = [];

    // Basic requirements for any state
    if (!op.cliente) errors.push({ field: 'cliente', message: 'El cliente es obligatorio.' });
    if (!op.exportador) errors.push({ field: 'exportador', message: 'El exportador es obligatorio.' });

    // Transition validation
    if (currentState && op.estado && currentState !== op.estado) {
        const allowedTransitions = VALID_SQUENCE[currentState];
        if (!allowedTransitions.includes(op.estado)) {
            errors.push({
                field: 'estado',
                message: `Transición no permitida: ${currentState} -> ${op.estado}`
            });
        }
    }

    // "3. Proforma Aprobada" requirements (analogous to previously "Confirmada")
    if (op.estado === '3. Proforma Aprobada') {
        if (!op.incoterm) errors.push({ field: 'incoterm', message: 'Incoterm es obligatorio para confirmar.' });
        if (!op.productos) errors.push({ field: 'productos', message: 'Debe haber al menos un producto para confirmar.' });
        if (!op.fechaEmbarque) errors.push({ field: 'fechaEmbarque', message: 'Fecha de embarque estimada es obligatoria.' });
    }

    return errors;
}

/**
 * Robust parser for the "productos" and "purchasePricesRaw" fields.
 * Format: "Product:Qty:Price" or "Product:Price"
 * Separator can be newline or comma (if not used as decimal).
 */
export function parseProducts(raw: string | undefined): { name: string, qty: number, price: number }[] {
    if (!raw) return [];

    // Strategy: 
    // 1. Separate by newline first.
    // 2. For each line, if it contains colons, it might be a single product.
    // 3. If it contains multiple colons and commas, we need to be careful.

    // Most common case in Master Input: "PROD1:10:5.5, PROD2:20:10"
    // We split by comma ONLY if it's followed by something that looks like a new product (contains a colon)
    // or just use a more surgical split.

    const lines: string[] = [];
    const rawLines = raw.split('\n');

    rawLines.forEach(rl => {
        // If the line has multiple colons but also commas, e.g. "P1:1:1.5, P2:2:2.5"
        // We split by comma if the comma is NOT inside a numeric part.
        // Simplified: Split by comma if the next part has a colon.
        const parts = rl.split(/,(?=[^,]*:)/);
        parts.forEach(p => lines.push(p.trim()));
    });

    return lines
        .filter(line => line.length > 0)
        .map(line => {
            const parts = line.split(':');
            if (parts.length < 2) return null;

            const cleanNum = (val: string) => {
                const { parseNumeric } = require('./numbers');
                return parseNumeric(val);
            };

            if (parts.length === 2) {
                return {
                    name: parts[0].trim(),
                    qty: 1,
                    price: cleanNum(parts[1])
                };
            }

            // Assume parts[0] is ID/Name, parts[1] is Qty, parts[2] is Price
            return {
                name: parts[0].trim(),
                qty: cleanNum(parts[1]),
                price: cleanNum(parts[2])
            };
        })
        .filter(p => p !== null) as { name: string, qty: number, price: number }[];
}
