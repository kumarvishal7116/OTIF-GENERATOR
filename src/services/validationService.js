const {
    invoiceSchema
} = require("../schemas/invoiceSchema");

const {
    otifSchema,
    syntheticResponseSchema
} = require("../schemas/otifSchema");

/**
 * Validate invoice extraction data
 */
function validateInvoiceData(data) {
    return invoiceSchema.parse(data);
}

/**
 * Validate OTIF data
 */
function validateOtifData(data) {
    return otifSchema.parse(data);
}

/**
 * Check that all invoice records belong to the same company
 */
function validateSingleCompany(invoiceData) {
    const companyName = invoiceData.company_name?.trim();

    if (!companyName) {
        throw new Error("Company name is required.");
    }

    if (!invoiceData.invoice_records?.length) {
        throw new Error("At least one invoice record is required.");
    }

    return true;
}

function validateSyntheticResponse(data) {

    return syntheticResponseSchema.parse(
        data
    );

}

module.exports = {
    validateInvoiceData,
    validateOtifData,
    validateSingleCompany,
    validateSyntheticResponse
};