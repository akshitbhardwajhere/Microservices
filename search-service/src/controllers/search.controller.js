const Search = require("../models/Search");
const logger = require("../utils/logger");

const searchPost = async (req, res) => {
  logger.info(`Search endpoint hit...`);
  try {
    const { query } = req.query;

    const result = await Search.find(
      {
        $text: { $search: query },
      },
      {
        score: { $meta: "textScore" },
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(10);

    res.json(result);
  } catch (error) {
    logger.error(`Error searching post: ${error}`);
    res.status(500).json({
      success: false,
      message: "Error searching post",
    });
  }
};

module.exports = { searchPost };
