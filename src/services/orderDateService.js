function determineOrderDate(invoiceRecord) {

    if (
        invoiceRecord.sales_order_date
    ) {
        return invoiceRecord.sales_order_date;
    }

    if (
        invoiceRecord.customer_po_date
    ) {
        return invoiceRecord.customer_po_date;
    }

    return null;
}


function addOrderDates(invoiceRecords) {

    if (!Array.isArray(invoiceRecords)) {
        throw new Error(
            "Invoice records must be an array."
        );
    }

    return invoiceRecords.map((record) => {

        return {
            ...record,

            order_date:
                determineOrderDate(record)
        };

    });
}


module.exports = {
    determineOrderDate,
    addOrderDates
};