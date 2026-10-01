require("dotenv").config();

const fs = require("fs");

const {
    GoogleGenAI
} = require("@google/genai");

const {
    buildSyntheticGenerationPrompt
} = require("./syntheticService");

const {
    validateSyntheticResponse
} = require("./validationService");

const {
    validateSyntheticEntryRules
} = require("./syntheticValidationService");
 
/**
 * Gemini model used by the application.
 */
const GEMINI_MODEL = "gemini-3.5-flash-lite";


/**
 * Create Gemini client.
 */
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


/**
 * Safely parse Gemini JSON response.
 *
 * Gemini may sometimes return JSON inside
 * a Markdown code block.
 */
function parseGeminiJson(responseText) {

    if (!responseText || !responseText.trim()) {

        throw new Error(
            "Gemini returned an empty response."
        );
    }


    let cleanedText = responseText.trim();


    // Remove Markdown JSON code fences
    if (cleanedText.startsWith("```")) {

        cleanedText = cleanedText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

    }


    try {

        return JSON.parse(cleanedText);

    }

    catch (error) {

        throw new Error(
            `Gemini returned invalid JSON: ${error.message}`
        );

    }

}


/**
 * JSON schema for Gemini Call 1.
 *
 * Gemini must return only information
 * extracted from the invoice.
 */
const invoiceExtractionSchema = {

    type: "object",

    additionalProperties: false,

    properties: {

        company_name: {
            type: "string",
            description:
                "Name of the company issuing the invoice."
        },

        company_address: {
            type: ["string", "null"],
            description:
                "Address of the company issuing the invoice (seller/exporter) as shown on the invoice."
        },

        invoice_records: {

            type: "array",

            items: {

                type: "object",
                additionalProperties: false,

                properties: {

                    invoice_number: {
                        type: ["string", "null"],
                        description:
                            "Invoice number exactly as shown on the invoice."
                    },

                    invoice_date: {
                        type: ["string", "null"],
                        description:
                            "Invoice date in YYYY-MM-DD format."
                    },

                    party_name: {
                        type: ["string", "null"],
                        description:
                            "Customer or party name shown on the invoice."
                    },

                    product_name: {
                        type: ["string", "null"],
                        description:
                            "Product or material name shown on the invoice."
                    },

                    invoice_quantity: {
                        type: ["number", "null"],
                        description:
                            "Quantity invoiced for this product line."
                    },

                    unit: {
                        type: ["string", "null"],
                        description:
                            "Unit of quantity, such as KG, MT, PCS, etc."
                    },

                    sales_order_number: {
                        type: ["string", "null"],
                        description:
                            "Sales order number if explicitly present."
                    },

                    sales_order_date: {
                        type: ["string", "null"],
                        description:
                            "Sales order date in YYYY-MM-DD format if explicitly present."
                    },

                    customer_po_number: {
                        type: ["string", "null"],
                        description:
                            "Customer purchase order number if explicitly present."
                    },

                    customer_po_date: {
                        type: ["string", "null"],
                        description:
                            "Customer purchase order date in YYYY-MM-DD format if explicitly present."
                    },

                    order_quantity: {
                        type: ["number", "null"],
                        description:
                            "Order quantity only if explicitly present on the invoice or source document. Never infer it from invoice quantity."
                    }

                },

                required: [
                    "invoice_number",
                    "invoice_date",
                    "party_name",
                    "product_name",
                    "invoice_quantity",
                    "unit",
                    "sales_order_number",
                    "sales_order_date",
                    "customer_po_number",
                    "customer_po_date",
                    "order_quantity"
                ]

            }

        }

    },

    required: [
        "company_name",
        "invoice_records"
    ]

};

