const { z } = require("zod");

const invoiceRecordSchema = z.object({
    invoice_number: z.string().nullable(),
    invoice_date: z.string().nullable(),

    party_name: z.string().nullable(),

    product_name: z.string().nullable(),

    invoice_quantity: z.number().nullable(),

    unit: z.string().nullable(),

    sales_order_number: z.string().nullable(),
    sales_order_date: z.string().nullable(),

    customer_po_number: z.string().nullable(),
    customer_po_date: z.string().nullable(),

    order_quantity: z.number().nullable()
});

const invoiceSchema = z.object({
    company_name: z.string(),

    company_address: z.string().nullable().optional(),

    invoice_records: z.array(invoiceRecordSchema).min(1)
});

module.exports = {
    invoiceSchema,
    invoiceRecordSchema
};