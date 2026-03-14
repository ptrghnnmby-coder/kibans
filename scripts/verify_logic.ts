import { validateOperation, parseProducts, ValidationError } from '../src/lib/validation';
import { Operacion } from '../src/lib/sheets-types';

console.log('--- Testing Señor Operaciones Logic ---');

// 1. Test Validation: Missing basic fields
const invalidOp: Partial<Operacion> = { estado: '1. Operación Creada' };
console.log('Test 1 (Missing basic fields):', validateOperation(invalidOp).length > 0 ? 'PASS' : 'FAIL');

// 2. Test Validation: Invalid transition
console.log('Test 2 (Invalid transition):', validateOperation({ estado: '14. Operación Liquidada' }, '1. Operación Creada').length > 0 ? 'PASS' : 'FAIL');

// 3. Test Validation: Missing field for Confirmed state
const confirmedOp: Partial<Operacion> = {
    estado: '1. Operación Creada',
    cliente: 'Test Client',
    exportador: 'Test Exporter'
};
const confirmationErrors = validateOperation(confirmedOp);
console.log('Test 3 (Missing Incoterm for Confirmada):', confirmationErrors.some((e: ValidationError) => e.field === 'incoterm') ? 'PASS' : 'FAIL');

// 4. Test Parsing: Robust product parsing
const rawProducts = ' Product A : 10 : 100 \n Product B:20:200 \n Invalid Line \n';
const parsed = parseProducts(rawProducts);
console.log('Test 4 (Parsing count):', parsed.length === 2 ? 'PASS' : 'FAIL');
console.log('Test 4 (Parsing values):', (parsed[0].qty === 10 && parsed[1].price === 200) ? 'PASS' : 'FAIL');

console.log('--- Verification Complete ---');
