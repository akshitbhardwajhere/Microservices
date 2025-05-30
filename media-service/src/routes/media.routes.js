const express = require("express");
const multer = require("multer");

const { uploadMediaToCloud, getAllMedia } = require("../controllers/media.controller");
const { authenticateRequest } = require("../middlewares/auth.middleware");
const logger = require("../utils/logger");

const router = express.Router();

//Configure Multer for file upload
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    }
}).single('file');

router.post('/upload', authenticateRequest, (req, res, next) => {
    upload(req, res, function(error) {
        if(error instanceof multer.MulterError) {
            logger.error(`Multer error while uploading file:`, error);
            return res.status(400).json({
                success: false,
                message: 'Multer error while uploading file:',
                error: error.message,
                stack: error.stack
            })
        } else if(error) {
            logger.error(`Unknown error occured while uploading file:`, error);
            return res.status(500).json({
                success: false,
                message: 'Unknown error occured while uploading file:',
                error: error.message,
                stack: error.stack
            })
        }

        if(!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file chosen',
            })
        }

        next();
    })
}, uploadMediaToCloud);

router.get('/get', authenticateRequest, getAllMedia);



module.exports = router;
