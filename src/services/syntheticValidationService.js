const {
    TARGET_MONTHS
} = require("./monthlyEntryService");


function validateSyntheticEntryRules(
    syntheticEntries,
    syntheticRequirements,
    originalEntries = [],
    allowedParties = [],
    allowedProducts = []
) {

    if (!Array.isArray(syntheticEntries)) {

        throw new Error(
            "Synthetic entries must be an array."
        );

    }


    /*
     * 1. Check total number of synthetic entries.
     */
    const expectedTotal =
        Object.values(
            syntheticRequirements
        ).reduce(
            (sum, count) => sum + count,
            0
        );


    if (
        syntheticEntries.length !==
        expectedTotal
    ) {

        throw new Error(
            `Expected ${expectedTotal} synthetic entries, but received ${syntheticEntries.length}.`
        );

    }


    /*
     * 2. Count synthetic entries month-wise.
     */
    const monthlyCounts = {};


    for (const month of TARGET_MONTHS) {

        monthlyCounts[month] = 0;

    }


    for (const entry of syntheticEntries) {

        if (
            !TARGET_MONTHS.includes(
                entry.delivery_month
            )
        ) {

            throw new Error(
                `Invalid delivery month: ${entry.delivery_month}`
            );

        }


        monthlyCounts[
            entry.delivery_month
        ]++;

    }


    /*
     * 3. Compare generated counts
     *    with backend requirements.
     */
    for (const month of TARGET_MONTHS) {

        const expected =
            syntheticRequirements[month] || 0;

        const actual =
            monthlyCounts[month] || 0;


        if (actual !== expected) {

            throw new Error(
                `Invalid synthetic count for ${month}. Expected ${expected}, received ${actual}.`
            );

        }

    }


    /*
     * 4. Check synthetic invoice numbers
     *    are unique among themselves.
     */
    const invoiceNumbers =
        syntheticEntries.map(
            (entry) =>
                entry.invoice_number
        );


    const uniqueInvoiceNumbers =
        new Set(invoiceNumbers);


    if (
        uniqueInvoiceNumbers.size !==
        invoiceNumbers.length
    ) {

        throw new Error(
            "Synthetic invoice numbers must be unique."
        );

    }


    /*
     * 5. Check synthetic invoice numbers
     *    do not duplicate reference invoices.
     */
    const originalInvoiceNumbers =
        new Set(
            originalEntries
                .map(
                    (entry) =>
                        entry.invoice_number
                )
                .filter(Boolean)
        );


    for (
        const invoiceNumber
        of invoiceNumbers
    ) {

        if (
            originalInvoiceNumbers.has(
                invoiceNumber
            )
        ) {

            throw new Error(
                `Synthetic invoice number already exists in reference data: ${invoiceNumber}`
            );

        }

    }


    /*
     * 6. Validate dates and quantities.
     */
    for (const entry of syntheticEntries) {

        const orderDate =
            new Date(
                entry.order_date
            );

        const plannedDeliveryDate =
            new Date(
                entry.planned_delivery_date
            );

        const invoiceDate =
            new Date(
                entry.invoice_date
            );


        if (
            isNaN(
                orderDate.getTime()
            ) ||
            isNaN(
                plannedDeliveryDate.getTime()
            ) ||
            isNaN(
                invoiceDate.getTime()
            )
        ) {

            throw new Error(
                `Invalid date in synthetic entry: ${entry.invoice_number}`
            );

        }


        /*
         * Order date must be before
         * or equal to planned delivery date.
         */
        if (
            orderDate >
            plannedDeliveryDate
        ) {

            throw new Error(
                `Order date cannot be after planned delivery date: ${entry.invoice_number}`
            );

        }


        /*
         * Invoice date must be on
         * or after order date.
         */
        if (
            invoiceDate <
            orderDate
        ) {

            throw new Error(
                `Invoice date cannot be before order date: ${entry.invoice_number}`
            );

        }


        /*
         * Planned delivery date must
         * belong to delivery month.
         */
        const plannedMonth =
            `${plannedDeliveryDate.getUTCFullYear()}-${String(
                plannedDeliveryDate.getUTCMonth() + 1
            ).padStart(2, "0")}`;


        if (
            plannedMonth !==
            entry.delivery_month
        ) {

            throw new Error(
                `Planned delivery date does not belong to delivery month: ${entry.invoice_number}`
            );

        }


        /*
         * Order quantity must be positive.
         */
        if (
            entry.order_quantity <= 0
        ) {

            throw new Error(
                `Order quantity must be greater than zero: ${entry.invoice_number}`
            );

        }


        /*
         * Invoice quantity must be positive.
         */
        if (
            entry.invoice_quantity <= 0
        ) {

            throw new Error(
                `Invoice quantity must be greater than zero: ${entry.invoice_number}`
            );

        }


        /*
         * Party name must belong to allowed parties list (if defined).
         */
        if (
            allowedParties &&
            allowedParties.length > 0 &&
            !allowedParties.includes(entry.party_name)
        ) {

            throw new Error(
                `Unauthorized party name in synthetic entry: "${entry.party_name}". Allowed parties are: ${allowedParties.join(", ")}`
            );

        }


        /*
         * Product name must belong to allowed products list (if defined).
         */
        if (
            allowedProducts &&
            allowedProducts.length > 0 &&
            !allowedProducts.includes(entry.product_name)
        ) {

            throw new Error(
                `Unauthorized product name in synthetic entry: "${entry.product_name}". Allowed products are: ${allowedProducts.join(", ")}`
            );

        }

    }


    return {

        valid: true,

        monthlyCounts

    };

}


module.exports = {

    validateSyntheticEntryRules

};