const syntheticGenerationSchema = {
    type: "object",

    additionalProperties: false,

    properties: {

        synthetic_entries: {

            type: "array",

            items: {

                type: "object",

                additionalProperties: false,

                properties: {

                    delivery_month: {
                        type: "string"
                    },

                    order_date: {
                        type: "string"
                    },

                    party_name: {
                        type: "string"
                    },

                    product_name: {
                        type: "string"
                    },

                    order_quantity: {
                        type: "number"
                    },

                    planned_delivery_date: {
                        type: "string"
                    },

                    invoice_number: {
                        type: "string"
                    },

                    invoice_date: {
                        type: "string"
                    },

                    invoice_quantity: {
                        type: "number"
                    },

                    unit: {
                        type: "string"
                    }

                },

                required: [
                    "delivery_month",
                    "order_date",
                    "party_name",
                    "product_name",
                    "order_quantity",
                    "planned_delivery_date",
                    "invoice_number",
                    "invoice_date",
                    "invoice_quantity",
                    "unit"
                ]

            }

        }

    },

    required: [
        "synthetic_entries"
    ]

};

const INVOICE_EXTRACTION_PROMPT = `

You are an invoice data extraction system.

Your ONLY task is to extract the exact invoice information
required by the JSON structure provided to you.

DO NOT return any field that is not part of the requested
JSON structure.

DO NOT create additional fields.

DO NOT provide explanations.

DO NOT provide markdown.

DO NOT wrap the response in a code block.

Return ONLY valid JSON.

==================================================
IMPORTANT EXTRACTION RULES
==================================================

1. Extract information ONLY when it is explicitly visible
   on the supplied invoice.

2. Never guess, infer, calculate, or invent information.

3. If a requested field is not present or cannot be
   reliably identified, return null.

4. Keep the original invoice information unchanged
   wherever possible.

5. One invoice must produce one or more
   invoice_records.

6. If one invoice contains multiple product/material
   lines, create one invoice_record for each product line.

7. Do NOT merge information from different invoices.

8. Do NOT create synthetic records.

9. Do NOT calculate OTIF values.

10. Do NOT calculate Planned Lead Days.

11. Do NOT calculate Actual Lead Days.

12. Do NOT calculate On Time %.

13. Do NOT calculate In Full %.

==================================================
COMPANY NAME
==================================================

company_name:

Extract the legal or business name of the company that issued the invoice (seller/exporter).

DO NOT include role or header prefixes such as "Exporter", "Seller", "Supplier", "Vendor", "Consignor", or "From".
For example, if the invoice header says:

"Exporter Hindustan Gum & Chemicals Ltd."

then return ONLY:

"company_name": "Hindustan Gum & Chemicals Ltd."

Do not use the customer/buyer/consignee name as company_name.

==================================================
COMPANY ADDRESS
==================================================

company_address:

Extract the physical address of the company that issued the invoice (seller/exporter) as shown on the invoice.
For example, if the header shows:
"Birla Colony Bhiwani-127021(HR.)"
then return:
"company_address": "Birla Colony Bhiwani-127021(HR.)"

Do not include phone numbers, fax numbers, GSTIN, or Tax IDs in the address.

==================================================
INVOICE NUMBER
==================================================

invoice_number:

Extract the invoice number exactly as shown on the invoice.

Do not confuse it with:

- Purchase Order number
- Sales Order number
- Bill of Lading number
- Container number
- Item code
- HSN code

==================================================
INVOICE DATE
==================================================

invoice_date:

Extract the date associated with the invoice number.

Return the date ONLY in:

YYYY-MM-DD

format.

Do not use:

- Purchase Order date
- Sales Order date
- Bill of Lading date
- Shipping date
- Delivery date

==================================================
PARTY NAME
==================================================

party_name:

Extract the customer/buyer/party associated with the invoice.

For example, if the invoice shows:

"RANTEC CORPORATION"

as the buyer/customer, return:

"party_name": "RANTEC CORPORATION"

Do not use the exporter/company name for party_name.

==================================================
PRODUCT NAME
==================================================

product_name:

Extract the actual product/material name being invoiced.

For example:

"GUAR GUM"
"GUAR GUM POWDER"
"PPN 4000"

Use the product description shown on the invoice.

Do not return:

- Item code
- HSN code
- Container number
- Lot number
- Shipping vessel
- PO number

as product_name.

If both a product code and product description are present,
prefer the human-readable product description.

==================================================
INVOICE QUANTITY
==================================================

invoice_quantity:

Extract the quantity corresponding to the invoiced product.

IMPORTANT:

- Return ONLY the numeric quantity.
- Do NOT include the unit in this field.
- Return a JSON number, NOT a string.

Example:

If the invoice says:

GROSSWT 18.386 MT

return:

"invoice_quantity": 18.386

and:

"unit": "MT"

If gross quantity/weight and net quantity/weight are both
shown, use the GROSS quantity/weight as invoice_quantity.

Do not return:

"18.386 MT"

Do not return:

"18.386"

as a string.

Return:

18.386

as a JSON number.

==================================================
UNIT
==================================================

unit:

Extract the unit associated with invoice_quantity.

Examples:

"KG"
"MT"
"PCS"

Return only the unit.

Example:

"invoice_quantity": 18.386,
"unit": "MT"

==================================================
SALES ORDER NUMBER
==================================================

sales_order_number:

Extract ONLY an explicitly identified Sales Order number.

Do not treat the following as a Sales Order number:

- Customer PO
- Buyer's Order No.
- Invoice number
- Bill of Lading number
- Container number

If a Sales Order number is not explicitly present,
return null.

==================================================
SALES ORDER DATE
==================================================

sales_order_date:

Extract ONLY the date explicitly associated with the
Sales Order.

Return:

YYYY-MM-DD

If Sales Order information is not present,
return null.

==================================================
CUSTOMER PO NUMBER
==================================================

customer_po_number:

Extract the customer's Purchase Order number.

The invoice may label it as:

- PO
- P.O.
- Customer PO
- Purchase Order
- Buyer's Order No.
- Buyer's Order

If the invoice clearly identifies a buyer/customer
order number, extract it here.

Do not confuse it with:

- Invoice number
- Sales Order number
- Bill of Lading number
- Container number

If it is not available, return null.

==================================================
CUSTOMER PO DATE
==================================================

customer_po_date:

Extract the date associated with the customer PO /
Buyer's Order.

Return:

YYYY-MM-DD

If the PO/order date is not available, return null.

==================================================
ORDER QUANTITY
==================================================

order_quantity:

Extract the ordered quantity ONLY if the invoice explicitly
provides an order quantity.

IMPORTANT:

Never calculate or infer order_quantity.

Never assume:

order_quantity = invoice_quantity

If order quantity is not explicitly available,
return null.

Return only a JSON number.

For example:

"order_quantity": 1250

NOT:

"order_quantity": "1250 KG"

==================================================
STRICT OUTPUT FORMAT
==================================================

Return EXACTLY this structure:

{
  "company_name": "string or null",
  "invoice_records": [
    {
      "invoice_number": "string or null",
      "invoice_date": "YYYY-MM-DD or null",
      "party_name": "string or null",
      "product_name": "string or null",
      "invoice_quantity": 0,
      "unit": "string or null",
      "sales_order_number": "string or null",
      "sales_order_date": "YYYY-MM-DD or null",
      "customer_po_number": "string or null",
      "customer_po_date": "YYYY-MM-DD or null",
      "order_quantity": 0
    }
  ]
}

The JSON object may contain ONLY:

company_name
invoice_records

Each invoice_record may contain ONLY:

invoice_number
invoice_date
party_name
product_name
invoice_quantity
unit
sales_order_number
sales_order_date
customer_po_number
customer_po_date
order_quantity

DO NOT RETURN ANY OTHER FIELD.

For example, DO NOT return:

bill_to_name
bill_to_address
ship_to_name
ship_to_address
item_code
item_description
hsn_code
unit_price
line_item_amount
freight_charges
total_invoice_amount
container_number
lot_number
vessel_name
port_of_loading
port_of_discharge
destination
or any other field.

==================================================
FINAL REQUIREMENT
==================================================

Return ONLY the JSON object.

No explanation.
No markdown.
No code fences.
No additional text.
`;


