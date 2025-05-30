require("dotenv").config();
const express = require("express");
const http = require("http");
const helmet = require("helmet");
const cors = require("cors");
const { RateLimiterRedis } = require("rate-limiter-flexible");
const Redis = require("ioredis");
const { rateLimit } = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const routes = require("./routes/user-service");
const { errorHandler } = require("./middlewares/errorHandler");

const app = express();

//Connect to Database
const { connectDB } = require("./config/db.config");
const logger = require("./utils/logger");
connectDB();

const redisClient = new Redis(process.env.REDIS_URL);

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

//DDos Protection and Rate Limiting
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
});

app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({
        success: false,
        message: "Too many requests",
      });
    });
});

//IP based Rate Limiting for sensitive endpoints.
// Create a rate limiter for sensitive endpoints with these settings:
const sensitiveEndpointsLimiter = rateLimit({
  // Allow requests for 15 minutes (15 * 60 * 1000 milliseconds)
  windowMs: 15 * 60 * 1000,
  
  // Maximum 50 requests allowed in that time window
  max: 50,
  
  // Use modern HTTP headers for rate limit info
  standardHeaders: true,
  
  // Don't use old-style headers
  legacyHeaders: false,
  
  // What to do when someone hits the limit:
  handler: (req, res) => {
    // Log a warning message with the IP address
    logger.warn(`Sensitive Endpoint rate limit exceeded for the IP: ${req.ip}`);
    
    // Send back an error response
    res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  
  // Store the rate limit data in Redis
  store: new RedisStore({
    // Use Redis to track requests
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//Apply {sensitiveEndpointsLimiter} to the routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);

//Routes
app.use("/api/auth", routes);

//Error Handler
app.use(errorHandler);

const server = http.createServer(app);

server.listen(process.env.PORT, () => {
  logger.info(
    `User Service is running on the port ${process.env.PORT}`
  );
});

//Unhandled Promise Rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "Reason:", reason);
});
