require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");

const logger = require("./utils/logger");
const { authenticateRequest } = require("./middlewares/auth.middleware");
const { errorHandler } = require("./middlewares/errorHandler");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitMQ");
const searchRoutes = require("./routes/search.routes");
const {
  handlePostCreated,
  handlePostDeleted,
} = require("./ehandlers/search.event.handler");
const { connectToDB } = require("./config/db.config");

const app = express();

// Initialize Redis client
const redisClient = new Redis(process.env.REDIS_URL);

// Middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body: ${req.body}`);
  next();
});

//Routes
app.use("/api/search", searchRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server
async function startServer() {
  try {
    connectToDB();
    await connectToRabbitMQ();

    //consume events
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeleted);

    app.listen(process.env.PORT || 3004, () => {
      logger.info(
        `Search service is running on port ${process.env.PORT || 3004}`
      );
    });
  } catch (error) {
    logger.error(error, "Failed to start search service");
    process.exit(1);
  }
}

startServer();
