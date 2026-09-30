const path = require("path");

const {
    extractPdfText
} = require("./pdfService");

const {
    processImage
} = require("./imageService");

const {
    extractInvoiceFromText,
    extractInvoiceFromImage
} = require("./geminiService");

const {
    validateInvoiceData
} = require("./validationService");

const {
    addOrderDates
} = require("./orderDateService");

/**
 * Process one uploaded invoice file.
 *
 * Each file gets its own Gemini extraction call.
 */
async function extractInvoiceFromFile(file) {

    if (!file || !file.path) {

        throw new Error(
            "Invalid uploaded file."
        );

    }


    const extension = path
        .extname(file.originalname)
        .toLowerCase();


    /**
     * TEXT-BASED PDF
     */
    if (extension === ".pdf") {

        const pdfResult =
            await extractPdfText(file.path);


        const extractedData =
            await extractInvoiceFromText(
                pdfResult.text
            );


        return {
            fileName: file.originalname,
            fileType: "pdf",
            data: extractedData
        };
    }


    /**
     * IMAGE
     */
    if (
        extension === ".jpg" ||
        extension === ".jpeg" ||
        extension === ".png"
    ) {

        const imageResult =
            await processImage(file.path);


        const mimeType =
            imageResult.format === "png"
                ? "image/png"
                : "image/jpeg";


        const extractedData =
            await extractInvoiceFromImage(
                file.path,
                mimeType
            );


        return {
            fileName: file.originalname,
            fileType: "image",
            data: extractedData
        };
    }


    throw new Error(
        `Unsupported file type: ${file.originalname}`
    );
}


/**
 * Extract invoice data from multiple files.
 *
 * Each file is processed independently.
 */
async function extractInvoicesFromFiles(files) {

    if (!Array.isArray(files) || files.length === 0) {

        throw new Error(
            "No files available for extraction."
        );

    }


    const results = [];


    /**
     * Process each uploaded file separately.
     */
    for (const file of files) {

        const result =
            await extractInvoiceFromFile(file);


        /**
         * Validate Gemini's response
         * before accepting it.
         */
        const validatedData =
            validateInvoiceData(
                result.data
            );


        results.push({
            fileName: result.fileName,
            fileType: result.fileType,
            data: validatedData
        });

    }


    /**
     * Make sure all files belong
     * to the same company.
     */
    const companyNames =
        results.map(
            (result) =>
                result.data.company_name
                    .trim()
                    .toLowerCase()
        );


    const firstCompany =
        companyNames[0];


    const allSameCompany =
        companyNames.every(
            (company) =>
                company === firstCompany
        );


    if (!allSameCompany) {

        throw new Error(
            "All uploaded invoices must belong to the same company."
        );

    }


    /**
     * Use the original company name
     * from the first validated result.
     */
    const companyName =
        results[0].data.company_name;


    /**
     * Combine invoice records from
     * all uploaded files.
     */
    const combinedRecords =
    results.flatMap(
        (result) =>
            result.data.invoice_records
    );


const invoiceRecordsWithOrderDates =
    addOrderDates(combinedRecords);


return {
    company_name: companyName,
    invoice_records:
        invoiceRecordsWithOrderDates
};

}


module.exports = {
    extractInvoiceFromFile,
    extractInvoicesFromFiles
};