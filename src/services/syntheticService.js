function buildSyntheticGenerationPrompt(
    companyName,
    originalEntries,
    syntheticRequirements,
    allowedParties = [],
    allowedProducts = []
) {

    const partiesListStr =
        allowedParties && allowedParties.length > 0
            ? JSON.stringify(allowedParties, null, 2)
            : JSON.stringify(
                [...new Set(originalEntries.map((e) => e.party_name).filter(Boolean))],
                null,
                2
            );

    const productsListStr =
        allowedProducts && allowedProducts.length > 0
            ? JSON.stringify(allowedProducts, null, 2)
            : JSON.stringify(
                [...new Set(originalEntries.map((e) => e.product_name).filter(Boolean))],
                null,
                2
            );

    return `
You are generating synthetic invoice records for an OTIF (On-Time In-Full) supply chain dataset.

COMPANY:
${companyName}


ALLOWED PARTY / CUSTOMER NAMES:
${partiesListStr}


ALLOWED PRODUCT NAMES:
${productsListStr}


REFERENCE INVOICE RECORDS:
${JSON.stringify(originalEntries, null, 2)}


SYNTHETIC ENTRY REQUIREMENTS:
${JSON.stringify(syntheticRequirements, null, 2)}


IMPORTANT:

The uploaded invoice records are REFERENCE DATA ONLY.
They provide context for:
- company
- unit of measurement
- realistic quantity ranges
- invoice number style
- order and delivery patterns

DO NOT include the original invoice records in the output.
DO NOT copy any original invoice record verbatim.
DO NOT reuse any original invoice number.
ALL output records must be newly generated synthetic invoices.


YOUR TASK:

Generate EXACTLY the number of NEW synthetic entries specified for each target month:
- 2026-05: 4 entries
- 2026-06: 4 entries
- 2026-07: 4 entries
- 2026-08: 4 entries
Total: exactly 16 synthetic entries.


CRITICAL GENERATION RULES:

1. TARGET MONTHS & COUNTS:
   - Exactly 4 entries for 2026-05.
   - Exactly 4 entries for 2026-06.
   - Exactly 4 entries for 2026-07.
   - Exactly 4 entries for 2026-08.
   - Total must be EXACTLY 16 entries (no fewer, no more).

2. STRICT PARTY / CUSTOMER NAME ENFORCEMENT (NO EXTRA / FABRICATED PARTIES):
   - You MUST ONLY select party_name from the ALLOWED PARTY / CUSTOMER NAMES list above.
   - DO NOT invent, hallucinate, or add any other customer/party names that are not in this list.
   - If the ALLOWED list contains only 1 party name, then ALL 16 synthetic entries MUST use that exact party name.
   - If the ALLOWED list contains multiple party names, distribute the 16 entries among ONLY the names in this list.

3. STRICT PRODUCT NAME ENFORCEMENT (NO EXTRA / FABRICATED PRODUCTS):
   - You MUST ONLY select product_name from the ALLOWED PRODUCT NAMES list above.
   - DO NOT invent, hallucinate, or add any other product names that are not in this list.
   - If the ALLOWED list contains only 1 product name, then ALL 16 synthetic entries MUST use that exact product name.
   - If the ALLOWED list contains multiple product names, distribute the 16 entries among ONLY the names in this list.
   - Use the same unit of measurement as the reference invoice.

4. QUANTITY & IN-FULL REALISM (VARIETY IN FULFILLMENT):
   - Quantities should remain within realistic ranges matching the reference data (e.g. 1,000 to 30,000).
   - In real-world supply chains, most orders are fulfilled in full, but occasional short-shipments occur due to dispatch buffers or packaging limits.
   - In each month (out of 4 entries):
     * 2 to 3 entries should have 100% fulfillment (invoice_quantity == order_quantity).
     * 1 to 2 entries should have slight partial fulfillment (invoice_quantity is 90% to 98% of order_quantity, e.g. order_quantity: 17000, invoice_quantity: 16500; or order_quantity: 10000, invoice_quantity: 9500; or order_quantity: 1500, invoice_quantity: 1400).
     * invoice_quantity must NEVER exceed order_quantity.
     * Both order_quantity and invoice_quantity must be positive numbers.

5. DELIVERY DATES & ON-TIME REALISM (VARIETY IN TIMING):
   - Planned lead time (planned_delivery_date minus order_date) must be realistic: typically 5 to 15 days (NEVER 0 days!).
   - order_date must be strictly before planned_delivery_date.
   - planned_delivery_date must belong to the corresponding delivery_month (e.g. for delivery_month 2026-08, planned_delivery_date must be in August 2026).
   - In real-world supply chains, most deliveries arrive on time, but occasional delays of 1 to 3 days occur.
   - In each month (out of 4 entries):
     * 2 to 3 entries should be delivered exactly on time (invoice_date == planned_delivery_date).
     * 1 to 2 entries should experience a realistic minor dispatch delay (invoice_date is 1 to 3 days AFTER planned_delivery_date, e.g. planned 2026-08-11, invoiced 2026-08-12; or planned 2026-07-12, invoiced 2026-07-14).
     * invoice_date must NEVER be before order_date.

6. INVOICE NUMBERS:
   - Invoice numbers must follow the style/format of the reference invoice (e.g., BH/DI/26-27/0101, BH/DI/26-27/0102, etc.).
   - Every synthetic invoice number must be unique and different from the reference invoice.

7. STRICT OUTPUT FORMAT:
   - Return ONLY valid JSON matching the exact schema below.
   - Do NOT wrap in markdown fences.
   - Do NOT include any explanations outside the JSON response.
   - Do NOT calculate lead days, On Time %, or In Full % (the backend will calculate these).

The response must have exactly this structure:

{
    "synthetic_entries": [
        {
            "delivery_month": "YYYY-MM",
            "order_date": "YYYY-MM-DD",
            "party_name": "string",
            "product_name": "string",
            "order_quantity": 0,
            "planned_delivery_date": "YYYY-MM-DD",
            "invoice_number": "string",
            "invoice_date": "YYYY-MM-DD",
            "invoice_quantity": 0,
            "unit": "string"
        }
    ]
}
`;
}


module.exports = {
    buildSyntheticGenerationPrompt
};