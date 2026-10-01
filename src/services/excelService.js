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


function getCompanyInitials(name) {
    if (!name) return "CO";
    const words = name
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .trim()
        .split(/\s+/);

    if (words.length >= 2) {
        return words
            .map((w) => w[0].toUpperCase())
            .slice(0, 5)
            .join("");
    }
    return name.slice(0, 5).toUpperCase();
}


function validateCalculatedEntries(calculatedEntries) {
    if (!Array.isArray(calculatedEntries)) {
        throw new Error("Calculated entries must be an array.");
    }

    if (calculatedEntries.length !== 16) {
        throw new Error(
            `Expected 16 calculated entries, but received ${calculatedEntries.length}.`
        );
    }

    for (const month of TARGET_MONTHS) {
        const entries = calculatedEntries.filter(
            (entry) => entry.delivery_month === month
        );

        if (entries.length !== 4) {
            throw new Error(
                `${month} must contain exactly 4 entries.`
            );
        }
    }
}


/**
 * Completely strip legacy shared-formula metadata from a worksheet.
 * This prevents ExcelJS from generating malformed shared formula XML,
 * which causes the Excel recovery / corruption warning on open.
 */
function cleanSharedFormulas(worksheet) {
    if (!worksheet) return;

    worksheet.eachRow((row) => {
        row.eachCell((cell) => {
            if (cell.model) {
                delete cell.model.sharedFormula;
                delete cell.model.shareType;
                delete cell.model.ref;
                delete cell.model.si;
                if (
                    Number.isNaN(cell.model.result) ||
                    cell.model.result === "NaN"
                ) {
                    delete cell.model.result;
                }
            }
        });
    });
}


/**
 * Write both source data (columns O:W) and explicit formulas (columns A:M).
 */
function writeRowData(worksheet, rowNumber, entry) {
    // 1. Raw source data in columns O:W
    worksheet.getCell(`O${rowNumber}`).value = convertToExcelDate(
        entry.delivery_month + "-01"
    );
    worksheet.getCell(`P${rowNumber}`).value = convertToExcelDate(
        entry.order_date
    );
    worksheet.getCell(`Q${rowNumber}`).value = entry.party_name;
    worksheet.getCell(`R${rowNumber}`).value = entry.product_name;
    worksheet.getCell(`S${rowNumber}`).value = entry.order_quantity;
    worksheet.getCell(`T${rowNumber}`).value = convertToExcelDate(
        entry.planned_delivery_date
    );
    worksheet.getCell(`U${rowNumber}`).value = entry.invoice_number;
    worksheet.getCell(`V${rowNumber}`).value = convertToExcelDate(
        entry.invoice_date
    );
    worksheet.getCell(`W${rowNumber}`).value = entry.invoice_quantity;

    // 2. Display and calculated formulas in columns A:M (clean, direct formulas)
    worksheet.getCell(`A${rowNumber}`).value = { formula: `O${rowNumber}` };
    worksheet.getCell(`B${rowNumber}`).value = { formula: `P${rowNumber}` };
    worksheet.getCell(`C${rowNumber}`).value = { formula: `Q${rowNumber}` };
    worksheet.getCell(`D${rowNumber}`).value = { formula: `R${rowNumber}` };
    worksheet.getCell(`E${rowNumber}`).value = { formula: `S${rowNumber}` };
    worksheet.getCell(`F${rowNumber}`).value = { formula: `T${rowNumber}` };
    worksheet.getCell(`G${rowNumber}`).value = { formula: `U${rowNumber}` };
    worksheet.getCell(`H${rowNumber}`).value = { formula: `V${rowNumber}` };
    worksheet.getCell(`I${rowNumber}`).value = { formula: `W${rowNumber}` };
    worksheet.getCell(`J${rowNumber}`).value = { formula: `F${rowNumber}-B${rowNumber}` };
    worksheet.getCell(`K${rowNumber}`).value = { formula: `H${rowNumber}-B${rowNumber}` };
    worksheet.getCell(`L${rowNumber}`).value = { formula: `J${rowNumber}/K${rowNumber}` };
    worksheet.getCell(`M${rowNumber}`).value = { formula: `I${rowNumber}/E${rowNumber}` };
}


function populateMonth(worksheet, month, entries) {
    const rowInfo = MONTH_ROW_MAP[month];

    if (!rowInfo) {
        throw new Error(`No Excel row mapping found for ${month}.`);
    }

    if (entries.length !== 4) {
        throw new Error(`${month} must contain exactly 4 entries.`);
    }

    for (let index = 0; index < entries.length; index++) {
        const rowNumber = rowInfo.dataRows[index];
        writeRowData(worksheet, rowNumber, entries[index]);
    }

    // Set standard formulas for monthly averages in rowInfo.averageRow
    const startRow = rowInfo.dataRows[0];
    const endRow = rowInfo.dataRows[rowInfo.dataRows.length - 1];
    worksheet.getCell(`L${rowInfo.averageRow}`).value = {
        formula: `AVERAGE(L${startRow}:L${endRow})`
    };
    worksheet.getCell(`M${rowInfo.averageRow}`).value = {
        formula: `AVERAGE(M${startRow}:M${endRow})`
    };
}


/**
 * Update the company name across all sheets:
 * - 28-MTD: cells A1, B1, A2, B2 (short name), C1:F1 (full name)
 * - 29,30 - OTIF: headers linking to 28-MTD
 * - 76-ZSC-OTIF: headers linking to 28-MTD
 */
