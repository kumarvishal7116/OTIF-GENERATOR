const { z } = require("zod");


const originalEntrySchema = z.object({

    invoice_number: z.string().nullable(),

    invoice_date: z.string().nullable(),

    party_name: z.string(),

    product_name: z.string(),

    invoice_quantity: z.number(),

    unit: z.string().nullable(),

    order_date: z.string().nullable(),

    sales_order_number: z.string().nullable(),

    customer_po_number: z.string().nullable()

});


const syntheticEntrySchema = z.object({

    delivery_month: z.string(),

    order_date: z.string(),

    party_name: z.string(),

    product_name: z.string(),

    order_quantity: z.number().positive(),

    planned_delivery_date: z.string(),

    invoice_number: z.string(),

    invoice_date: z.string(),

    invoice_quantity: z.number().positive(),

    unit: z.string().nullable()

});


const otifSchema = z.object({

    company_name: z.string(),

    original_entries:
        z.array(originalEntrySchema),

    additional_synthetic_entries:
        z.array(syntheticEntrySchema)

});


/*
 * Schema for Gemini's synthetic-data response.
 */
const syntheticResponseSchema = z.object({

    synthetic_entries:
        z.array(syntheticEntrySchema)

});


module.exports = {

    otifSchema,

    originalEntrySchema,

    syntheticEntrySchema,

    syntheticResponseSchema

};