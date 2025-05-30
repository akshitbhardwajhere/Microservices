const logger = require("../utils/logger");
const Media = require("../models/Media");
const { uploadMedia } = require("../utils/cloudinary");

const uploadMediaToCloud = async (req, res) => {
  logger.warn("1. Uploading media to Cloud");
  try {
    console.log(req.file, "FILE");
    if (!req.file) {
      logger.error(`No file found. Please choose a file and try again later!`);
      return res.status(400).json({
        success: false,
        message: "No file found. Please choose a file and try again later!",
      });
    }

    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;

    logger.info(`2. File details => name: ${originalname}, type: ${mimetype}`);
    logger.warn(`3. Uploading to Cloudinary starting...`);

    const result = await uploadMedia(req.file);
    console.log(result, "RESULT");
    logger.warn(
      `Media uploaded to Cloud successfully! Public_Id: ${result.public_id}`
    );

    const newMedia = new Media({
      publicId: result.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: result.secure_url,
      userId: userId,
    });

    await newMedia.save();
    res.status(201).json({
      success: true,
      mediaId: newMedia._id,
      url: newMedia.url,
      message: "Media successfully uploaded to Cloud",
    });
  } catch (error) {
    logger.error(`Error uploading media to Cloudinary, MEDIA CONTROLLER`);
    res.status(500).json({
      success: false,
      message: "Error uploading Media",
    });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const result = await Media.find({});
    res.json({result});
    logger.warn(`Media got successfully!`);
  } catch (error) {
    logger.error(`Error getting media from Cloudinary, MEDIA CONTROLLER`);
    res.status(500).json({
      success: false,
      message: "Error fetching Media",
    });
  }
};

module.exports = { uploadMediaToCloud, getAllMedia };
