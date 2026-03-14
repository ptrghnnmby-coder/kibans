
import { getOperationById, updateOperation, getCashFlowByOperation, updateCashFlowTransaction } from './src/lib/googleSheets';

async function testSync() {
    const testOpId = 'SMT-2024-001'; // Adjust as needed for a real operation ID
    console.log(`--- Starting Test for Operation ${testOpId} ---`);

    try {
        // 1. Initial State
        const op = await getOperationById(testOpId);
        if (!op) {
            console.error('Test Operation not found');
            return;
        }
        console.log(`Original Freight in Master Input: ${op.freightValue}`);

        const transactions = await getCashFlowByOperation(testOpId);
        const fleteTx = transactions.find(t => t.category === 'Flete');
        console.log(`Original Freight in Cash Flow: ${fleteTx ? fleteTx.amount : 'NOT FOUND'}`);

        // 2. Test Master Input -> Cash Flow
        const newFreightMaster = (parseFloat(op.freightValue || '0') + 100).toString();
        console.log(`\nStep 1: Updating Master Input Freight to ${newFreightMaster}...`);
        await updateOperation(testOpId, { freightValue: newFreightMaster });

        const transactionsAfterMasterUpdate = await getCashFlowByOperation(testOpId);
        const fleteTxAfterMasterUpdate = transactionsAfterMasterUpdate.find(t => t.category === 'Flete');
        console.log(`New Freight in Cash Flow: ${fleteTxAfterMasterUpdate ? fleteTxAfterMasterUpdate.amount : 'NOT FOUND'}`);

        if (fleteTxAfterMasterUpdate && fleteTxAfterMasterUpdate.amount.toString() === newFreightMaster) {
            console.log('✅ Master Input -> Cash Flow sync successful');
        } else {
            console.log('❌ Master Input -> Cash Flow sync failed');
        }

        // 3. Test Cash Flow -> Master Input
        if (fleteTxAfterMasterUpdate) {
            const newFreightCashFlow = fleteTxAfterMasterUpdate.amount + 50;
            console.log(`\nStep 2: Updating Cash Flow Freight to ${newFreightCashFlow}...`);
            await updateCashFlowTransaction(fleteTxAfterMasterUpdate.id, { amount: newFreightCashFlow });

            const opAfterCashFlowUpdate = await getOperationById(testOpId);
            console.log(`New Freight in Master Input: ${opAfterCashFlowUpdate?.freightValue}`);

            if (opAfterCashFlowUpdate?.freightValue === newFreightCashFlow.toString()) {
                console.log('✅ Cash Flow -> Master Input sync successful');
            } else {
                console.log('❌ Cash Flow -> Master Input sync failed');
            }
        }

    } catch (error) {
        console.error('Test failed with error:', error);
    }
}

testSync();