/**
 * Extract invoice information from text.
 *
 * Used for text-based PDFs.
 */
async function extractInvoiceFromText(text) {

    if (!text || !text.trim()) {

        throw new Error(
            "No invoice text available for extraction."
        );

    }


    const response =
        await ai.models.generateContent({

            model: GEMINI_MODEL,

            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text:
                                INVOICE_EXTRACTION_PROMPT +
                                "\n\nINVOICE CONTENT:\n" +
                                text
                        }
                    ]
                }
            ],

            config: {

    responseMimeType: "application/json",

    responseSchema: invoiceExtractionSchema

}

        });


    if (!response.text) {

        throw new Error(
            "Gemini returned an empty response."
        );

    }


    return parseGeminiJson(response.text);

}


/**
 * Extract invoice information from an image.
 *
 * Used for JPG, JPEG and PNG invoices.
 */
async function extractInvoiceFromImage(
    filePath,
    mimeType
) {

    if (!fs.existsSync(filePath)) {

        throw new Error(
            "Invoice image not found."
        );

    }


    const imageData = fs.readFileSync(
        filePath,
        {
            encoding: "base64"
        }
    );


    const response =
        await ai.models.generateContent({

            model: GEMINI_MODEL,

            contents: [
                {
                    role: "user",
                    parts: [

                        {
                            text:
                                INVOICE_EXTRACTION_PROMPT
                        },

                        {
                            inlineData: {
                                mimeType: mimeType,
                                data: imageData
                            }
                        }

                    ]
                }
            ],

            config: {

    responseMimeType: "application/json",

    responseSchema: invoiceExtractionSchema

}

        });


    if (!response.text) {

        throw new Error(
            "Gemini returned an empty response."
        );

    }


    return parseGeminiJson(response.text);

}

