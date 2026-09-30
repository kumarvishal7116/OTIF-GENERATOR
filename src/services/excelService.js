const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");


const MONTH_ROW_MAP = {
    "2026-08": {
        dataRows: [47, 48, 49, 50],
        averageRow: 51
    },

    "2026-07": {
        dataRows: [52, 53, 54, 55],
        averageRow: 56
    },

    "2026-06": {
        dataRows: [57, 58, 59, 60],
        averageRow: 61
    },

    "2026-05": {
        dataRows: [62, 63, 64, 65],
        averageRow: 66
    }
};


const TARGET_MONTHS = [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08"
];


function convertToExcelDate(dateString) {

    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
        throw new Error(
            `Invalid date: ${dateString}`
        );
    }

    return date;
}


function validateCalculatedEntries(
    calculatedEntries
) {

    if (
        !Array.isArray(calculatedEntries)
    ) {
        throw new Error(
            "Calculated entries must be an array."
        );
    }

    if (
        calculatedEntries.length !== 16
    ) {
        throw new Error(
            `Expected 16 calculated entries, but received ${calculatedEntries.length}.`
        );
    }


    for (
        const month of TARGET_MONTHS
    ) {

        const entries =
            calculatedEntries.filter(
                (entry) =>
                    entry.delivery_month === month
            );

        if (entries.length !== 4) {

            throw new Error(
                `${month} must contain exactly 4 entries.`
            );
        }
    }
}


function writeSourceData(
    worksheet,
    rowNumber,
    entry
) {

    /*
        The template stores the
        underlying invoice data
        in columns O:W.
    */

    worksheet.getCell(
        `O${rowNumber}`
    ).value =
        convertToExcelDate(
            entry.delivery_month + "-01"
        );

    worksheet.getCell(
        `P${rowNumber}`
    ).value =
        convertToExcelDate(
            entry.order_date
        );

    worksheet.getCell(
        `Q${rowNumber}`
    ).value =
        entry.party_name;

    worksheet.getCell(
        `R${rowNumber}`
    ).value =
        entry.product_name;

    worksheet.getCell(
        `S${rowNumber}`
    ).value =
        entry.order_quantity;

    worksheet.getCell(
        `T${rowNumber}`
    ).value =
        convertToExcelDate(
            entry.planned_delivery_date
        );

    worksheet.getCell(
        `U${rowNumber}`
    ).value =
        entry.invoice_number;

    worksheet.getCell(
        `V${rowNumber}`
    ).value =
        convertToExcelDate(
            entry.invoice_date
        );

    worksheet.getCell(
        `W${rowNumber}`
    ).value =
        entry.invoice_quantity;
}


function populateMonth(
    worksheet,
    month,
    entries
) {

    const rowInfo =
        MONTH_ROW_MAP[month];

    if (!rowInfo) {

        throw new Error(
            `No Excel row mapping found for ${month}.`
        );
    }


    if (entries.length !== 4) {

        throw new Error(
            `${month} must contain exactly 4 entries.`
        );
    }


    for (
        let index = 0;
        index < entries.length;
        index++
    ) {

        const rowNumber =
            rowInfo.dataRows[index];

        writeSourceData(
            worksheet,
            rowNumber,
            entries[index]
        );
    }
}


async function generateOtifExcel(
    calculatedEntries,
    templatePath,
    outputPath
) {

    validateCalculatedEntries(
        calculatedEntries
    );


    if (
        !fs.existsSync(templatePath)
    ) {

        throw new Error(
            `Excel template not found: ${templatePath}`
        );
    }


    const workbook =
        new ExcelJS.Workbook();


    await workbook.xlsx.readFile(
        templatePath
    );


    const worksheet =
        workbook.getWorksheet(
            "29,30 - OTIF"
        );


    if (!worksheet) {

        throw new Error(
            'Worksheet "29,30 - OTIF" not found in the Excel template.'
        );
    }


    /*
        Populate each month.
    */

    for (
        const month of TARGET_MONTHS
    ) {

        const monthEntries =
            calculatedEntries.filter(
                (entry) =>
                    entry.delivery_month === month
            );


        populateMonth(
            worksheet,
            month,
            monthEntries
        );
    }


    /*
        Tell Excel to recalculate
        formulas when the workbook
        is opened.
    */

    workbook.calculation = {
        fullCalcOnLoad: true,
        forceFullCalc: true,
        calcMode: "auto"
    };


    /*
        Make sure generated folder exists.
    */

    const outputDirectory =
        path.dirname(outputPath);


    if (
        !fs.existsSync(
            outputDirectory
        )
    ) {

        fs.mkdirSync(
            outputDirectory,
            {
                recursive: true
            }
        );
    }


    await workbook.xlsx.writeFile(
        outputPath
    );


    return {
        outputPath
    };
}


module.exports = {
    generateOtifExcel
};