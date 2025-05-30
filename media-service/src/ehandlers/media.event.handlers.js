const Media = require("../models/Media");
const { deleteMedia } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handlePostDelete = async (event) => {
  const { postId, mediaIDs } = event;
  try {
    const mediaToDelete = await Media.find({
      _id: { $in: mediaIDs },
    });

    for (const media of mediaToDelete) {
      await deleteMedia(media.publicId);
      await Media.findByIdAndDelete(media._id);

      logger.info(
        `Deleted Media ${media._id} associated with this deleted post ${postId}`
      );
    }
    
    logger.info(`Deletion completed for the post ${postId}`);

  } catch (error) {
    logger.error(`Error occured while deleting media: ${error}`);
  }
};

module.exports = { handlePostDelete };
