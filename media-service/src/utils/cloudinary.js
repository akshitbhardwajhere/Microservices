const cloudinary = require("cloudinary").v2;
const logger = require("../utils/logger");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadMedia = (file) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error(`Error uploading media to Cloud`, error);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

const deleteMedia = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.warn(
      `Media deleted successfully from the Cloud. Public ID: ${publicId}`
    );
    return result;
  } catch (error) {
    logger.error(`Error deleting media from the Cloud`, error);
    throw error;
  }
};

module.exports = { uploadMedia, deleteMedia };
