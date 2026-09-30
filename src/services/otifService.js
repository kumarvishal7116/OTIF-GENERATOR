const {
    calculateOtifEntries,
    groupEntriesByMonth,
    calculateAllMonthlyAverages
} = require("./calculationService");


function calculateOtifData(
    syntheticEntries
) {

    if (
        !Array.isArray(syntheticEntries) ||
        syntheticEntries.length === 0
    ) {
        throw new Error(
            "Synthetic entries are required for OTIF calculation."
        );
    }


    // Calculate OTIF values for every entry
    const calculatedEntries =
        calculateOtifEntries(
            syntheticEntries
        );


    // Group calculated entries by delivery month
    const monthlyEntries =
        groupEntriesByMonth(
            calculatedEntries
        );


    // Calculate monthly averages
    const monthlyAverages =
        calculateAllMonthlyAverages(
            calculatedEntries
        );


    return {

        calculatedEntries,

        monthlyEntries,

        monthlyAverages

    };
}


module.exports = {
    calculateOtifData
};