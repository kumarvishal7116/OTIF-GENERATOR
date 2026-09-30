const path = require("path");

const {
    extractPdfText
} = require("./pdfService");

const {
    processImage
} = require("./imageService");


/**
 * Process an uploaded invoice file
 *
 * Supported:
 * - PDF
 * - JPG
 * - JPEG
 * - PNG
 */
async function processInvoiceFile(filePath) {
    if (!filePath) {
        throw new Error("File path is required.");
    }

    const extension = path
        .extname(filePath)
        .toLowerCase();


    // Handle PDF
    if (extension === ".pdf") {
        const result = await extractPdfText(filePath);

        return {
            fileType: "pdf",
            ...result
        };
    }


    // Handle image
    if (
        extension === ".jpg" ||
        extension === ".jpeg" ||
        extension === ".png"
    ) {
        const result = await processImage(filePath);

        return {
            fileType: "image",
            ...result
        };
    }


    // Reject unsupported files
    throw new Error(
        "Unsupported file type. Please upload a PDF, JPEG, or PNG file."
    );
}


module.exports = {
    processInvoiceFile
};