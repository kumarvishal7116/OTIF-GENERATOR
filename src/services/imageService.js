const fs = require("fs");
const path = require("path");
const sharp = require("sharp");


/**
 * Validate and inspect an invoice image.
 */
async function processImage(filePath) {
    // Check whether the file exists
    if (!fs.existsSync(filePath)) {
        throw new Error("Image file not found.");
    }

    // Check file extension
    const extension = path
        .extname(filePath)
        .toLowerCase();

    const supportedFormats = [
        ".jpg",
        ".jpeg",
        ".png"
    ];

    if (!supportedFormats.includes(extension)) {
        throw new Error(
            "Unsupported image format. Please upload a JPEG or PNG image."
        );
    }

    // Read image metadata
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
        throw new Error(
            "Unable to read image dimensions."
        );
    }

    return {
        filePath,
        format: metadata.format,
        width: metadata.width,
        height: metadata.height
    };
}


module.exports = {
    processImage
};