import fs from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'auth-debug.log');

export function logDebug(step: string, data: any) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${step}] ${JSON.stringify(data, null, 2)}\n-------------------\n`;
    try {
        fs.appendFileSync(LOG_FILE, logEntry);
    } catch (e) {
        // Fallback or ignore if filesystem not accessible (e.g. edge)
        console.error('Failed to write to debug log', e);
    }
}
