/**
 * Utility for robust numerical parsing and formatting across the application.
 * Follows the "Bank Style" logic:
 * - Format: 1.234,56 (dot for thousands, comma for decimals)
 * - Positional parsing: 5000 -> 50,00
 */

/**
 * Parses a value into a safe number using "Bank Logic" (last two digits are decimals).
 * If the input already contains separators, it cleans them and applies the same logic
 * to maintain consistency across formatted and unformatted strings.
 */
export function parseBankStyle(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    // Remove everything that isn't a digit or a minus sign
    let digits = value.replace(/[^0-9-]/g, '');
    if (!digits || digits === '-') return 0;

    // Bank logic: string of digits treated as cents
    const cents = parseInt(digits, 10);
    return cents / 100;
}

/**
 * Standard numeric parser that handles both dot/comma as decimal separators
 * but prioritizes consistency. Used for legacy data or when bank-style isn't explicit.
 */
export function parseNumeric(value: string | number | null | undefined): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;

    let clean = String(value).trim();
    if (!clean) return 0;

    // Remove currency symbols and other non-numeric chars except , . -
    clean = clean.replace(/[^0-9,.-]/g, '');

    const dotCount = (clean.match(/\./g) || []).length;
    const commaCount = (clean.match(/,/g) || []).length;

    // Logic for mixed separators (e.g. 1.234,56 or 1,234.56)
    if (dotCount > 0 && commaCount > 0) {
        if (clean.lastIndexOf('.') > clean.lastIndexOf(',')) {
            // US/Standard Format: 1,234.56 -> 1234.56
            clean = clean.replace(/,/g, '');
        } else {
            // EU/Hispanic Format: 1.234,56 -> 1234.56
            clean = clean.replace(/\./g, '').replace(',', '.');
        }
    } else if (commaCount === 1 && dotCount === 0) {
        // Single comma: 1234,56 -> 1234.56
        clean = clean.replace(',', '.');
    } else if (dotCount === 1 && commaCount === 0) {
        // Single dot: 1.234 or 1.23
        // In es-AR context, X.000 / X.XXX (exactly 3 decimal digits) = thousands separator
        // e.g. "4.000" = 4000, "5.150" = 5150, "169.732" = 169732
        // But "1.82" or "27.72" = decimal — those have 2 or fewer decimal digits
        const parts = clean.split('.')
        if (parts[1] && parts[1].length === 3) {
            // Treat dot as thousands separator
            clean = clean.replace('.', '')
        }
        // else: dot is decimal separator, leave as-is
    } else if (commaCount > 1) {
        // Multiple commas: 1,234,567 -> 1234567
        clean = clean.replace(/,/g, '');
    } else if (dotCount > 1) {
        // Multiple dots: 1.234.567 -> 1234567
        clean = clean.replace(/\./g, '');
    }

    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Formats a number as currency (X.XXX,XX).
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Formats a number consistently as X.XXX,XX without currency symbol.
 */
export function formatNumber(value: number, decimals: number = 2): string {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    }).format(value);
}

/**
 * Formats a raw digit string into "Bank Style" (X.XXX,XX).
 */
export function formatInputBankStyle(digitString: string | number): string {
    const s = String(digitString || '');
    const digits = s.replace(/\D/g, '');
    if (!digits) return '0,00';

    const cents = parseInt(digits, 10);
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(cents / 100);
}
