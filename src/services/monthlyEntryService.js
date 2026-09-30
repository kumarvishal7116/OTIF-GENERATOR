const MAX_ENTRIES_PER_MONTH = 4;


/**
 * Reporting months from the reference workbook.
 *
 * Beginner version:
 * These months are hardcoded.
 */
const TARGET_MONTHS = [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08"
];


/**
 * Get YYYY-MM month key from a date.
 *
 * Example:
 * 2026-06-18 -> 2026-06
 */
function getMonthKey(dateString) {

    if (!dateString) {
        throw new Error(
            "Invoice date is required for monthly entry calculation."
        );
    }


    const date = new Date(dateString);


    if (isNaN(date.getTime())) {
        throw new Error(
            `Invalid invoice date: ${dateString}`
        );
    }


    const year = date.getUTCFullYear();

    const month =
        String(date.getUTCMonth() + 1)
            .padStart(2, "0");


    return `${year}-${month}`;
}


/**
 * Count original invoice records month-wise.
 */
function calculateMonthlyOriginalEntries(
    originalEntries
) {

    if (!Array.isArray(originalEntries)) {

        throw new Error(
            "Original entries must be an array."
        );

    }


    const monthlyCounts = {};


    for (const entry of originalEntries) {

        const monthKey =
            getMonthKey(
                entry.invoice_date
            );


        if (!monthlyCounts[monthKey]) {

            monthlyCounts[monthKey] = 0;

        }


        monthlyCounts[monthKey]++;

    }


    return monthlyCounts;
}


/**
 * Check whether any month contains
 * more than 4 original entries.
 */
function validateMonthlyOriginalEntries(
    monthlyCounts
) {

    for (
        const [month, count]
        of Object.entries(monthlyCounts)
    ) {

        if (count > MAX_ENTRIES_PER_MONTH) {

            throw new Error(
                `This month has more than 4 original data: ${month}`
            );

        }

    }


    return true;
}


function calculateMonthlySyntheticRequirement() {

    const syntheticRequirements = {};

    for (const month of TARGET_MONTHS) {

        syntheticRequirements[month] =
            MAX_ENTRIES_PER_MONTH;
    }

    return syntheticRequirements;
}

/**
 * Complete month-wise calculation.
 */
function calculateMonthlyRequirements(
    originalEntries
) {

    const monthlyCounts =
        calculateMonthlyOriginalEntries(
            originalEntries
        );


    validateMonthlyOriginalEntries(
        monthlyCounts
    );


    const syntheticRequirements =
        calculateMonthlySyntheticRequirement(
            monthlyCounts
        );


    return {
        monthlyCounts,
        syntheticRequirements
    };
}


module.exports = {
    MAX_ENTRIES_PER_MONTH,
    TARGET_MONTHS,
    getMonthKey,
    calculateMonthlyOriginalEntries,
    validateMonthlyOriginalEntries,
    calculateMonthlySyntheticRequirement,
    calculateMonthlyRequirements
};