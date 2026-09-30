function buildSyntheticGenerationPrompt(
    companyName,
    originalEntries,
    syntheticRequirements
) {

    return `
You are generating synthetic invoice records for an OTIF dataset.

COMPANY:
${companyName}


REFERENCE INVOICE RECORDS:
${JSON.stringify(originalEntries, null, 2)}


SYNTHETIC ENTRY REQUIREMENTS:
${JSON.stringify(syntheticRequirements, null, 2)}


IMPORTANT:

The uploaded invoice records are REFERENCE DATA ONLY.

They are provided only to understand:

- company
- customer
- product
- unit
- realistic quantity ranges
- invoice-number style
- realistic order and delivery patterns
- realistic invoice dates


DO NOT include the original invoice records in the output.

DO NOT copy any original invoice record.

DO NOT reuse any original invoice number.

ALL output records must be newly generated synthetic invoices.


YOUR TASK:

Generate EXACTLY the number of NEW synthetic entries specified
for each target month.


IMPORTANT GENERATION RULES:

1. Generate exactly 4 NEW synthetic entries for each target month.

2. The target months are:

   - 2026-05
   - 2026-06
   - 2026-07
   - 2026-08

3. The final response must contain exactly 16 synthetic entries.

4. Do NOT generate fewer than 16 entries.

5. Do NOT generate more than 16 entries.

6. Do NOT include any original invoice record in the output.

7. Do NOT reuse any original invoice number.

8. Every synthetic invoice must have a unique invoice number.

9. delivery_month must be in YYYY-MM format.

10. order_date must be before or equal to planned_delivery_date.

11. planned_delivery_date must belong to the corresponding delivery_month.

12. invoice_date must be on or after order_date.

13. invoice_quantity must be a positive number.

14. order_quantity must be a positive number.

15. Use the reference invoice records ONLY as a source for realistic values.

16. party_name should be based on the reference invoice data.

17. product_name should be based on the reference invoice data.

18. unit should be based on the reference invoice data.

19. Quantity values should remain realistic compared with the reference invoices.

20. Invoice numbers should follow a realistic style similar to the reference invoices,
    but every generated invoice number must be new and unique.

21. Do not modify or return the original invoice records.

22. Do not calculate:

    - planned lead days
    - actual lead days
    - On Time %
    - In Full %

    These calculations will be performed by the backend.

23. Do not create extra fields.

24. Return ONLY valid JSON.

25. Do NOT return markdown.

26. Do NOT return a code fence.

27. Do NOT include explanations outside the JSON response.


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