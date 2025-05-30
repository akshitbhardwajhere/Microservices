require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const Redis = require("ioredis");
const { connectDB } = require("./config/db.config");
const mediaRoutes = require("./routes/media.routes");
const logger = require("./utils/logger");
const { errorHandler } = require("./middlewares/errorHandler");
const { connectToRabbitMQ, consumeEvent } = require("./utils/rabbitMQ");
const { handlePostDelete } = require("./ehandlers/media.event.handlers");

const app = express();

//Database Connection
connectDB();

//Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//Routes
app.use("/api/media", mediaRoutes);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    
    //Consume all the events
    await consumeEvent('post.deleted', handlePostDelete);

    app.listen(process.env.PORT || 3003, () => {
      logger.info(
        `Media Service is running on the port ${process.env.PORT || 3003}`
      );
    });
  } catch (error) {
    logger.error(`Failed to connect to the server`, error);
    process.exit(1);
  }
}

startServer();