function updateCompanyNameInWorkbook(workbook, companyName, companyAddress = "") {
    if (!companyName && !companyAddress) return;

    const shortName = companyName ? getCompanyInitials(companyName) : "";

    // 1. Update 28-MTD sheet
    const mtdSheet = workbook.getWorksheet("28-MTD");
    if (mtdSheet) {
        if (shortName) {
            mtdSheet.getCell("A1").value = shortName;
            mtdSheet.getCell("B1").value = shortName;
            mtdSheet.getCell("A2").value = shortName;
            mtdSheet.getCell("B2").value = shortName;
        }

        if (companyName) {
            mtdSheet.getCell("C1").value = companyName;
            mtdSheet.getCell("D1").value = companyName;
            mtdSheet.getCell("E1").value = companyName;
            mtdSheet.getCell("F1").value = companyName;
        }

        if (companyAddress) {
            mtdSheet.getCell("C2").value = companyAddress;
            mtdSheet.getCell("D2").value = companyAddress;
            mtdSheet.getCell("E2").value = companyAddress;
            mtdSheet.getCell("F2").value = companyAddress;
        }

        cleanSharedFormulas(mtdSheet);
    }

    // 2. Update 29,30 - OTIF header formulas and fix K3/K45
    const otifSheet = workbook.getWorksheet("29,30 - OTIF");
    if (otifSheet) {
        // Fix K3 and K45 formulas (removes unary + that caused NaN on string evaluation)
        otifSheet.getCell("K3").value = { formula: "'28-MTD'!G3" };
        otifSheet.getCell("K45").value = { formula: "K3" };

        otifSheet.getCell("A1").value = { formula: "'28-MTD'!A1" };
        otifSheet.getCell("C1").value = { formula: "'28-MTD'!C1" };
        otifSheet.getCell("C2").value = { formula: "'28-MTD'!C2" };
        otifSheet.getCell("A43").value = { formula: "A1" };
        otifSheet.getCell("C43").value = { formula: "C1" };
        otifSheet.getCell("C44").value = { formula: "C2" };

        // Ensure summary table (rows 4-6) has clean formulas
        otifSheet.getCell("B4").value = { formula: "A65" };
        otifSheet.getCell("C4").value = { formula: "A60" };
        otifSheet.getCell("D4").value = { formula: "A55" };
        otifSheet.getCell("E4").value = { formula: "A50" };

        otifSheet.getCell("B5").value = { formula: "L66" };
        otifSheet.getCell("C5").value = { formula: "L61" };
        otifSheet.getCell("D5").value = { formula: "L56" };
        otifSheet.getCell("E5").value = { formula: "L51" };

        otifSheet.getCell("B6").value = { formula: "M66" };
        otifSheet.getCell("C6").value = { formula: "M61" };
        otifSheet.getCell("D6").value = { formula: "M56" };
        otifSheet.getCell("E6").value = { formula: "M51" };
    }

    // 3. Update 76-ZSC-OTIF sheet if present
    const zscSheet = workbook.getWorksheet("76-ZSC-OTIF");
    if (zscSheet) {
        zscSheet.getCell("A2").value = { formula: "'28-MTD'!A1" };
        zscSheet.getCell("C2").value = { formula: "'28-MTD'!C2" };

        zscSheet.getCell("N3").value = { formula: "'28-MTD'!G3" };
        zscSheet.getCell("O3").value = { formula: "'28-MTD'!G3" };
        zscSheet.getCell("P3").value = { formula: "'28-MTD'!G3" };
        zscSheet.getCell("Q3").value = { formula: "'28-MTD'!G3" };

        // Prevent date format on customer name cells from producing NaN
        ["B6", "B7", "B8", "B9"].forEach((addr) => {
            const cell = zscSheet.getCell(addr);
            cell.numFmt = "@";
            cell.value = { formula: cell.formula };
        });

        cleanSharedFormulas(zscSheet);
    }
}


async function generateOtifExcel(
    calculatedEntries,
    templatePath,
    outputPath,
    companyName = "",
    companyAddress = ""
) {
    validateCalculatedEntries(calculatedEntries);

    if (!fs.existsSync(templatePath)) {
        throw new Error(
            `Excel template not found: ${templatePath}`
        );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(templatePath);

    const worksheet = workbook.getWorksheet("29,30 - OTIF");
    if (!worksheet) {
        throw new Error(
            'Worksheet "29,30 - OTIF" not found in the Excel template.'
        );
    }

    // First strip all shared formula metadata to eliminate corruption
    cleanSharedFormulas(worksheet);

    // Update company name and company address across sheets
    if (companyName || companyAddress) {
        updateCompanyNameInWorkbook(workbook, companyName, companyAddress);
    }

    // Populate each month with data and clean formulas
    for (const month of TARGET_MONTHS) {
        const monthEntries = calculatedEntries.filter(
            (entry) => entry.delivery_month === month
        );

        populateMonth(worksheet, month, monthEntries);
    }

    // Final sweep to remove any remaining shared formula tags across all worksheets
    workbook.worksheets.forEach((ws) => {
        cleanSharedFormulas(ws);
    });

    // Tell Excel to recalculate formulas when opened
    workbook.calculation = {
        fullCalcOnLoad: true,
        forceFullCalc: true,
        calcMode: "auto"
    };

    const outputDirectory = path.dirname(outputPath);
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdirSync(outputDirectory, { recursive: true });
    }

    await workbook.xlsx.writeFile(outputPath);

    return {
        outputPath
    };
}


module.exports = {
    generateOtifExcel
};