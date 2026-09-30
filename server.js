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


/*
    Home route
*/
app.get("/", (req, res) => {

    res.json({
        message:
            "OTIF Generator API is running"
    });

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
                Backend calculates the
                required synthetic entries
            */

            const monthlyRequirements =
                calculateMonthlyRequirements(
                    extractionResults.invoice_records
                );


            /*
                Gemini generates exactly
                16 NEW synthetic invoices
            */

            const syntheticResult =
                await generateSyntheticEntries(
                    extractionResults.company_name,
                    extractionResults.invoice_records,
                    monthlyRequirements.syntheticRequirements
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
                Generate Excel file
            */

            const excelResult =
                await generateOtifExcel(
                    otifData.calculatedEntries,
                    templatePath,
                    outputPath
                );


            /*
                Send final response
            */

            res.json({

                message:
                    "Synthetic invoices generated, OTIF calculated, and Excel file created successfully.",

                company_name:
                    extractionResults.company_name,

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