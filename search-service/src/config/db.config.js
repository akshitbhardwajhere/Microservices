const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectToDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    logger.info(`MongoDB Connected`);
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectToDB };
