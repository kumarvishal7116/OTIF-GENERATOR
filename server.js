const fs = require("fs");
const express = require("express");
const path = require("path");

const {
    upload
} = require("./src/middleware/uploadMiddleware");

const {
    extractInvoicesFromFiles
} = require("./src/services/extractionService");

const {
    calculateMonthlyRequirements
} = require("./src/services/monthlyEntryService");

const {
    generateSyntheticEntries
} = require("./src/services/geminiService");

const {
    calculateOtifData
} = require("./src/services/otifService");

const {
    generateOtifExcel
} = require("./src/services/excelService");


const app = express();

const PORT = 5000;


// Enable CORS for frontend requests
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});


/*
    Home route: serves index.html if present, else JSON status
*/
app.get("/", (req, res) => {
    const desktopIndex = path.resolve(__dirname, "..", "index.html");
    if (fs.existsSync(desktopIndex)) {
        return res.sendFile(desktopIndex);
    }

    res.json({
        message:
            "OTIF Generator API is running"
    });

});


/*
    Download generated Excel file
    Matches frontend link: /api/generated/:filename
*/
app.get("/api/generated/:filename", (req, res) => {

    const fileName = path.basename(req.params.filename);
    const filePath = path.join(__dirname, "generated", fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: "Generated report file not found."
        });
    }

    res.download(filePath, fileName);

});


/*
    Download alias: /api/download/:filename
*/
app.get("/api/download/:filename", (req, res) => {

    const fileName = path.basename(req.params.filename);
    const filePath = path.join(__dirname, "generated", fileName);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            error: "Generated report file not found."
        });
    }

    res.download(filePath, fileName);

});


/*
    Health check
*/
app.get("/api/health", (req, res) => {

    res.json({
        status: "OK",
        service: "OTIF Generator API"
    });

});


