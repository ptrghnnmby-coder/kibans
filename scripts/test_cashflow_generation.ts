

import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateAccountingTransactions, getOperationById } from '../src/lib/googleSheets';


async function testCashFlow() {
    const opId = '081-26'; // Target operation
    console.log(`Fetching operation ${opId}...`);
    const op = await getOperationById(opId);

    if (!op) {
        console.error('Operation not found');
        return;
    }

    console.log('Operation found. Injecting mock data for testing...');
    op.etd = '2026-03-01';
    op.eta = '2026-03-15';
    op.purchasePricesRaw = "SEA-HGT-ARG-INT-002:50000:1.50";

    console.log('Generating transactions...');
    const transactions = await generateAccountingTransactions(op);

    console.log('Generated Transactions:');
    transactions.forEach(tx => {
        console.log(`- ${tx.type} | ${tx.category}: $${tx.amount} (${tx.description})`);
    });

    // Validations
    const sales = transactions.filter(t => t.type === 'INGRESO' && t.category === 'Cobro').reduce((s, t) => s + t.amount, 0);
    const purchases = transactions.filter(t => t.type === 'EGRESO' && t.category === 'Pago A').reduce((s, t) => s + t.amount, 0);

    console.log('---------------------------------------------------');
    console.log(`Total Sales Calculated: $${sales}`);
    console.log(`Total Purchases Calculated: $${purchases}`);

    if (sales === 0 || purchases === 0) {
        console.error('FAIL: Totals are still 0.');
    } else {
        console.log('SUCCESS: Totals are greater than 0.');
    }
}

testCashFlow();
