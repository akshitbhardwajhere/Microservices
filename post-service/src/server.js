require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const Redis = require("ioredis");
const cors = require("cors");
const logger = require("./utils/logger");
const postRoutes = require("./routes/post.routes");
const { errorHandler } = require("./middlewares/errorHandler");
const { connectDB } = require("./config/db.config");
const { connectToRabbitMQ } = require("./utils/rabbitMQ");

const app = express();

//Database Connection
connectDB();

const redisClient = new Redis(process.env.REDIS_URL);

//Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//Routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    app.listen(process.env.PORT || 3002, () => {
      logger.info(`Post Service is running on port ${process.env.PORT || 3002}`);
    });
  } catch (error) {
    logger.error(`Failed to connect to the server`, error);
    process.exit(1);
  }
}

startServer();


