# Financial Data Loading Logic

MartaBot automatically projects financial movements for every operation to minimize manual data entry and ensure cash flow consistency.

## Automatic Triggers
Financial movements are synchronized in the following scenarios:
1. **Operation Creation**: When a new operation is registered.
2. **Proforma Generation**: When a proforma is created or updated.
3. **Manual Sync**: When a user triggers a sync from the Finance tab.

## Calculation Rules

### 1. Income (Cobros)
Movements are generated based on the **Payment Terms** field:
- **[X]% Advance**: Splits the total sale into two movements:
    - **Advance**: Sized at X%, dated on ETD.
    - **Balance**: Sized at (100-X)%, dated on ETA.
- **Other Terms**: Creates a single "Cobro Total" movement dated on ETA (fallback to ETD).

### 2. Expenses (Pagos)
- **Purchase Payment**: A single movement for the total purchase price, dated on ETA (fallback to ETD).
- **Freight (Flete)**: Generated if Incoterm is **FOB**, **CNF**, or **CFR**. 
    - **Amount**: Extracted from the "Freight Value" field.
    - **Due Date**: ETD + 10 days.
- **Courier**: A projected expense for document shipping via DHL/Courier.
    - **Due Date**: ETA - 10 days.

## Data Sources
- **Sales/Purchases**: Calculated from the `Productos` and `Purchase_Prices_Raw` fields (Format: `ID:Qty:Price`).
- **Dates**: Derived from `ETD` (Ship Date) and `ETA` (Arrival Date).

> [!IMPORTANT]
> To ensure correct projections, always maintain the **ETD**, **ETA**, and **Payment Terms** fields updated in the operation details.