/*
    Upload invoice
    → Extract invoice data
    → Generate synthetic invoices
    → Calculate OTIF
    → Generate Excel
*/
app.post(
    "/api/upload-invoices",
    upload.array("files"),
    async (req, res) => {

        try {

            /*
                Check if no file was uploaded
            */

            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res.status(400).json({
                    error:
                        "No file chosen."
                });

            }


            /*
                Only one reference invoice
                is allowed
            */

            if (req.files.length > 1) {

                return res.status(400).json({
                    error:
                        "Please upload only one reference invoice."
                });

            }


            /*
                Extract reference invoice data
            */

            const extractionResults =
                await extractInvoicesFromFiles(
                    req.files
                );


            /*
                Parse optional additional information provided by user
            */
            let additionalInfo = {};
            const rawAdditionalInfo =
                req.body.additional_info ||
                req.body.additionalInfo;

            if (rawAdditionalInfo) {
                try {
                    additionalInfo =
                        typeof rawAdditionalInfo === "string"
                            ? JSON.parse(rawAdditionalInfo)
                            : rawAdditionalInfo;
                } catch (e) {
                    return res.status(400).json({
                        error: "Invalid JSON format for additional_info."
                    });
                }
            }

            // Direct form field support if provided individually
            if (req.body.company_name && !additionalInfo.company_name) {
                additionalInfo.company_name = req.body.company_name;
            }
            if (req.body.company_address && !additionalInfo.company_address) {
                additionalInfo.company_address = req.body.company_address;
            }
            if (req.body.party_names && !additionalInfo.party_names) {
                additionalInfo.party_names = Array.isArray(req.body.party_names)
                    ? req.body.party_names
                    : [req.body.party_names];
            }
            if (req.body.product_names && !additionalInfo.product_names) {
                additionalInfo.product_names = Array.isArray(req.body.product_names)
                    ? req.body.product_names
                    : [req.body.product_names];
            }

            const cleanCompanyName = (name) => {
                if (!name) return "";
                return name
                    .replace(/^(exporter|seller|supplier|vendor|consignor|manufacturer|from)\s*[:\-–]?\s*/i, "")
                    .trim();
            };

            const finalCompanyName = cleanCompanyName(
                additionalInfo.company_name?.trim() ||
                extractionResults.company_name
            );

            const finalCompanyAddress =
                additionalInfo.company_address?.trim() ||
                extractionResults.company_address ||
                "";

            // Extract party names from invoice
            const invoiceParties = [
                ...new Set(
                    extractionResults.invoice_records
                        .map((r) => r.party_name?.trim())
                        .filter(Boolean)
                )
            ];

            // User provided party names (if any)
            const extraParties = Array.isArray(additionalInfo.party_names)
                ? additionalInfo.party_names.map((p) => String(p).trim()).filter(Boolean)
                : (Array.isArray(additionalInfo.parties)
                    ? additionalInfo.parties.map((p) => String(p).trim()).filter(Boolean)
                    : []);

            const allowedParties = [
                ...new Set([...invoiceParties, ...extraParties])
            ];

            // Extract product names from invoice
            const invoiceProducts = [
                ...new Set(
                    extractionResults.invoice_records
                        .map((r) => r.product_name?.trim())
                        .filter(Boolean)
                )
            ];

            // User provided product names (if any)
            const extraProducts = Array.isArray(additionalInfo.product_names)
                ? additionalInfo.product_names.map((p) => String(p).trim()).filter(Boolean)
                : (Array.isArray(additionalInfo.products)
                    ? additionalInfo.products.map((p) => String(p).trim()).filter(Boolean)
                    : []);

            const allowedProducts = [
                ...new Set([...invoiceProducts, ...extraProducts])
            ];


            /*
                Backend calculates the
                required synthetic entries
            */

            const monthlyRequirements =
                calculateMonthlyRequirements(
                    extractionResults.invoice_records
                );


            /*
                Gemini generates exactly 16 synthetic invoices
                strictly constrained to allowed parties & products
            */

            const syntheticResult =
                await generateSyntheticEntries(
                    finalCompanyName,
                    extractionResults.invoice_records,
                    monthlyRequirements.syntheticRequirements,
                    allowedParties,
                    allowedProducts
                );


            /*
                Calculate OTIF values
                for the 16 synthetic entries
            */

            const otifData =
                calculateOtifData(
                    syntheticResult.synthetic_entries
                );


            /*
                Excel template path
            */

            const templatePath =
                path.join(
                    __dirname,
                    "templates",
                    "4 PARAMETER SARI.xlsx"
                );


            /*
                Create a unique output filename
            */

            const outputFileName =
                `OTIF_OUTPUT_${Date.now()}.xlsx`;


            /*
                Generated Excel output path
            */

            const outputPath =
                path.join(
                    __dirname,
                    "generated",
                    outputFileName
                );


            /*
                Generate Excel file with updated company name and address
            */

            const excelResult =
                await generateOtifExcel(
                    otifData.calculatedEntries,
                    templatePath,
                    outputPath,
                    finalCompanyName,
                    finalCompanyAddress
                );


            /*
                Send final response
            */

            res.json({

                message:
                    "Synthetic invoices generated, OTIF calculated, and Excel file created successfully.",

                company_name:
                    finalCompanyName,

                company_address:
                    finalCompanyAddress,

                allowed_parties:
                    allowedParties,

                allowed_products:
                    allowedProducts,

                synthetic_requirements:
                    monthlyRequirements.syntheticRequirements,

                synthetic_entries:
                    syntheticResult.synthetic_entries,

                calculated_entries:
                    otifData.calculatedEntries,

                monthly_averages:
                    otifData.monthlyAverages,

                excel_file:
                    excelResult.outputPath

            });

        } catch (error) {

            console.error(
                "Invoice processing error:",
                error
            );

            res.status(400).json({
                error:
                    error.message
            });

        }

    }
);


/*
    Start server
*/

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});