async function generateSyntheticEntries(
    companyName,
    originalEntries,
    syntheticRequirements,
    allowedParties = [],
    allowedProducts = []
) {

    const prompt =
        buildSyntheticGenerationPrompt(
            companyName,
            originalEntries,
            syntheticRequirements,
            allowedParties,
            allowedProducts
        );

    // Dynamically constrain party_name and product_name in the schema
    const constrainedSchema = {
        type: "object",
        additionalProperties: false,
        properties: {
            synthetic_entries: {
                type: "array",
                items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                        delivery_month: { type: "string" },
                        order_date: { type: "string" },
                        party_name: {
                            type: "string",
                            ...(allowedParties && allowedParties.length > 0
                                ? { enum: allowedParties }
                                : {})
                        },
                        product_name: {
                            type: "string",
                            ...(allowedProducts && allowedProducts.length > 0
                                ? { enum: allowedProducts }
                                : {})
                        },
                        order_quantity: { type: "number" },
                        planned_delivery_date: { type: "string" },
                        invoice_number: { type: "string" },
                        invoice_date: { type: "string" },
                        invoice_quantity: { type: "number" },
                        unit: { type: "string" }
                    },
                    required: [
                        "delivery_month",
                        "order_date",
                        "party_name",
                        "product_name",
                        "order_quantity",
                        "planned_delivery_date",
                        "invoice_number",
                        "invoice_date",
                        "invoice_quantity",
                        "unit"
                    ]
                }
            }
        },
        required: ["synthetic_entries"]
    };

    const response =
        await ai.models.generateContent({

            model: GEMINI_MODEL,

            contents: prompt,

            config: {

                responseMimeType:
                    "application/json",

                responseSchema:
                    constrainedSchema

            }

        });


    /*
     * Convert Gemini response
     * from JSON text to JavaScript object.
     */
    const parsedResponse =
        parseGeminiJson(
            response.text
        );


    /*
     * Validate response structure
     * and data types using Zod.
     */
    const validatedResponse =
        validateSyntheticResponse(
            parsedResponse
        );


    /*
     * Validate business rules including allowed parties and products.
     */
    validateSyntheticEntryRules(
        validatedResponse.synthetic_entries,
        syntheticRequirements,
        originalEntries,
        allowedParties,
        allowedProducts
    );


    return validatedResponse;
}

module.exports = {
    extractInvoiceFromText,
    extractInvoiceFromImage,
    generateSyntheticEntries,
    parseGeminiJson
};