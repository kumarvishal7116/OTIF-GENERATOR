function calculateDays(startDate, endDate) {

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
        isNaN(start.getTime()) ||
        isNaN(end.getTime())
    ) {
        throw new Error(
            "Invalid date provided."
        );
    }

    const differenceInMilliseconds =
        end - start;

    return Math.round(
        differenceInMilliseconds /
        (1000 * 60 * 60 * 24)
    );
}


function calculatePlannedLeadDays(
    orderDate,
    plannedDeliveryDate
) {

    return calculateDays(
        orderDate,
        plannedDeliveryDate
    );
}


function calculateActualLeadDays(
    orderDate,
    invoiceDate
) {

    return calculateDays(
        orderDate,
        invoiceDate
    );
}


function calculateOnTimePercentage(
    plannedLeadDays,
    actualLeadDays
) {

    if (actualLeadDays === 0) {
        throw new Error(
            "Actual Lead Days cannot be zero when calculating On Time %."
        );
    }

    return (
        plannedLeadDays /
        actualLeadDays
    );
}


function calculateInFullPercentage(
    invoiceQuantity,
    orderQuantity
) {

    if (orderQuantity <= 0) {
        throw new Error(
            "Order Quantity must be greater than zero."
        );
    }

    return (
        invoiceQuantity /
        orderQuantity
    );
}


function calculateOtifEntry(entry) {

    const plannedLeadDays =
        calculatePlannedLeadDays(
            entry.order_date,
            entry.planned_delivery_date
        );

    const actualLeadDays =
        calculateActualLeadDays(
            entry.order_date,
            entry.invoice_date
        );

    const onTimePercentage =
        calculateOnTimePercentage(
            plannedLeadDays,
            actualLeadDays
        );

    const inFullPercentage =
        calculateInFullPercentage(
            entry.invoice_quantity,
            entry.order_quantity
        );

    return {
        ...entry,

        planned_lead_days:
            plannedLeadDays,

        actual_lead_days:
            actualLeadDays,

        on_time_percentage:
            onTimePercentage,

        in_full_percentage:
            inFullPercentage
    };
}


/*
    Calculate OTIF values
    for all synthetic entries
*/
function calculateOtifEntries(
    entries
) {

    if (
        !Array.isArray(entries) ||
        entries.length === 0
    ) {
        throw new Error(
            "At least one entry is required for OTIF calculation."
        );
    }

    return entries.map(
        (entry) =>
            calculateOtifEntry(entry)
    );
}


/*
    Group calculated entries
    according to delivery month
*/
function groupEntriesByMonth(
    entries
) {

    const monthlyEntries = {};

    for (const entry of entries) {

        const month =
            entry.delivery_month;

        if (!monthlyEntries[month]) {
            monthlyEntries[month] = [];
        }

        monthlyEntries[month].push(
            entry
        );
    }

    return monthlyEntries;
}


/*
    Calculate monthly averages
*/
function calculateMonthlyAverage(
    entries
) {

    if (
        !entries ||
        entries.length === 0
    ) {
        throw new Error(
            "At least one entry is required to calculate monthly average."
        );
    }

    const totalOnTime =
        entries.reduce(
            (sum, entry) =>
                sum +
                entry.on_time_percentage,
            0
        );

    const totalInFull =
        entries.reduce(
            (sum, entry) =>
                sum +
                entry.in_full_percentage,
            0
        );

    return {

        average_on_time_percentage:
            totalOnTime /
            entries.length,

        average_in_full_percentage:
            totalInFull /
            entries.length
    };
}


/*
    Calculate monthly averages
    for all delivery months
*/
function calculateAllMonthlyAverages(
    entries
) {

    const monthlyEntries =
        groupEntriesByMonth(entries);

    const monthlyAverages = {};

    for (
        const [
            month,
            monthEntries
        ]
        of Object.entries(
            monthlyEntries
        )
    ) {

        monthlyAverages[month] =
            calculateMonthlyAverage(
                monthEntries
            );
    }

    return monthlyAverages;
}


module.exports = {

    calculateDays,

    calculatePlannedLeadDays,

    calculateActualLeadDays,

    calculateOnTimePercentage,

    calculateInFullPercentage,

    calculateOtifEntry,

    calculateOtifEntries,

    groupEntriesByMonth,

    calculateMonthlyAverage,

    calculateAllMonthlyAverages

};