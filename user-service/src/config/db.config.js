const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB connected: ${process.env.MONGO_URI}`);
  } catch (error) {
    logger.error("Error connecting to Database", error);
  }
};

module.exports = { connectDB };
