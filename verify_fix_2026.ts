import { getCashFlowByOperation } from './src/lib/googleSheets';

async function main() {
    console.log("Fetching cashflow for 026-26...");
    try {
        const transactions = await getCashFlowByOperation('026-26', true);
        console.log(`=> Found ${transactions.length} transactions for 026-26.`);
        
        console.log("Fetching cashflow for 091-26...");
        const tx2 = await getCashFlowByOperation('091-26', true);
        console.log(`=> Found ${tx2.length} transactions for 091-26.`);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
