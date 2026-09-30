const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

        cb(null, uniqueName);
    }
});


const fileFilter = (req, file, cb) => {

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    const supportedFormats = [
        ".pdf",
        ".jpg",
        ".jpeg",
        ".png"
    ];

    if (!supportedFormats.includes(extension)) {

        return cb(
            new Error(
                "Unsupported file type. Please upload a PDF, JPEG, or PNG file."
            )
        );
    }

    cb(null, true);
};


const upload = multer({

    storage: storage,

    fileFilter: fileFilter,

    limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1
    }

});


module.exports = {
    upload
};